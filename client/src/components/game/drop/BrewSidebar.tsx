import type { BrewResult, BrewModifier } from '@shared/gameTypes'
import { BREW_DEFS, BREW_MODIFIER_COLORS } from '@/utils/brewResolver'

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
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: open ? 0 : -28,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 28,
          padding: '8px 4px',
          borderRadius: '6px 0 0 6px',
          background: 'rgba(212,175,55,0.12)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRight: open ? 'none' : '1px solid rgba(212,175,55,0.3)',
          color: 'var(--gold)',
          cursor: 'pointer',
          fontSize: 12,
          writingMode: 'vertical-rl' as const,
          letterSpacing: 2,
          fontFamily: 'var(--font-body)',
          textTransform: 'uppercase' as const,
          transition: 'left 0.3s ease',
        }}
        title={open ? 'Close Rite Reference' : 'Open Rite Reference'}
      >
        {open ? '✕' : '☠'}
      </button>

      {/* Panel */}
      <div style={{
        width: open ? 260 : 0,
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        flexShrink: 0,
      }}>
        <div style={{
          width: 260,
          height: '100%',
          overflowY: 'auto',
          background: 'rgba(10,10,20,0.95)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 8,
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--gold)',
            fontSize: 13,
            letterSpacing: 2,
            textAlign: 'center',
          }}>
            ☠ THE RITE
          </div>

          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 10,
            color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, textAlign: 'center',
          }}>
            Dropped cards invoke an Omen. The winning Omen calls forth a Fiend.
          </div>

          {CATEGORIES.map(cat => (
            <div key={cat}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'var(--gold)', marginBottom: 3,
              }}>
                {cat} Patterns
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 9,
                color: 'rgba(255,255,255,0.3)', marginBottom: 6, lineHeight: 1.4,
              }}>
                {CATEGORY_NOTE[cat]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {BREW_ENTRIES.filter(e => e.category === cat).map(entry => {
                  const def = BREW_DEFS[entry.modifier]
                  const color = BREW_MODIFIER_COLORS[entry.modifier]
                  const isActive = activeBrew?.modifier === entry.modifier
                  return (
                    <div key={entry.modifier} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      padding: '5px 8px',
                      borderRadius: 5,
                      border: `1px solid ${isActive ? color : color + '28'}`,
                      background: isActive ? `${color}15` : `${color}08`,
                      transition: 'border-color 0.3s, background 0.3s',
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>{def.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700,
                          letterSpacing: 1, color,
                        }}>
                          {def.name} {isActive && '← active'}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 9,
                          color: 'rgba(255,255,255,0.65)', marginTop: 1, lineHeight: 1.4,
                        }}>
                          {def.description}
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
