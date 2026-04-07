import { Button } from '@/components/ui/Button'
import { GAME_CONFIG, GAUNTLET_MULTIPLIERS } from '@/utils/constants'

interface ActionButtonsProps {
  position: number      // 0-4, which gauntlet card is next
  currentPot: number
  isAnimating: boolean
  onAdvance: () => void
  onCollect: () => void
}

export function ActionButtons({
  position,
  currentPot,
  isAnimating,
  onAdvance,
  onCollect,
}: ActionButtonsProps) {
  const nextMult = GAUNTLET_MULTIPLIERS[position]
  const isLastCard = position === 4
  const canCollect = position > 0   // must have beaten at least 1 card

  return (
    <div className="flex flex-col items-center gap-2 px-4 pb-2">
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        {/* ADVANCE */}
        <div className="w-full sm:w-auto flex-1">
          <Button
            variant="danger"
            fullWidth
            disabled={isAnimating}
            onClick={onAdvance}
            className={[
              'py-3.5 text-sm tracking-[0.2em]',
              !isAnimating ? 'animate-danger-pulse' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isAnimating
              ? 'FLIPPING...'
              : `ADVANCE → ${nextMult}×${isLastCard ? ' 👑' : ''}`}
          </Button>
        </div>

        {/* COLLECT */}
        <div className="w-full sm:w-auto flex-1">
          <Button
            variant="primary"
            fullWidth
            disabled={isAnimating || !canCollect}
            onClick={onCollect}
            className="py-3.5 text-sm tracking-[0.2em]"
          >
            {`COLLECT ${GAME_CONFIG.CURRENCY_SYMBOL} ${currentPot.toLocaleString()}`}
          </Button>
        </div>
      </div>

      {/* Risk reminder */}
      {!isAnimating && currentPot > 0 && (
        <p
          className="font-body text-xs text-center animate-fade-in"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          You'll lose {GAME_CONFIG.CURRENCY_SYMBOL} {currentPot.toLocaleString()} if the next card wins
        </p>
      )}
    </div>
  )
}
