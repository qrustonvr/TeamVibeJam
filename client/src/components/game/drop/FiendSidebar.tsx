import type { BrewModifier, BrewResult, Card, DropPhase } from '@shared/gameTypes'
import { BREW_DEFS, BREW_MODIFIER_COLORS } from '@/utils/brewResolver'
import { CardView } from './CardView'

// ── Fiend image per modifier ──────────────────────────────────────────────────
const FIEND_IMAGES: Record<BrewModifier, string> = {
  'nuke':            '/TeamVibeJam/assets/Fiend_TheAshenDecree.png',
  'chain-lightning': '/TeamVibeJam/assets/Fiend_Unchained.png',
  'royal-tax':       '/TeamVibeJam/assets/Fiend_TheTithe.png',
  'underdog':        '/TeamVibeJam/assets/Fiend_TheChosenAfflicted.png',
  'bleeding-pot':    '/TeamVibeJam/assets/Fiend_BloodBounty.png',
  'grave-dig':       '/TeamVibeJam/assets/Fiend_FromThePit.png',
  'jackpot':         '/TeamVibeJam/assets/Fiend_TributeDue.png',
  'sabotage':        '/TeamVibeJam/assets/Fiend_Unveiled.png',
  'fire-sale':       '/TeamVibeJam/assets/Fiend_Inversion.png',
  'blackout':        '/TeamVibeJam/assets/Fiend_TheShroud.png',
}

// ── Fiend name + title per modifier ──────────────────────────────────────────
const FIEND_DEFS: Record<BrewModifier, { name: string; title: string }> = {
  'nuke':            { name: 'IGNIS',    title: 'The Ashen One' },
  'chain-lightning': { name: 'VOLTAR',   title: 'The Bound' },
  'royal-tax':       { name: 'MIDAS',    title: 'The Tithe Keeper' },
  'underdog':        { name: 'LAZAEL',   title: 'The Afflicted One' },
  'bleeding-pot':    { name: 'SANGUINE', title: 'The Blood Debtor' },
  'grave-dig':       { name: 'CRYPTOS',  title: 'The Grave Tender' },
  'jackpot':         { name: 'AURIEL',   title: 'The Collector' },
  'sabotage':        { name: 'REVELO',   title: 'The Unveiled' },
  'fire-sale':       { name: 'CHAOS',    title: 'The Inversion' },
  'blackout':        { name: 'UMBRA',    title: 'The Shroud' },
}

const PHASE_LABELS: Partial<Record<DropPhase | 'lobby', string>> = {
  'lobby':        'Lobby',
  'deal':         'Dealing Cards',
  'omens-reveal': 'Omens Reveal',
  'betting_1':    'Pre-flop betting',
  'flop':         'Flop',
  'betting_2':    'Post-flop betting',
  'drop':         'Drop Phase',
  'brew_reveal':  'Brew Reveal',
  'betting_3':    'Post-drop betting',
  'turn':         'Turn',
  'betting_4':    'Post-turn betting',
  'river':        'River',
  'betting_5':    'Post-river betting',
  'showdown':     'Showdown',
  'payout':       'Payout',
}

const ACTION_COLORS: Record<string, string> = {
  fold:    '#ef4444',
  check:   '#6b7280',
  call:    '#22c55e',
  raise:   'var(--gold)',
  'all-in':'#a855f7',
}

interface FiendSidebarProps {
  dropZone: Card[]
  activeBrew?: BrewResult | null
  omens?: BrewModifier[]
  omenVotes?: Record<string, number>
  phase: DropPhase | 'lobby'
  playerName?: string
  playerStack?: number
  playerLastAction?: string | null
}

