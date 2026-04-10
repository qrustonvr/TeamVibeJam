import type { BrewModifier } from '@shared/gameTypes'
import { BREW_DEFS, BREW_MODIFIER_COLORS } from '@/utils/brewResolver'

export const OMEN_IMAGES: Record<BrewModifier, string> = {
  'nuke':           '/TeamVibeJam/assets/Omen__0000_TheAshenDecree.png',
  'bleeding-pot':   '/TeamVibeJam/assets/Omen__0001_BloodBounty.png',
  'royal-tax':      '/TeamVibeJam/assets/Omen__0002_TheTithe.png',
  'sabotage':       '/TeamVibeJam/assets/Omen__0003_Unveiled.png',
  'blackout':       '/TeamVibeJam/assets/Omen__0004_TheShroud.png',
  'fire-sale':      '/TeamVibeJam/assets/Omen__0005_TheInversion.png',
  'grave-dig':      '/TeamVibeJam/assets/Omen__0006_FromthePit.png',
  'underdog':       '/TeamVibeJam/assets/Omen__0007_TheChosenAfflicted.png',
  'jackpot':        '/TeamVibeJam/assets/Omen__0008_TributeDue.png',
  'chain-lightning':'/TeamVibeJam/assets/Omen__0009_Unchained.png',
}

interface OmensDisplayProps {
  omens: BrewModifier[]
  /** per-omen vote counts — shown during brew_reveal */
  omenVotes?: Record<string, number>
  /** the winning omen (highlighted gold) — shown during brew_reveal */
  winningOmen?: BrewModifier
}

export function OmensDisplay({ omens, omenVotes, winningOmen }: OmensDisplayProps) {
  if (omens.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 9,
        letterSpacing: 2,
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
      }}>
        The Rite of Omens
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {omens.map(omen => {
          const def = BREW_DEFS[omen]
          const color = BREW_MODIFIER_COLORS[omen]
          const isWinner = winningOmen === omen
          const votes = omenVotes?.[omen]
          return (
            <div
              key={omen}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '3px 7px',
                borderRadius: 6,
                border: `1px solid ${isWinner ? 'var(--gold)' : color + '60'}`,
                background: isWinner ? 'rgba(212,175,55,0.15)' : `${color}0d`,
                transition: 'all 0.4s',
                boxShadow: isWinner ? '0 0 12px rgba(212,175,55,0.4)' : 'none',
                minWidth: 52,
              }}
            >
              <img
                src={OMEN_IMAGES[omen]}
                alt={def.name}
                style={{ width: 40, height: 40, objectFit: 'contain', opacity: isWinner ? 1 : 0.7 }}
              />
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: 8,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: isWinner ? 'var(--gold)' : color,
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {def.name}
              </span>
              {votes !== undefined && (
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  color: isWinner ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                  fontWeight: isWinner ? 700 : 400,
                }}>
                  {votes}v
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
