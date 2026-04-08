import http from 'http'
import { WebSocketServer } from 'ws'
import type WebSocket from 'ws'
import type { ClientMessage } from '@shared/protocol.js'
import {
  createRoom,
  joinRoom,
  getRoom,
  getRoomBySeat,
  handleDisconnect,
  startGame,
  roomCount,
} from './roomManager.js'
import { lookupSession } from './sessionStore.js'

const PORT = Number(process.env.PORT ?? 3001)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const PING_INTERVAL_MS = 20_000

// Track liveness per socket
const alive = new WeakMap<WebSocket, boolean>()

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', rooms: roomCount() }))
    return
  }

  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server: httpServer })

// Heartbeat: ping every 20s, terminate clients that don't pong back
const pingInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (alive.get(ws) === false) {
      console.log('Terminating unresponsive client')
      ws.terminate()
      return
    }
    alive.set(ws, false)
    ws.ping()
  })
}, PING_INTERVAL_MS)

wss.on('close', () => clearInterval(pingInterval))

wss.on('connection', (ws, req) => {
  alive.set(ws, true)
  ws.on('pong', () => alive.set(ws, true))

  const origin = req.headers.origin ?? ''
  console.log(`WS connection from origin: "${origin}"`)

  // Permissive for game jam: allow any github.io subdomain and localhost
  const allowed =
    !origin ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('https://localhost') ||
    origin.includes('github.io') ||
    origin === CLIENT_ORIGIN
  if (!allowed) {
    console.log(`Rejected origin: ${origin}`)
    ws.close(4001, 'Forbidden')
    return
  }

  ws.on('message', (data) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(data.toString()) as ClientMessage
    } catch {
      return
    }
    handleMessage(ws, msg)
  })

  ws.on('close', () => {
    alive.delete(ws)
    handleDisconnect(ws)
  })

  ws.on('error', (err) => {
    console.error('WS error:', err.message)
  })
})

function sendError(ws: WebSocket, code: import('@shared/protocol.js').ErrorCode, message: string): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'ERROR', code, message }))
  }
}

function handleMessage(ws: WebSocket, msg: ClientMessage): void {
  switch (msg.type) {
    case 'CREATE_ROOM': {
      const result = createRoom(ws, msg.displayName, msg.maxPlayers)
      if ('error' in result) {
        sendError(ws, 'MAX_ROOMS_REACHED', result.error)
        return
      }
      ws.send(JSON.stringify({
        type: 'SESSION_ASSIGNED',
        sessionToken: result.token,
        seatIndex: result.seatIndex,
        roomCode: result.roomCode,
      }))
      const room = getRoom(result.roomCode)!
      room.broadcastState()
      break
    }

    case 'JOIN_ROOM': {
      // Handle rejoin via session token
      if (msg.sessionToken) {
        const entry = lookupSession(msg.sessionToken, msg.roomCode.toUpperCase())
        if (entry) {
          const room = getRoom(msg.roomCode)
          if (room) {
            room.handleReconnect(ws, msg.sessionToken)
            return
          }
        }
      }

      const result = joinRoom(ws, msg.displayName, msg.roomCode)
      if ('error' in result) {
        sendError(ws, result.code as import('@shared/protocol.js').ErrorCode, result.error)
        return
      }
      ws.send(JSON.stringify({
        type: 'SESSION_ASSIGNED',
        sessionToken: result.token,
        seatIndex: result.seatIndex,
        roomCode: msg.roomCode.toUpperCase(),
      }))
      const room = getRoom(msg.roomCode)!
      // broadcastState sends each player their personalised snapshot (includes updated seats)
      room.broadcastState()
      room.broadcastAll({
        type: 'PLAYER_JOINED',
        seatIndex: result.seatIndex,
        displayName: msg.displayName,
        seats: room.state.seats.map(s => ({
          seatIndex: s.seatIndex,
          displayName: s.displayName,
          stack: s.stack,
          currentBet: s.currentBet,
          totalBetThisHand: s.totalBetThisHand,
          folded: s.folded,
          allIn: s.allIn,
          isConnected: s.isConnected,
          hasDropped: s.hasDropped,
          cardCount: s.holeCards.length,
          lastAction: s.lastAction as (import('@shared/gameTypes.js').PlayerActionType | null),
        })),
      })
      break
    }

    case 'REJOIN': {
      const room = getRoom(msg.roomCode)
      if (!room) { sendError(ws, 'ROOM_NOT_FOUND', 'Room not found or expired'); return }
      const reconnected = room.handleReconnect(ws, msg.sessionToken)
      if (!reconnected) {
        ws.send(JSON.stringify({ type: 'REJOIN_REJECTED', reason: 'Session expired or not found' }))
      }
      break
    }

    case 'START_GAME': {
      const result = startGame(ws)
      if (result.error) {
        const room = getRoomBySeat(ws)
        if (room) {
          const code = result.error.includes('host') ? 'NOT_HOST' :
                       result.error.includes('players') ? 'NOT_ENOUGH_PLAYERS' : 'UNKNOWN'
          sendError(ws, code as import('@shared/protocol.js').ErrorCode, result.error)
        }
      }
      break
    }

    case 'ACTION': {
      const room = getRoomBySeat(ws)
      if (!room) return
      const seat = room.findSeatByWs(ws)
      if (!seat) return
      if (!['fold','check','call','raise','all-in'].includes(msg.action)) {
        sendError(ws, 'INVALID_ACTION', 'Unknown action')
        return
      }
      room.processAction(seat.seatIndex, { type: msg.action, amount: msg.amount })
      break
    }

    case 'DROP_CARD': {
      const room = getRoomBySeat(ws)
      if (!room) return
      const seat = room.findSeatByWs(ws)
      if (!seat) return
      if (!['drop_1','drop_2','drop_3'].includes(room.state.phase)) {
        sendError(ws, 'INVALID_PHASE', 'Not in drop phase')
        return
      }
      if (seat.hasDropped) {
        sendError(ws, 'INVALID_ACTION', 'Already dropped')
        return
      }
      if (![0,1,2].includes(msg.cardIndex)) {
        sendError(ws, 'INVALID_AMOUNT', 'Invalid card index')
        return
      }
      room.processDrop(seat.seatIndex, msg.cardIndex)
      break
    }

    default:
      break
  }
}

httpServer.listen(PORT, () => {
  console.log(`The Drop server running on port ${PORT}`)
  console.log(`Client origin: ${CLIENT_ORIGIN}`)
})