export function FiendSidebar({ dropZone, activeBrew, omens = [], omenVotes, phase, playerName, playerStack, playerLastAction }: FiendSidebarProps) {
  const brew = activeBrew ?? null
  const fiend = brew ? FIEND_DEFS[brew.modifier] : null
  const fiendImg = brew ? FIEND_IMAGES[brew.modifier] : null
  const brewColor = brew ? BREW_MODIFIER_COLORS[brew.modifier] : 'var(--gold)'
  const brewDef = brew ? BREW_DEFS[brew.modifier] : null

  // Vote bar calculations
  const maxVotes = omenVotes
    ? Math.max(1, ...Object.values(omenVotes))
    : 1

  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      background: 'rgba(8,4,4,0.92)',
      borderRight: '1px solid rgba(212,175,55,0.2)',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>

      {/* ── Drop Zone ─────────────────────────────────── */}
      <div style={{
        padding: '12px 12px 10px',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
      }}>
        <div style={{
          fontSize: 9, letterSpacing: 2,
          color: 'var(--gold-dim)',
          fontFamily: 'var(--font-body)',
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          {dropZone.length > 0 ? '⚗ The Brew ⚗' : '═══ Drop Zone ═══'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {dropZone.length === 0
            ? [0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 36, height: 52, borderRadius: 4,
                  border: '1px dashed rgba(212,175,55,0.2)',
                  background: 'rgba(0,0,0,0.2)',
                }} />
              ))
            : dropZone.map((card, i) => (
                <CardView key={i} card={card} small glowing />
              ))
          }
        </div>
      </div>

      {/* ── Fiend Summoned (when activeBrew is known) ─── */}
      {brew && fiend && fiendImg && brewDef && (
        <>
          {/* Header */}
          <div style={{
            padding: '10px 12px 0',
            fontFamily: 'var(--font-body)',
            fontSize: 9,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--gold)',
            textAlign: 'center',
          }}>
            Fiend Summoned
          </div>

          {/* Portrait */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 8px' }}>
            <div style={{
              width: 110, height: 110,
              borderRadius: '50%',
              border: `2px solid ${brewColor}`,
              boxShadow: `0 0 18px ${brewColor}55`,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.6)',
              flexShrink: 0,
            }}>
              <img
                src={fiendImg}
                alt={fiend.name}
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
          </div>

          {/* Fiend name + title */}
          <div style={{ textAlign: 'center', padding: '0 12px 10px' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: 2,
            }}>
              {fiend.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              fontStyle: 'italic',
              color: 'var(--gold-dim)',
              marginTop: 2,
            }}>
              {fiend.title}
            </div>
          </div>

          {/* Omen label + description */}
          <div style={{
            margin: '0 12px',
            padding: '8px 10px',
            border: `1px solid ${brewColor}60`,
            borderRadius: 6,
            background: `${brewColor}0d`,
          }}>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              color: brewColor,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Omen: {brewDef.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 9,
              color: 'rgba(232,221,216,0.7)',
              lineHeight: 1.5,
            }}>
              {brewDef.description}
            </div>
          </div>

          {/* Vote Results */}
          {omenVotes && omens.length > 0 && (
            <div style={{ padding: '10px 12px 0' }}>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 9, letterSpacing: 2,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                Vote Results
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {omens.map(omen => {
                  const votes = omenVotes[omen] ?? 0
                  const barPct = (votes / maxVotes) * 100
                  const isWinner = brew.modifier === omen
                  const color = BREW_MODIFIER_COLORS[omen]
                  const name = BREW_DEFS[omen].name
                  return (
                    <div key={omen} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 8, letterSpacing: 1,
                          color: isWinner ? color : 'rgba(255,255,255,0.4)',
                          fontWeight: isWinner ? 700 : 400,
                          textTransform: 'uppercase',
                        }}>
                          {name}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 9,
                          color: isWinner ? color : 'rgba(255,255,255,0.3)',
                          fontWeight: isWinner ? 700 : 400,
                        }}>
                          {votes}
                        </span>
                      </div>
                      <div style={{
                        height: 4, borderRadius: 2,
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${barPct}%`,
                          background: isWinner ? color : color + '60',
                          borderRadius: 2,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Round Status */}
          <div style={{ padding: '10px 12px 12px' }}>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 9, letterSpacing: 2,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Round Status
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(232,221,216,0.6)' }}>
              {PHASE_LABELS[phase] ?? phase}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 10,
              color: brewColor, marginTop: 2,
            }}>
              Omen: {brewDef.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} active
            </div>
          </div>
        </>
      )}
      {/* ── Player Info ──────────────────────────────────── */}
      {playerName !== undefined && (
        <div style={{
          marginTop: 'auto',
          padding: '10px 12px 14px',
          borderTop: '1px solid rgba(212,175,55,0.15)',
        }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 9, letterSpacing: 2,
            color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            You
          </div>

          {/* Name */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14, fontWeight: 700,
            color: 'var(--gold)',
            letterSpacing: 1,
            marginBottom: 2,
          }}>
            {playerName}
          </div>

          {/* Bankroll */}
          {playerStack !== undefined && (
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--gold-dim)',
              marginBottom: 6,
            }}>
              ◆ {playerStack}
            </div>
          )}

          {/* Last action */}
          {playerLastAction && (
            <div style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 3,
              background: ACTION_COLORS[playerLastAction] ?? 'rgba(255,255,255,0.2)',
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: '#000',
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: 1,
            }}>
              {playerLastAction}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
