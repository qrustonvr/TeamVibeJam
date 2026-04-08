import { useEffect, useState } from 'react'
import type { BrewResult, Card } from '@shared/gameTypes'
import { BREW_MODIFIER_COLORS } from '@/utils/brewResolver'
import { CardView } from './CardView'

interface BrewRevealProps {
  brew: BrewResult
  dropZone: Card[]
}

export function BrewReveal({ brew, dropZone }: BrewRevealProps) {
  const [stage, setStage] = useState<'cards' | 'analyzing' | 'announce'>('cards')
  const color = BREW_MODIFIER_COLORS[brew.modifier]
  const isCalm = brew.modifier === 'calm-waters'

  useEffect(() => {
    const t1 = setTimeout(() => setStage('analyzing'), 800)
    const t2 = setTimeout(() => setStage('announce'), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(6px)',
      borderRadius: 12,
      gap: 16,
      zIndex: 15,
    }}>
      {/* Dropped cards */}
      <div style={{ display: 'flex', gap: 10 }}>
        {dropZone.map((card, i) => (
          <div key={i} style={{
            transition: 'box-shadow 0.5s',
            boxShadow: stage !== 'cards' ? `0 0 20px ${color}` : 'none',
            borderRadius: 4,
          }}>
            <CardView card={card} glowing={stage !== 'cards'} />
          </div>
        ))}
      </div>

      {/* Analyzing pulse */}
      {stage === 'analyzing' && (
        <div style={{
          fontFamily: 'var(--font-body)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          letterSpacing: 4,
          textTransform: 'uppercase',
          animation: 'glow 1s ease-in-out infinite',
        }}>
          Brewing…
        </div>
      )}

      {/* Brew announcement */}
      {stage === 'announce' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          animation: 'brewSlam 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}>
          <style>{`
            @keyframes brewSlam {
              from { transform: scale(2); opacity: 0; }
              to   { transform: scale(1); opacity: 1; }
            }
          `}</style>

          <div style={{ fontSize: isCalm ? 36 : 52 }}>{brew.icon}</div>

          <div style={{
            fontFamily: 'var(--font-display)',
            color,
            fontSize: isCalm ? 20 : 28,
            letterSpacing: 4,
            textShadow: `0 0 30px ${color}`,
          }}>
            {brew.name}
          </div>

          <div style={{
            fontFamily: 'var(--font-body)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 280,
            lineHeight: 1.5,
          }}>
            {brew.description}
          </div>
        </div>
      )}
    </div>
  )
}
