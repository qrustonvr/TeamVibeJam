import { useState, useEffect, useCallback, useRef } from 'react'
import type { ServerMessage, ClientMessage } from '@shared/protocol'
import type { RoomSnapshot, HandWinner, ShowdownPlayerInfo, BrewModifier } from '@shared/gameTypes'

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3001'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface MultiplayerState {
  gameState: RoomSnapshot | null
  connectionStatus: ConnectionStatus
  roomCode: string | null
  seatIndex: number | null
  sessionToken: string | null
  error: string | null
  log: string[]
  handWinners: HandWinner[] | null
  showdownPlayers: ShowdownPlayerInfo[] | null
  omens: BrewModifier[]
  myOmenMappings: BrewModifier[]
  chatBubbles: Record<number, string>
}

export interface SocketActions {
  createRoom: (displayName: string, maxPlayers: number) => void
  joinRoom: (roomCode: string, displayName: string) => void
  startGame: () => void
  sendAction: (action: string, amount?: number) => void
  dropCard: (cardIndex: 0 | 1 | 2) => void
  sendChat: (message: string) => void
  clearError: () => void
  disconnect: () => void
}

function getStoredSession(roomCode: string): string | null {
  try {
    return localStorage.getItem(`the-drop:session:${roomCode}`)
  } catch {
    return null
  }
}

function storeSession(roomCode: string, token: string): void {
  try {
    localStorage.setItem(`the-drop:session:${roomCode}`, token)
  } catch {
    // ignore
  }
}

