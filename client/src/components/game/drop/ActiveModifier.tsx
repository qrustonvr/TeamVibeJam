import { useState } from 'react'
import type { BrewResult } from '@shared/gameTypes'
import { BREW_MODIFIER_COLORS } from '@/utils/brewResolver'

interface ActiveModifierProps {
  brew: BrewResult
}

export function ActiveModifier({ brew }: ActiveModifierProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const color = BREW_MODIFIER_COLORS[brew.modifier]

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px',
          borderRadius: 20,
          border: `1px solid ${color}`,
          background: `${color}18`,
          cursor: 'default',
          animation: 'subtlePulse 3s ease-in-out infinite',
        }}
      >
        <style>{`
          @keyframes subtlePulse {
            0%, 100% { box-shadow: 0 0 6px ${color}40; }
            50%       { box-shadow: 0 0 14px ${color}80; }
          }
        `}</style>
        <span style={{ fontSize: 14 }}>{brew.icon}</span>
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color,
          fontWeight: 700,
        }}>
          {brew.name}
        </span>
      </div>

      {showTooltip && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '8px 12px',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.85)',
          zIndex: 50,
          pointerEvents: 'none',
        }}>
          {brew.description}
        </div>
      )}
    </div>
  )
}
