import type { Card } from '@shared/gameTypes'
import { CardView } from './CardView'
import { TimerBar } from './TimerBar'
import { DROP_TIMER_MS } from '@shared/constants'

interface DropSelectProps {
  cards: Card[]
  hasDropped: boolean
  dropsReceived: number
  totalDroppers: number
  deadline: number | null
  dropPhase: 1 | 2
  onDrop: (cardIndex: number) => void
}

export function DropSelect({ cards, hasDropped, dropsReceived, totalDroppers, deadline, dropPhase, onDrop }: DropSelectProps) {
  const label = dropPhase === 1 ? '✦ THE DROP — TURN ✦' : '✦ THE DROP — RIVER ✦'
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      borderRadius: 12,
      gap: 16,
      zIndex: 10,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold)',
        fontSize: 22,
        letterSpacing: 3,
        textShadow: '0 0 20px var(--gold)',
        animation: 'glow 2.5s ease-in-out infinite',
      }}>
        {label}
      </div>

      {!hasDropped ? (
        <>
          <div style={{
            fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)', fontSize: 13,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            Choose a card to send to the drop zone
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {cards.map((card, i) => (
              <div key={i} style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-12px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <CardView card={card} onClick={() => onDrop(i)} selected={false} />
              </div>
            ))}
          </div>
          <div style={{ width: 200 }}>
            <TimerBar deadline={deadline} totalMs={DROP_TIMER_MS} />
          </div>
        </>
      ) : (
        <div style={{
          fontFamily: 'var(--font-body)', color: '#22c55e', fontSize: 14,
        }}>
          ✓ Card dropped
        </div>
      )}

      <div style={{
        fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 12,
      }}>
        {dropsReceived}/{totalDroppers} players have dropped
      </div>
    </div>
  )
}
