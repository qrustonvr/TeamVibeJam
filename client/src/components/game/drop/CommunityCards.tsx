import type { Card } from '@shared/gameTypes'
import { CardView } from './CardView'

interface CommunityCardsProps {
  communityCards: Card[]
  dropZone: Card[]
  pot: number
}

export function CommunityCards({ communityCards, dropZone, pot }: CommunityCardsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Community cards */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2,3,4].map(i => (
          <CardView key={i} card={communityCards[i] ?? null} faceDown={false} />
        ))}
      </div>

      {/* Drop Zone */}
      <div style={{
        padding: '8px 16px',
        border: '1px solid rgba(212,175,55,0.4)',
        borderRadius: 8,
        background: 'rgba(212,175,55,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        minWidth: 140,
      }}>
        <div style={{
          fontSize: 10, letterSpacing: 2, color: 'var(--gold-dim)',
          fontFamily: 'var(--font-body)', textTransform: 'uppercase',
        }}>
          ═══ Drop Zone ═══
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
