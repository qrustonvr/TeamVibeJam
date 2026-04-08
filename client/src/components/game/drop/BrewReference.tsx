import { Modal } from '@/components/ui/Modal'
import type { BrewModifier } from '@shared/gameTypes'
import { BREW_DEFS, BREW_MODIFIER_COLORS } from '@/utils/brewResolver'

interface BrewReferenceProps {
  open: boolean
  onClose: () => void
}

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
  { modifier: 'calm-waters',    trigger: 'Mixed colors — no pattern matched',                       category: 'Color' },
]

const CATEGORIES = ['Rank', 'Suit', 'Color'] as const

const CATEGORY_NOTE: Record<string, string> = {
  Rank:  'Rank patterns checked first — they override suit and color patterns.',
  Suit:  'Majority = both cards match (2 players) or >50% share a suit (3+ players).',
  Color: 'Fallback when no rank or suit pattern triggers.',
}

export function BrewReference({ open, onClose }: BrewReferenceProps) {
  return (
    <Modal open={open} onClose={onClose} title="The Brew — Modifier Reference" panelClassName="max-w-2xl">
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          After everyone drops a card, The Brew analyzes the combination and triggers a game-altering modifier.
          Priority: Rank patterns → Suit majority → Color patterns.
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'var(--gold)', marginBottom: 4,
            }}>
              {cat} Patterns
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.35)',
              marginBottom: 10,
            }}>
              {CATEGORY_NOTE[cat]}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BREW_ENTRIES.filter(e => e.category === cat).map(entry => {
                const def = BREW_DEFS[entry.modifier]
                const color = BREW_MODIFIER_COLORS[entry.modifier]
                return (
                  <div key={entry.modifier} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${color}30`,
                    background: `${color}0a`,
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{def.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700,
                        letterSpacing: 1, color,
                      }}>
                        {def.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
                        <span style={{ color: 'rgba(255,255,255,0.35)' }}>Trigger: </span>{entry.trigger}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
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
    </Modal>
  )
}
