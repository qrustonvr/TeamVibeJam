import type { Card } from '@shared/gameTypes'
import { CardView } from './CardView'
import { TimerBar } from './TimerBar'
import { DROP_TIMER_MS } from '@shared/constants'

// Hint text shown under each card during drop selection
function cardBrewHint(card: Card): string {
  const r = card.rankIndex
  if (r <= 4) return 'Low (2–6)'
  if (r >= 9) return 'Face card'
  return 'Mid'
}

interface DropSelectProps {
  cards: Card[]
  hasDropped: boolean
  dropsReceived: number
  totalDroppers: number
  deadline: number | null
  onDrop: (cardIndex: number) => void
}

export function DropSelect({ cards, hasDropped, dropsReceived, totalDroppers, deadline, onDrop }: DropSelectProps) {
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
        ✦ THE DROP ✦
      </div>

      {!hasDropped ? (
        <>
          <div style={{
            fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)', fontSize: 13,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            Choose a card to send to The Brew
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {cards.map((card, i) => (
              <div
                key={i}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.querySelector('.card-wrap') as HTMLElement | null)?.style && ((e.currentTarget.querySelector('.card-wrap') as HTMLElement).style.transform = 'translateY(-12px)')}
                onMouseLeave={e => (e.currentTarget.querySelector('.card-wrap') as HTMLElement | null)?.style && ((e.currentTarget.querySelector('.card-wrap') as HTMLElement).style.transform = 'translateY(0)')}
              >
                <div className="card-wrap" style={{ transition: 'transform 0.2s' }}>
                  <CardView card={card} onClick={() => onDrop(i)} selected={false} />
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 9,
                  color: 'rgba(255,255,255,0.3)', letterSpacing: 1,
                  textTransform: 'uppercase',
                }}>
                  {cardBrewHint(card)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ width: 200 }}>
            <TimerBar deadline={deadline} totalMs={DROP_TIMER_MS} />
          </div>
        </>
      ) : (
        <div style={{ fontFamily: 'var(--font-body)', color: '#22c55e', fontSize: 14 }}>
          ✓ Card dropped — waiting for others
        </div>
      )}

      <div style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        {dropsReceived}/{totalDroppers} players have dropped
      </div>
    </div>
  )
}