export function useSocket(): [MultiplayerState, SocketActions] {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const pendingJoinRef = useRef<{ type: 'create'; displayName: string; maxPlayers: number } | { type: 'join'; roomCode: string; displayName: string } | null>(null)
  const mpStateRef = useRef<MultiplayerState>({
    gameState: null, connectionStatus: 'disconnected',
    roomCode: null, seatIndex: null, sessionToken: null, error: null, log: [],
    handWinners: null, showdownPlayers: null, omens: [], myOmenMappings: [],
    chatBubbles: {},
  })

  const [mpState, setMpState] = useState<MultiplayerState>({
    gameState: null,
    connectionStatus: 'disconnected',
    roomCode: null,
    seatIndex: null,
    sessionToken: null,
    error: null,
    log: [],
    handWinners: null,
    showdownPlayers: null,
    omens: [],
    myOmenMappings: [],
    chatBubbles: {},
  })

  // Keep ref in sync for use inside closures
  mpStateRef.current = mpState

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }, [])

  const appendLog = useCallback((message: string) => {
    setMpState(s => ({ ...s, log: [...s.log.slice(-49), message] }))
  }, [])

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'SESSION_ASSIGNED':
        storeSession(msg.roomCode, msg.sessionToken)
        setMpState(s => ({
          ...s,
          sessionToken: msg.sessionToken,
          seatIndex: msg.seatIndex,
          roomCode: msg.roomCode,
        }))
        break

      case 'ROOM_STATE':
        setMpState(s => ({ ...s, gameState: msg.state }))
        break

      case 'REJOIN_ACK':
        setMpState(s => ({ ...s, gameState: msg.state }))
        break

      case 'REJOIN_REJECTED':
        setMpState(s => ({ ...s, error: msg.reason, sessionToken: null }))
        break

      case 'PLAYER_JOINED':
        appendLog(`${msg.displayName} joined the table`)
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, seats: msg.seats },
        } : s)
        break

      case 'PLAYER_AWAY':
        appendLog(`${msg.displayName} disconnected`)
        setMpState(s => s.gameState ? {
          ...s,
          gameState: {
            ...s.gameState,
            seats: s.gameState.seats.map(seat =>
              seat.seatIndex === msg.seatIndex ? { ...seat, isConnected: false } : seat
            ),
          },
        } : s)
        break

      case 'PLAYER_LEFT':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, seats: msg.seats },
        } : s)
        break

      case 'PHASE_CHANGE':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, phase: msg.phase },
          // Reset hand-scoped data when a new hand begins
          ...(msg.phase === 'deal' ? {
            handWinners: null, showdownPlayers: null,
            omens: [], myOmenMappings: [],
          } : {}),
        } : s)
        break

      case 'OMENS_REVEALED':
        setMpState(s => ({ ...s, omens: msg.omens }))
        break

      case 'OMEN_MAPPINGS':
        setMpState(s => ({ ...s, myOmenMappings: msg.mappings }))
        break

      case 'HOLE_CARDS':
        // Server only sends HOLE_CARDS to this specific player, so always apply it
        setMpState(s => ({ ...s, gameState: s.gameState ? { ...s.gameState, yourCards: msg.cards } : s.gameState }))
        break

      case 'COMMUNITY_CARDS':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, communityCards: msg.cards },
        } : s)
        break

      case 'DROP_REVEALED':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, dropZone: msg.dropZone },
        } : s)
        appendLog(`Drop zone revealed!`)
        break

      case 'BREW_REVEAL':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, dropZone: msg.dropZone, activeBrew: msg.brew },
        } : s)
        appendLog(`${msg.brew.icon} ${msg.brew.name} — ${msg.brew.description}`)
        break

      case 'CARD_EXPOSED':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: {
            ...s.gameState,
            seats: s.gameState.seats.map(seat =>
              seat.seatIndex === msg.seatIndex ? { ...seat, exposedCard: msg.card } : seat
            ),
          },
        } : s)
        break

      case 'DROP_ACK':
        appendLog(`${msg.dropsReceived}/${msg.totalNeeded} players have dropped`)
        setMpState(s => s.gameState ? {
          ...s,
          gameState: {
            ...s.gameState,
            seats: s.gameState.seats.map(seat =>
              seat.seatIndex === msg.seatIndex ? { ...seat, hasDropped: true, cardCount: 2 } : seat
            ),
          },
        } : s)
        break

      case 'TURN_START':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: {
            ...s.gameState,
            activeSeatIndex: msg.seatIndex,
            actionDeadline: msg.deadline,
            pot: msg.pot,
            currentBetLevel: msg.toCall + (s.gameState.seats.find(seat => seat.seatIndex === msg.seatIndex)?.currentBet ?? 0),
          },
        } : s)
        break

      case 'ACTION_ACK':
        appendLog(
          `${msg.action.toUpperCase()}${msg.amount > 0 ? ` ${msg.amount}` : ''} • Pot: ${msg.pot}`
        )
        setMpState(s => s.gameState ? {
          ...s,
          gameState: {
            ...s.gameState,
            pot: msg.pot,
            currentBetLevel: msg.currentBetLevel,
            seats: s.gameState.seats.map(seat =>
              seat.seatIndex === msg.seatIndex
                ? { ...seat, stack: msg.stack, lastAction: msg.action as import('@shared/gameTypes').PlayerActionType }
                : seat
            ),
          },
        } : s)
        break

      case 'HAND_RESULT':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, seats: msg.allSeats },
          handWinners: msg.winners,
          showdownPlayers: msg.showdownPlayers ?? null,
        } : s)
        msg.winners.forEach(w => {
          appendLog(`${msg.allSeats.find(s => s.seatIndex === w.seatIndex)?.displayName} wins ${w.potWon} with ${w.handName}`)
        })
        break

      case 'STACKS_UPDATE':
        setMpState(s => s.gameState ? {
          ...s,
          gameState: { ...s.gameState, seats: msg.seats },
        } : s)
        break

      case 'HOLE_CARDS_REVEAL':
        // Update community info — actual cards shown in showdown view
        break

      case 'ERROR':
        setMpState(s => ({ ...s, error: msg.message }))
        break

      case 'GAME_LOG':
        appendLog(msg.message)
        break

      case 'CHAT': {
        const { seatIndex, displayName, message } = msg
        // Show bubble, auto-clear after 5s
        if (chatTimersRef.current[seatIndex]) clearTimeout(chatTimersRef.current[seatIndex])
        setMpState(s => ({ ...s, chatBubbles: { ...s.chatBubbles, [seatIndex]: message } }))
        chatTimersRef.current[seatIndex] = setTimeout(() => {
          setMpState(s => {
            const next = { ...s.chatBubbles }
            delete next[seatIndex]
            return { ...s, chatBubbles: next }
          })
        }, 5000)
        appendLog(`${displayName}: ${message}`)
        break
      }

      case 'GAME_STARTING':
        appendLog(`Game starting in ${msg.countdown}...`)
        break

      default:
        break
    }
  }, [appendLog])

  const connect = useCallback((onOpen: () => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      onOpen()
      return
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    setMpState(s => ({ ...s, connectionStatus: 'connecting' }))

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0
      setMpState(s => ({ ...s, connectionStatus: 'connected', error: null }))
      onOpen()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage
        handleMessage(msg)
      } catch {
        // ignore malformed
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      const attempts = reconnectAttemptsRef.current
      if (attempts < 5) {
        const backoff = Math.min(1000 * Math.pow(2, attempts), 15000)
        reconnectAttemptsRef.current++
        setMpState(s => ({ ...s, connectionStatus: 'reconnecting' }))
        reconnectTimerRef.current = setTimeout(() => {
          const s = mpStateRef.current
          connect(() => {
            if (s.roomCode && s.sessionToken) {
              wsRef.current?.send(JSON.stringify({ type: 'REJOIN', roomCode: s.roomCode, sessionToken: s.sessionToken }))
            }
          })
        }, backoff)
      } else {
        setMpState(s => ({ ...s, connectionStatus: 'disconnected' }))
      }
    }

    ws.onerror = () => {
      setMpState(s => ({ ...s, error: 'Connection error' }))
    }
  }, [handleMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [])

  // ─── Public actions ───────────────────────────────────────────────────────

  const createRoom = useCallback((displayName: string, maxPlayers: number) => {
    pendingJoinRef.current = { type: 'create', displayName, maxPlayers }
    connect(() => {
      const pending = pendingJoinRef.current
      if (pending?.type === 'create') {
        send({ type: 'CREATE_ROOM', displayName: pending.displayName, maxPlayers: pending.maxPlayers })
      }
    })
  }, [connect, send])

  const joinRoom = useCallback((roomCode: string, displayName: string) => {
    const existingToken = getStoredSession(roomCode)
    pendingJoinRef.current = { type: 'join', roomCode, displayName }
    connect(() => {
      if (existingToken) {
        send({ type: 'REJOIN', roomCode, sessionToken: existingToken })
      } else {
        send({ type: 'JOIN_ROOM', roomCode, displayName })
      }
    })
  }, [connect, send])

  const startGame = useCallback(() => send({ type: 'START_GAME' }), [send])

  const sendAction = useCallback((action: string, amount?: number) => {
    send({
      type: 'ACTION',
      action: action as 'fold' | 'check' | 'call' | 'raise' | 'all-in',
      amount,
    })
  }, [send])

  const dropCard = useCallback((cardIndex: 0 | 1 | 2) => {
    send({ type: 'DROP_CARD', cardIndex })
  }, [send])

  const clearError = useCallback(() => {
    setMpState(s => ({ ...s, error: null }))
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    wsRef.current?.close()
    wsRef.current = null
    setMpState({
      gameState: null, connectionStatus: 'disconnected',
      roomCode: null, seatIndex: null, sessionToken: null,
      error: null, log: [],
      handWinners: null, showdownPlayers: null, omens: [], myOmenMappings: [],
    })
  }, [])

  return [
    mpState,
    { createRoom, joinRoom, startGame, sendAction, dropCard, clearError, disconnect },
  ]
}
