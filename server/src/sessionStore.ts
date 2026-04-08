interface SessionEntry {
  seatIndex: number
  roomCode: string
  expiresAt: number
}

const sessions = new Map<string, SessionEntry>()

export function assignSession(token: string, seatIndex: number, roomCode: string): void {
  sessions.set(token, { seatIndex, roomCode, expiresAt: 0 })
}

export function lookupSession(token: string, roomCode: string): SessionEntry | null {
  const entry = sessions.get(token)
  if (!entry) return null
  if (entry.roomCode !== roomCode) return null
  if (entry.expiresAt !== 0 && Date.now() > entry.expiresAt) {
    sessions.delete(token)
    return null
  }
  return entry
}

export function scheduleExpiry(token: string, ms: number): void {
  const entry = sessions.get(token)
  if (entry) entry.expiresAt = Date.now() + ms
}

export function cancelExpiry(token: string): void {
  const entry = sessions.get(token)
  if (entry) entry.expiresAt = 0
}

export function removeSession(token: string): void {
  sessions.delete(token)
}

export function removeSessionsForRoom(roomCode: string): void {
  for (const [token, entry] of sessions) {
    if (entry.roomCode === roomCode) sessions.delete(token)
  }
}
