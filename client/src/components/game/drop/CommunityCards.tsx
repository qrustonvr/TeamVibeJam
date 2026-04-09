import type { Card } from '@shared/gameTypes'
import { CardView } from './CardView'

interface CommunityCardsProps {
  communityCards: Card[]
  dropZone: Card[]
  pot: number
  turnIsHidden?: boolean
}

export function CommunityCards({ communityCards, dropZone, pot, turnIsHidden = false }: CommunityCardsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Community cards */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2,3,4].map(i => {
          // BLACKOUT: turn card (index 3) shown face-down
          const isHiddenTurn = turnIsHidden && i === 3 && communityCards.length >= 4
          if (isHiddenTurn) {
            return (
              <div key={i} style={{ position: 'relative' }}>
                <CardView card={communityCards[i] ?? null} faceDown={true} />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, pointerEvents: 'none',
                }}>🌑</div>
              </div>
            )
          }
          return <CardView key={i} card={communityCards[i] ?? null} faceDown={false} />
        })}
      </div>

      {/* Drop Zone / Brew Zone */}
      <div style={{
        padding: '5px 12px',
        border: dropZone.length > 0 ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(212,175,55,0.3)',
        borderRadius: 8,
        background: dropZone.length > 0 ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        minWidth: 140,
        transition: 'border-color 0.3s, background 0.3s',
      }}>
        <div style={{
          fontSize: 10, letterSpacing: 2, color: 'var(--gold-dim)',
          fontFamily: 'var(--font-body)', textTransform: 'uppercase',
        }}>
          {dropZone.length > 0 ? '⚗ The Brew ⚗' : '═══ Drop Zone ═══'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {dropZone.length === 0
            ? [0,1,2].map(i => (
                <div key={i} style={{
                  width: 36, height: 52, borderRadius: 4,
                  border: '1px dashed rgba(212,175,55,0.2)',
                  background: 'rgba(0,0,0,0.2)',
                }} />
              ))
            : dropZone.map((card, i) => (
                <CardView key={i} card={card} small glowing />
              ))
          }
        </div>
      </div>

      {/* Pot */}
      <div style={{
        fontFamily: 'var(--font-display)', color: 'var(--gold)',
        fontSize: 16, letterSpacing: 1,
      }}>
        POT: ◆ {pot}
      </div>
    </div>
  )
}
