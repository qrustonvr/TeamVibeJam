import { useEffect, useState } from 'react'
import type { BrewResult, Card, BrewModifier } from '@shared/gameTypes'
import { BREW_MODIFIER_COLORS } from '@/utils/brewResolver'

const FIEND_IMAGES: Record<BrewModifier, string> = {
  'nuke':           '/TeamVibeJam/assets/Fiend_TheAshenDecree.png',
  'chain-lightning':'/TeamVibeJam/assets/Fiend_Unchained.png',
  'royal-tax':      '/TeamVibeJam/assets/Fiend_TheTithe.png',
  'underdog':       '/TeamVibeJam/assets/Fiend_TheChosenAfflicted.png',
  'bleeding-pot':   '/TeamVibeJam/assets/Fiend_BloodBounty.png',
  'grave-dig':      '/TeamVibeJam/assets/Fiend_FromThePit.png',
  'jackpot':        '/TeamVibeJam/assets/Fiend_TributeDue.png',
  'sabotage':       '/TeamVibeJam/assets/Fiend_Unveiled.png',
  'fire-sale':      '/TeamVibeJam/assets/Fiend_Inversion.png',
  'blackout':       '/TeamVibeJam/assets/Fiend_TheShroud.png',
}
import { CardView } from './CardView'
import { OmensDisplay } from './OmensDisplay'

interface BrewRevealProps {
  brew: BrewResult
  dropZone: Card[]
  omens?: BrewModifier[]
  omenVotes?: Record<string, number>
}

export function BrewReveal({ brew, dropZone, omens, omenVotes }: BrewRevealProps) {
  const [stage, setStage] = useState<'cards' | 'analyzing' | 'announce'>('cards')
  const color = BREW_MODIFIER_COLORS[brew.modifier]

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

      {/* Analyzing pulse + omen vote tally */}
      {stage === 'analyzing' && (
        <>
          {omens && omens.length > 0 && omenVotes && (
            <OmensDisplay omens={omens} omenVotes={omenVotes} />
          )}
          <div style={{
            fontFamily: 'var(--font-body)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            letterSpacing: 4,
            textTransform: 'uppercase',
            animation: 'glow 1s ease-in-out infinite',
          }}>
            The Rite Unfolds…
          </div>
        </>
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

          <img
            src={FIEND_IMAGES[brew.modifier]}
            alt={brew.name}
            style={{
              width: 120, height: 120, objectFit: 'contain',
              filter: `drop-shadow(0 0 20px ${color})`,
            }}
          />

          <div style={{
            fontFamily: 'var(--font-title)',
            color,
            fontSize: 22,
            letterSpacing: 4,
            textShadow: `0 0 30px ${color}`,
            textAlign: 'center',
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
