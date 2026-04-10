import type { BrewResult, BrewModifier } from '@shared/gameTypes'
import { BREW_DEFS, BREW_MODIFIER_COLORS } from '@/utils/brewResolver'
import { OMEN_IMAGES } from './OmensDisplay'

interface BrewEntry {
  modifier: BrewModifier
  trigger: string
  category: string
}

const BREW_ENTRIES: BrewEntry[] = [
  { modifier: 'nuke',           trigger: 'All dropped cards share the same rank',                  category: 'Rank' },
  { modifier: 'chain-lightning',trigger: 'Dropped cards form a sequential run (e.g. 5-6-7)',        category: 'Rank' },
  { modifier: 'royal-tax',      trigger: 'All dropped cards are face cards (J, Q, K, A)',           category: 'Rank' },
  { modifier: 'underdog',       trigger: 'All dropped cards are low (2–6)',                         category: 'Rank' },
  { modifier: 'bleeding-pot',   trigger: '♥ Hearts majority among dropped cards',                   category: 'Suit' },
  { modifier: 'grave-dig',      trigger: '♠ Spades majority among dropped cards',                   category: 'Suit' },
  { modifier: 'jackpot',        trigger: '♦ Diamonds majority among dropped cards',                 category: 'Suit' },
  { modifier: 'sabotage',       trigger: '♣ Clubs majority among dropped cards',                    category: 'Suit' },
  { modifier: 'fire-sale',      trigger: 'All dropped cards are red (♥ + ♦)',                       category: 'Color' },
  { modifier: 'blackout',       trigger: 'All dropped cards are black (♠ + ♣)',                     category: 'Color' },
]

const CATEGORIES = ['Rank', 'Suit', 'Color'] as const

const CATEGORY_NOTE: Record<string, string> = {
  Rank:  'Rank patterns checked first — they override suit and color patterns.',
  Suit:  'Majority = both cards match (2p) or >50% share a suit (3+p).',
  Color: 'Fallback when no rank or suit pattern triggers. Ties broken randomly.',
}

interface BrewSidebarProps {
  open: boolean
  onToggle: () => void
  activeBrew?: BrewResult | null
}

export function BrewSidebar({ open, onToggle, activeBrew }: BrewSidebarProps) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'row',
      flexShrink: 0,
    }}>
      {/* Toggle tab — always left:-28 so it never overlaps the panel content */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: -28,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 28,
          padding: '8px 4px',
          borderRadius: '6px 0 0 6px',
          background: 'rgba(8,4,4,0.92)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRight: 'none',
          color: 'var(--gold)',
          cursor: 'pointer',
          fontSize: 12,
          writingMode: 'vertical-rl' as const,
          letterSpacing: 2,
          fontFamily: 'var(--font-body)',
          textTransform: 'uppercase' as const,
        }}
        title={open ? 'Close Rite Reference' : 'Open Rite Reference'}
      >
        {open ? '✕' : '☠'}
      </button>

      {/* Sliding panel */}
      <div style={{
        width: open ? 220 : 0,
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        flexShrink: 0,
      }}>
        <div style={{
          width: 220,
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'rgba(8,4,4,0.92)',
          borderLeft: '1px solid rgba(212,175,55,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}>

          {/* Header */}
          <div style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid rgba(212,175,55,0.15)',
            fontFamily: 'var(--font-display)',
            color: 'var(--gold)',
            fontSize: 11,
            letterSpacing: 3,
            textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            ☠ The Rite
          </div>

          <div style={{
            padding: '6px 12px 10px',
            fontFamily: 'var(--font-body)', fontSize: 9,
            color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, textAlign: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            Dropped cards invoke an Omen. The winning Omen calls forth a Fiend.
          </div>

          {/* Omen entries grouped by category */}
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{
                padding: '7px 12px 2px',
                fontFamily: 'var(--font-body)', fontSize: 8, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'var(--gold)',
              }}>
                {cat} Patterns
              </div>
              <div style={{
                padding: '0 12px 4px',
                fontFamily: 'var(--font-body)', fontSize: 8,
                color: 'rgba(255,255,255,0.25)', lineHeight: 1.4,
              }}>
                {CATEGORY_NOTE[cat]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 8px 8px' }}>
                {BREW_ENTRIES.filter(e => e.category === cat).map(entry => {
                  const def = BREW_DEFS[entry.modifier]
                  const color = BREW_MODIFIER_COLORS[entry.modifier]
                  const isActive = activeBrew?.modifier === entry.modifier
                  return (
                    <div key={entry.modifier} style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      padding: '5px 8px',
                      borderRadius: 5,
                      border: `1px solid ${isActive ? color : color + '28'}`,
                      background: isActive ? `${color}15` : `${color}08`,
                      transition: 'border-color 0.3s, background 0.3s',
                    }}>
                      <img
                        src={OMEN_IMAGES[entry.modifier]}
                        alt={def.name}
                        style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 8, fontWeight: 700,
                          letterSpacing: 1, color,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {def.name}{isActive ? ' ← active' : ''}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 8,
                          color: 'rgba(255,255,255,0.55)', marginTop: 1, lineHeight: 1.4,
                        }}>
                          {entry.trigger}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
