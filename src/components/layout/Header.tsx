import { useGame } from '@/context/GameContext'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { GAME_CONFIG } from '@/utils/constants'

export function Header() {
  const { state } = useGame()

  return (
    <header
      className="w-full px-6 py-4 flex items-center justify-between"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 100%)',
        borderBottom: '1px solid var(--gold-dim)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-display text-xl tracking-[0.25em] uppercase"
          style={{ color: 'var(--gold)' }}
        >
          {GAME_CONFIG.GAME_NAME}
        </span>
      </div>

      <div className="flex items-center gap-2 font-body text-sm">
        <span className="text-gray-500 tracking-widest uppercase text-xs">Balance</span>
        <AnimatedNumber
          value={state.balance}
          prefix={`${GAME_CONFIG.CURRENCY_SYMBOL} `}
          className="text-white font-semibold tracking-wider tabular-nums"
          duration={400}
        />
      </div>
    </header>
  )
}
