import { useState } from 'react'
import { useGame } from '@/context/GameContext'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { GAME_CONFIG, CHIP_VALUES } from '@/utils/constants'

export function Placeholder() {
  const { state, dispatch } = useGame()
  const [selectedChip, setSelectedChip] = useState<number | null>(null)

  const handleChipClick = (value: number) => {
    if (selectedChip === value) {
      // Clicking the same chip places that bet
      dispatch({ type: 'PLACE_BET', amount: value })
    } else {
      setSelectedChip(value)
    }
  }

  const handlePlaceBet = () => {
    if (selectedChip !== null) {
      dispatch({ type: 'PLACE_BET', amount: selectedChip })
    }
  }

  const handleClearBet = () => {
    dispatch({ type: 'CLEAR_BET' })
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 px-6 text-center w-full">
      {/* Game name */}
      <div className="flex flex-col items-center gap-2">
        <h1
          className="font-display text-4xl md:text-5xl tracking-[0.2em] uppercase animate-glow"
          style={{ color: 'var(--gold)' }}
        >
          {GAME_CONFIG.GAME_NAME}
        </h1>
        <p
          className="font-body text-xs tracking-[0.4em] uppercase animate-pulse-slow"
          style={{ color: 'var(--gold-dim)' }}
        >
          Game Loading&hellip;
        </p>
      </div>

      {/* Balance display */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-body text-xs tracking-widest uppercase text-gray-500">Balance</span>
        <AnimatedNumber
          value={state.balance}
          prefix={`${GAME_CONFIG.CURRENCY_SYMBOL} `}
          className="font-display text-3xl text-white tabular-nums"
          duration={500}
        />
      </div>

      {/* Chip selector */}
      <div className="flex flex-col items-center gap-4">
        <span className="font-body text-xs tracking-widest uppercase text-gray-500">Select Chip</span>
        <div className="flex gap-4 items-end">
          {CHIP_VALUES.map(value => (
            <Chip
              key={value}
              value={value}
              selected={selectedChip === value}
              disabled={value > state.balance}
              onClick={() => handleChipClick(value)}
            />
          ))}
        </div>
      </div>

      {/* Current bet + actions */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div className="flex items-center justify-between w-full px-4 py-2 rounded font-body text-sm"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,175,55,0.15)' }}
        >
          <span className="text-gray-500 tracking-widest uppercase text-xs">Current Bet</span>
          <AnimatedNumber
            value={state.currentBet}
            prefix={`${GAME_CONFIG.CURRENCY_SYMBOL} `}
            className="text-white tabular-nums"
            duration={200}
          />
        </div>

        <div className="flex gap-3 w-full">
          <Button
            variant="ghost"
            onClick={handleClearBet}
            disabled={state.currentBet === 0}
            className="flex-1"
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            onClick={handlePlaceBet}
            disabled={selectedChip === null || state.balance < (selectedChip ?? 0)}
            className="flex-1"
          >
            + Add
          </Button>
        </div>

        <Button
          variant="primary"
          fullWidth
          disabled
          className="mt-1 opacity-40"
        >
          Play
        </Button>

        <p className="font-body text-xs text-gray-600 tracking-widest uppercase mt-1">
          Drop your game into GameTable.tsx to begin
        </p>
      </div>
    </div>
  )
}
