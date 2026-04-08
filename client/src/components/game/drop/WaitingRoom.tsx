import type { PublicSeat } from '@shared/gameTypes'
import { Button } from '@/components/ui/Button'

interface WaitingRoomProps {
  roomCode: string
  seats: PublicSeat[]
  isHost: boolean
  onStartGame: () => void
  onLeave: () => void
}

export function WaitingRoom({ roomCode, seats, isHost, onStartGame, onLeave }: WaitingRoomProps) {
  const canStart = seats.length >= 2

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {})
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 24, padding: 32,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', color: 'var(--gold)',
        fontSize: 14, letterSpacing: 3, textTransform: 'uppercase',
      }}>
        Waiting Room
      </div>

      {/* Room code */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '16px 32px',
        border: '1px solid var(--gold)',
        borderRadius: 8,
        background: 'rgba(212,175,55,0.08)',
      }}>
        <div style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          ROOM CODE
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', color: 'var(--gold)',
          fontSize: 48, letterSpacing: 12, fontWeight: 700,
          textShadow: '0 0 20px var(--gold-dim)',
        }}>
          {roomCode}
        </div>
        <button
          onClick={copyCode}
          style={{
            padding: '4px 16px', borderRadius: 4, fontSize: 11,
            fontFamily: 'var(--font-body)',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          }}
        >
          Copy Code
        </button>
        <div style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
          Share this code with friends
        </div>
      </div>

      {/* Players */}
      <div style={{
        width: '100%', maxWidth: 300,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{
          fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)',
          fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
        }}>
          Players ({seats.length})
        </div>
        {seats.map(seat => (
          <div key={seat.seatIndex} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: seat.isConnected ? '#22c55e' : '#ef4444',
            }} />
            <span style={{ fontFamily: 'var(--font-body)', color: '#e5e7eb', fontSize: 14 }}>
              {seat.displayName}
            </span>
            {seat.seatIndex === 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gold-dim)' }}>HOST</span>
            )}
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', color: 'var(--gold-dim)', fontSize: 12 }}>
              ◆ {seat.stack}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {isHost ? (
          <Button
            variant="primary"
            disabled={!canStart}
            onClick={onStartGame}
          >
            {canStart ? 'Start Game' : `Need ${2 - seats.length} more player${seats.length === 1 ? '' : 's'}`}
          </Button>
        ) : (
          <div style={{
            fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)',
            fontSize: 13, fontStyle: 'italic',
          }}>
            Waiting for host to start…
          </div>
        )}
        <Button variant="ghost" onClick={onLeave}>Leave</Button>
      </div>
    </div>
  )
}
