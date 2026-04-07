import { Card, GauntletPhase, CardResult } from '@/types/gauntlet'
import { GAUNTLET_MULTIPLIERS } from '@/utils/constants'
import { PlayingCard } from './PlayingCard'

interface GauntletRowProps {
  cards: Card[]
  currentPosition: number
  phase: GauntletPhase
  result: CardResult
  liftedIndex: number   // -1 = none lifted
  flippedIndex: number  // -1 = none mid-flip
  cardsVisible: boolean // false until deal animation completes
}

export function GauntletRow({
  cards,
  currentPosition,
  phase,
  result,
  liftedIndex,
  flippedIndex,
  cardsVisible,
}: GauntletRowProps) {
  const isInGauntlet = phase === 'gauntlet'
  const isResolved = phase === 'lost' || phase === 'collected' || phase === 'gauntlet-master'

  if (!cardsVisible || cards.length === 0) {
    // Empty placeholders before deal
    return (
      <div className="flex flex-col items-center gap-2 px-4">
        <div className="flex gap-2 sm:gap-3 justify-center items-end">
          {GAUNTLET_MULTIPLIERS.map((mult, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                style={{
                  width: 'clamp(70px, 9vw, 90px)',
                  height: 'clamp(100px, 13vw, 130px)',
                  borderRadius: '6px',
                  border: '1px solid rgba(212,175,55,0.15)',
                  background: 'rgba(0,0,0,0.2)',
                }}
              />
              <span
                className="font-body text-xs tracking-wider"
                style={{ color: 'rgba(212,175,55,0.3)' }}
              >
                {mult}×
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4">
      <div className="flex gap-2 sm:gap-3 justify-center items-end">
        {cards.map((card, i) => {
          const isActive = isInGauntlet && i === currentPosition
          const isCurrent = i === currentPosition
          const isBeaten = i < currentPosition && card.faceUp
          const isKiller = isResolved && phase === 'lost' && i === currentPosition && card.faceUp
          const isLifted = liftedIndex === i
          const isFlipping = flippedIndex === i

          // Determine win/lose flash on the revealed card
          const isWinFlash =
            isCurrent &&
            card.faceUp &&
            (result === 'win' || result === 'clash-win') &&
            !isResolved

          const isLoseFlash = isKiller

          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <PlayingCard
                card={card}
                active={isActive && !isLifted && !isFlipping}
                dimmed={isBeaten && !isKiller}
                danger={isLoseFlash}
                winFlash={isWinFlash}
                loseFlash={isLoseFlash}
                lifted={isLifted}
                flipped={card.faceUp || isFlipping}
                slideIn="right"
                animDelay={i * 0.1}
              />
              <span
                className="font-body text-xs tracking-wider"
                style={{
                  color:
                    i < currentPosition
                      ? 'rgba(212,175,55,0.7)'
                      : i === currentPosition && isInGauntlet
                      ? 'var(--gold)'
                      : 'rgba(212,175,55,0.3)',
                  fontWeight: i === currentPosition && isInGauntlet ? 700 : 400,
                }}
              >
                {GAUNTLET_MULTIPLIERS[i]}×
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
