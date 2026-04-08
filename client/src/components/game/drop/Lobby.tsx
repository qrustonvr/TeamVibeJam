import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type LobbyMode = 'select' | 'solo' | 'create' | 'join'

interface LobbyProps {
  onStartSolo: (aiCount: number) => void
  onCreateRoom: (displayName: string, maxPlayers: number) => void
  onJoinRoom: (roomCode: string, displayName: string) => void
  isConnecting?: boolean
  error?: string | null
}

export function Lobby({ onStartSolo, onCreateRoom, onJoinRoom, isConnecting = false, error }: LobbyProps) {
  const [mode, setMode] = useState<LobbyMode>('select')
  const [aiCount, setAiCount] = useState(2)
  const [displayName, setDisplayName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [roomCode, setRoomCode] = useState('')

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, fontSize: 14,
    fontFamily: 'var(--font-body)',
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,175,55,0.4)',
    color: '#e5e7eb', width: '100%', boxSizing: 'border-box',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 20, padding: 32, maxWidth: 360, margin: '0 auto',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold)',
        fontSize: 32,
        letterSpacing: 4,
        textShadow: '0 0 30px var(--gold)',
        animation: 'glow 2.5s ease-in-out infinite',
        textAlign: 'center',
      }}>
        THE DROP
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)',
        fontSize: 12, letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase',
      }}>
        A Poker Variant
      </div>

      {error && (
        <div style={{
          padding: '8px 16px', borderRadius: 6,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)',
          color: '#fca5a5', fontFamily: 'var(--font-body)', fontSize: 12,
          width: '100%', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {mode === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <Button variant="primary" fullWidth onClick={() => setMode('solo')}>
            SOLO TABLE
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setMode('create')}>
            CREATE TABLE
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setMode('join')}>
            JOIN TABLE
          </Button>
        </div>
      )}

      {mode === 'solo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <div style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            AI opponents
          </div>
          <select
            value={aiCount}
            onChange={e => setAiCount(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={1}>1 AI (Heads Up)</option>
            <option value={2}>2 AI</option>
            <option value={3}>3 AI</option>
            <option value={4}>4 AI</option>
          </select>
          <Button variant="primary" fullWidth onClick={() => onStartSolo(aiCount)}>
            Deal Cards
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setMode('select')}>Back</Button>
        </div>
      )}

      {mode === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <input
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={inputStyle}
            maxLength={16}
          />
          <select
            value={maxPlayers}
            onChange={e => setMaxPlayers(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={2}>2 Players</option>
            <option value={3}>3 Players</option>
            <option value={4}>4 Players</option>
            <option value={5}>5 Players</option>
            <option value={6}>6 Players</option>
          </select>
          <Button
            variant="primary" fullWidth
            disabled={!displayName.trim() || isConnecting}
            onClick={() => onCreateRoom(displayName.trim(), maxPlayers)}
          >
            {isConnecting ? 'Connecting…' : 'Create Room'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setMode('select')}>Back</Button>
        </div>
      )}

      {mode === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <input
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={inputStyle}
            maxLength={16}
          />
          <input
            placeholder="Room code (e.g. AB12)"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            style={inputStyle}
            maxLength={4}
          />
          <Button
            variant="primary" fullWidth
            disabled={!displayName.trim() || roomCode.length !== 4 || isConnecting}
            onClick={() => onJoinRoom(roomCode, displayName.trim())}
          >
            {isConnecting ? 'Connecting…' : 'Join Room'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setMode('select')}>Back</Button>
        </div>
      )}
    </div>
  )
}
