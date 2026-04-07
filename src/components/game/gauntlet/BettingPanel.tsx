import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { GAME_CONFIG, CHIP_VALUES } from '@/utils/constants'

interface BettingPanelProps {
  bet: number
  balance: number
  isAnimating: boolean
  onChipClick: (value: number) => void
  onClearBet: () => void
  onAllIn: () => void
  onDeal: () => void
  onRebuy: () => void
}

export function BettingPanel({
  bet,
  balance,
  isAnimating,
  onChipClick,
  onClearBet,
  onAllIn,
  onDeal,
  onRebuy,
}: BettingPanelProps) {
  const isBusted = balance <= 0
  const canDeal = bet >= GAME_CONFIG.MIN_BET && !isAnimating && !isBusted

  return (
    <div className="flex flex-col items-center gap-3 px-4 pb-2">
      {/* Chip selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {CHIP_VALUES.map(v => {
          const disabled = isAnimating || isBusted || v > balance
          return (
            <Chip
              key={v}
              value={v}
              disabled={disabled}
              onClick={() => onChipClick(v)}
            />
          )
        })}
        {/* ALL IN */}
        <button
          onClick={onAllIn}
          disabled={isAnimating || isBusted || balance <= 0}
          className={[
            'h-16 px-3 rounded-full',
            'font-body font-bold text-xs tracking-widest uppercase',
            'transition-all duration-150 ease-out select-none outline-none',
            'border-2',
            isAnimating || isBusted
              ? 'opacity-40 cursor-not-allowed border-red-900 text-red-900'
              : 'cursor-pointer border-red-600 text-red-400 hover:border-red-400 hover:text-red-300 hover:scale-105 hover:-translate-y-1',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            background: 'rgba(153,27,27,0.15)',
            boxShadow: isAnimating || isBusted ? 'none' : '0 0 12px rgba(220,38,38,0.2)',
          }}
        >
          ALL IN
        </button>
      </div>

      {/* Current bet display */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className="font-body text-xs tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Bet
          </span>
          <span
            className="font-display text-lg font-bold tabular-nums"
            style={{ color: bet > 0 ? 'var(--gold)' : 'rgba(212,175,55,0.3)' }}
          >
            {GAME_CONFIG.CURRENCY_SYMBOL} {bet.toLocaleString()}
          </span>
        </div>
        {bet > 0 && !isAnimating && (
          <button
            onClick={onClearBet}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-150 hover:scale-110"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            aria-label="Clear bet"
          >
            ×
          </button>
        )}
      </div>

      {/* Balance */}
      <div
        className="font-body text-xs tracking-widest"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        Balance: {GAME_CONFIG.CURRENCY_SYMBOL} {balance.toLocaleString()}
      </div>

      {/* Deal / Rebuy */}
      {isBusted ? (
        <div className="flex flex-col items-center gap-2">
          <span
            className="font-display text-lg tracking-widest uppercase"
            style={{ color: '#dc2626' }}
          >
            BUSTED
          </span>
          <Button variant="ghost" onClick={onRebuy}>
            REBUY {GAME_CONFIG.CURRENCY_SYMBOL} {GAME_CONFIG.STARTING_BALANCE.toLocaleString()}
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={onDeal}
          disabled={!canDeal}
          className="px-10 py-3 text-base tracking-[0.3em]"
        >
          {isAnimating ? 'DEALING...' : 'DEAL'}
        </Button>
      )}

      {/* Insufficient hint */}
      {!isBusted && balance < GAME_CONFIG.MIN_BET && (
        <span
          className="font-body text-xs"
          style={{ color: '#ef4444' }}
        >
          Insufficient chips — rebuy to continue
        </span>
      )}
    </div>
  )
}
