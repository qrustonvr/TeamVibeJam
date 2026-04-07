import { GAUNTLET_MULTIPLIERS } from '@/utils/constants'

interface MultiplierTrailProps {
  survivedCount: number   // how many cards have been beaten (0-5)
  flashIndex: number      // badge index currently flashing (-1 = none)
  phase: string
}

export function MultiplierTrail({ survivedCount, flashIndex, phase }: MultiplierTrailProps) {
  const isActive = phase === 'gauntlet' || phase === 'lost' || phase === 'collected' || phase === 'gauntlet-master'

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-1">
      {GAUNTLET_MULTIPLIERS.map((mult, i) => {
        const lit = survivedCount > i
        const isCurrent = survivedCount === i && isActive
        const isLast = i === 4
        const isFlashing = flashIndex === i

        return (
          <div
            key={i}
            className={[
              'flex items-center justify-center rounded',
              'font-body font-bold tracking-wider',
              'transition-all duration-300',
              isFlashing ? 'animate-badge-flash' : '',
              isLast ? 'px-3 py-1.5' : 'px-2.5 py-1',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              fontSize: isLast ? 'clamp(11px, 1.5vw, 14px)' : 'clamp(10px, 1.3vw, 13px)',
              background: lit
                ? 'rgba(212,175,55,0.18)'
                : isCurrent
                ? 'rgba(212,175,55,0.08)'
                : 'rgba(0,0,0,0.2)',
              border: lit
                ? '1px solid rgba(212,175,55,0.6)'
                : isCurrent
                ? '1px solid rgba(212,175,55,0.35)'
                : '1px solid rgba(212,175,55,0.1)',
              color: lit
                ? 'var(--gold)'
                : isCurrent
                ? 'rgba(212,175,55,0.6)'
                : 'rgba(212,175,55,0.2)',
              boxShadow: lit
                ? '0 0 8px rgba(212,175,55,0.3)'
                : isCurrent
                ? '0 0 4px rgba(212,175,55,0.15)'
                : 'none',
              animation: isCurrent && !isFlashing
                ? 'cardActivePulse 2s ease-in-out infinite'
                : isFlashing
                ? undefined
                : 'none',
              minWidth: isLast ? '52px' : '40px',
            }}
          >
            {mult}×{isLast ? ' 👑' : ''}
          </div>
        )
      })}
    </div>
  )
}
