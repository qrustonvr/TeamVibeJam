import { Card } from '@/types/gauntlet'
import { calcWinProbability } from '@/utils/deck'

interface OddsDisplayProps {
  champion: Card
  revealedCards: Card[]
}

export function OddsDisplay({ champion, revealedCards }: OddsDisplayProps) {
  const pct = calcWinProbability(champion, revealedCards)
  const color =
    pct >= 65 ? '#4ade80' :
    pct >= 40 ? 'var(--gold)' :
    '#f87171'

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full font-body text-xs"
      style={{
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Win chance:</span>
      <div
        className="relative h-1.5 w-16 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span style={{ color, fontWeight: 700 }}>~{pct}%</span>
    </div>
  )
}
