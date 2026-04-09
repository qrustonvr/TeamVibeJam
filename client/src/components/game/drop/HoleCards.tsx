import type { Card } from '@shared/gameTypes'
import { CardView } from './CardView'

interface HoleCardsProps {
  cards: Card[]
  isDropPhase: boolean
  hasDropped: boolean
  onDrop?: (cardIndex: number) => void
  faceDown?: boolean
  small?: boolean
}

export function HoleCards({ cards, isDropPhase, hasDropped, onDrop, faceDown = false, small = false }: HoleCardsProps) {
  const label = isDropPhase && !hasDropped ? 'Select a card to drop' : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: small ? 4 : 8 }}>
        {cards.map((card, i) => (
          <CardView
            key={i}
            card={card}
            faceDown={faceDown}
            small={small}
            onClick={isDropPhase && !hasDropped && onDrop ? () => onDrop(i) : undefined}
            selected={false}
            dimmed={false}
          />
        ))}
        {/* Show empty slots if fewer cards than expected */}
        {faceDown && cards.length === 0 && [0,1,2].map(i => (
          <CardView key={i} card={null} faceDown small={small} />
        ))}
      </div>
      {label && !faceDown && (
        <div style={{
          fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-body)',
          letterSpacing: 1, textTransform: 'uppercase',
          animation: isDropPhase && !hasDropped ? 'glow 2.5s ease-in-out infinite' : 'none',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}
