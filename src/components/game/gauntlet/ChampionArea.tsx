import { Card, GauntletPhase } from '@/types/gauntlet'
import { GAME_CONFIG, GAUNTLET_MULTIPLIERS } from '@/utils/constants'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { PlayingCard } from './PlayingCard'

interface ChampionAreaProps {
  card: Card | null
  currentPot: number
  displayPot: number       // separate display value for draining animation
  baseBet: number
  currentPosition: number
  phase: GauntletPhase
  cardVisible: boolean
}

export function ChampionArea({
  card,
  currentPot,
  displayPot,
  baseBet,
  currentPosition,
  phase,
  cardVisible,
}: ChampionAreaProps) {
  const inGauntlet = phase === 'gauntlet'
  const nextMultiplier = currentPosition < 5 ? GAUNTLET_MULTIPLIERS[currentPosition] : null
  const nextPot = baseBet > 0 && nextMultiplier ? baseBet * nextMultiplier : 0

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {/* Champion label */}
      <span
        className="font-body text-xs tracking-[0.2em] uppercase"
        style={{ color: 'rgba(212,175,55,0.6)' }}
      >
        Champion
      </span>

      {/* Card */}
      <div style={{ position: 'relative' }}>
        {cardVisible && card ? (
          <PlayingCard
            card={card}
            highlighted={true}
            flipped={true}
            size="large"
            slideIn="left"
          />
        ) : (
          <div
            style={{
              width: 'clamp(81px, 10.5vw, 105px)',
              height: 'clamp(117px, 15vw, 150px)',
              borderRadius: '6px',
              border: '1px solid rgba(212,175,55,0.15)',
              background: 'rgba(0,0,0,0.2)',
            }}
          />
        )}
      </div>

      {/* Pot display */}
      <div className="flex flex-col items-center gap-0.5">
        <span
          className="font-body text-xs tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Pot
        </span>
        <span style={{ color: 'var(--gold)' }}>
          <AnimatedNumber
            value={displayPot}
            prefix={`${GAME_CONFIG.CURRENCY_SYMBOL} `}
            className="font-display text-xl sm:text-2xl font-bold tracking-wider tabular-nums"
            duration={400}
          />
        </span>

        {/* Next multiplier hint */}
        {inGauntlet && nextMultiplier && currentPot > 0 && (
          <span
            className="font-body text-xs tracking-wider animate-fade-in"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Next: {nextMultiplier}× →{' '}
            <span style={{ color: 'rgba(212,175,55,0.8)' }}>
              {GAME_CONFIG.CURRENCY_SYMBOL} {nextPot.toLocaleString()}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
