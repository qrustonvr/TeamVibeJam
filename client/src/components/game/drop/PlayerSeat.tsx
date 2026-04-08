import type { PublicSeat } from '@shared/gameTypes'
import { CardView } from './CardView'

interface PlayerSeatProps {
  seat: PublicSeat
  isActive: boolean
  isYou: boolean
}

const ACTION_COLORS: Record<string, string> = {
  fold: '#ef4444',
  check: '#6b7280',
  call: '#22c55e',
  raise: 'var(--gold)',
  'all-in': '#a855f7',
}

export function PlayerSeat({ seat, isActive, isYou }: PlayerSeatProps) {
  const dimmed = seat.folded || !seat.isConnected

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      opacity: dimmed ? 0.4 : 1,
      transition: 'opacity 0.3s',
      minWidth: 80,
    }}>
      {/* Name + status */}
      <div style={{
        padding: '3px 8px',
        borderRadius: 4,
        background: isActive ? 'rgba(212,175,55,0.2)' : 'rgba(0,0,0,0.3)',
        border: isActive ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        color: isYou ? 'var(--gold)' : '#e5e7eb',
        whiteSpace: 'nowrap',
        transition: 'all 0.3s',
        boxShadow: isActive ? '0 0 12px rgba(212,175,55,0.3)' : 'none',
      }}>
        {isYou ? '⭐ You' : seat.displayName}
        {!seat.isConnected && <span style={{ color: '#ef4444', marginLeft: 4 }}>●</span>}
        {seat.isConnected && isActive && <span style={{ marginLeft: 4, animation: 'pulse-slow 1s infinite' }}>●</span>}
      </div>

      {/* Cards (face down for others) */}
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: seat.cardCount }).map((_, i) => (
          <CardView key={i} card={null} faceDown small />
        ))}
      </div>

      {/* Stack */}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--gold-dim)' }}>
        ◆ {seat.stack}
      </div>

      {/* Current bet */}
      {seat.currentBet > 0 && (
        <div style={{
          fontSize: 10, color: '#a3e635',
          fontFamily: 'var(--font-body)',
        }}>
          Bet: {seat.currentBet}
        </div>
      )}

      {/* Last action badge */}
      {seat.lastAction && (
        <div style={{
          padding: '1px 6px',
          borderRadius: 3,
          background: ACTION_COLORS[seat.lastAction] ?? 'rgba(255,255,255,0.2)',
          fontSize: 9,
          fontFamily: 'var(--font-body)',
          color: '#000',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {seat.lastAction}
        </div>
      )}
    </div>
  )
}
