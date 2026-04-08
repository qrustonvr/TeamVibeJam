import type WebSocket from 'ws'
import { Room } from './room.js'
import { ROOM_IDLE_CLEANUP_MS, MAX_ROOMS, MIN_PLAYERS } from '@shared/constants.js'
import { removeSessionsForRoom } from './sessionStore.js'

const rooms = new Map<string, Room>()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function uniqueCode(): string {
  let code = generateCode()
  let attempts = 0
  while (rooms.has(code) && attempts < 100) {
    code = generateCode()
    attempts++
  }
  return code
}

export function createRoom(ws: WebSocket, displayName: string, maxPlayers: number): { roomCode: string; token: string; seatIndex: number } | { error: string } {
  if (rooms.size >= MAX_ROOMS) {
    return { error: 'Server is at capacity — try again later' }
  }
  const code = uniqueCode()
  const room = new Room(code, maxPlayers, 0)
  const { token } = room.addPlayer(ws, displayName)
  rooms.set(code, room)
  scheduleIdleCleanup(code)
  return { roomCode: code, token, seatIndex: 0 }
}

export function joinRoom(ws: WebSocket, displayName: string, roomCode: string): { token: string; seatIndex: number } | { error: string; code: string } {
  const room = rooms.get(roomCode.toUpperCase())
  if (!room) return { error: 'Room not found', code: 'ROOM_NOT_FOUND' }
  if (room.isFull) return { error: 'Room is full', code: 'ROOM_FULL' }
  if (room.isPlaying) return { error: 'Game already in progress', code: 'GAME_ALREADY_STARTED' }
  const { seat, token } = room.addPlayer(ws, displayName)
  return { token, seatIndex: seat.seatIndex }
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode.toUpperCase())
}

export function getRoomBySeat(ws: WebSocket): Room | undefined {
  for (const room of rooms.values()) {
    if (room.findSeatByWs(ws)) return room
  }
  return undefined
}

export function handleDisconnect(ws: WebSocket): void {
  const room = getRoomBySeat(ws)
  if (room) {
    room.handleDisconnect(ws)
    if (room.isEmpty && !room.isPlaying) {
      cleanupRoom(room.state.code)
    }
  }
}

function cleanupRoom(code: string): void {
  rooms.delete(code)
  removeSessionsForRoom(code)
}

function scheduleIdleCleanup(code: string): void {
  setTimeout(() => {
    const room = rooms.get(code)
    if (!room) return
    const idleMs = Date.now() - room.state.lastActivityAt
    if (idleMs >= ROOM_IDLE_CLEANUP_MS) {
      cleanupRoom(code)
    } else {
      scheduleIdleCleanup(code)
    }
  }, ROOM_IDLE_CLEANUP_MS)
}

export function startGame(ws: WebSocket): { error?: string } {
  const room = getRoomBySeat(ws)
  if (!room) return { error: 'Room not found' }
  const seat = room.findSeatByWs(ws)
  if (!seat || seat.seatIndex !== room.state.hostSeatIndex) return { error: 'Only the host can start the game' }
  if (room.state.seats.length < MIN_PLAYERS) return { error: `Need at least ${MIN_PLAYERS} players` }
  if (room.isPlaying) return { error: 'Game already started' }
  room.startGame()
  return {}
}

export function roomCount(): number {
  return rooms.size
}
