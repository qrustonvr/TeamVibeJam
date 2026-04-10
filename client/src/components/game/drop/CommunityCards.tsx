import type { Card } from '@shared/gameTypes'
import { CardView } from './CardView'
import { ChipStack } from './ChipStack'

interface CommunityCardsProps {
  communityCards: Card[]
  pot: number
  turnIsHidden?: boolean
}

export function CommunityCards({ communityCards, pot, turnIsHidden = false }: CommunityCardsProps) {
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

      {/* Pot chips */}
      {pot > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            fontSize: 9, letterSpacing: 2, color: 'var(--gold-dim)',
            fontFamily: 'var(--font-body)', textTransform: 'uppercase',
          }}>
            pot
          </div>
          <ChipStack amount={pot} chipSize={34} maxTypes={4} showLabel />
        </div>
      )}
    </div>
  )
}
