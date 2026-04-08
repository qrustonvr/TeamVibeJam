import { Modal } from '@/components/ui/Modal'

interface RulesModalProps {
  open: boolean
  onClose: () => void
}

interface RuleSection {
  heading: string
  body: string[]
}

const SECTIONS: RuleSection[] = [
  {
    heading: 'The Goal',
    body: [
      'Make the best 5-card poker hand using your 2 private hole cards plus the 5 community cards (flop, turn, river).',
    ],
  },
  {
    heading: 'Setup',
    body: [
      'Every player antes $10 to enter the pot.',
      'Each player is dealt 2 private hole cards.',
    ],
  },
  {
    heading: 'Phase Order',
    body: [
      '1. Pre-flop Betting — bet on your 2-card starting hand.',
      '2. Flop — 3 community cards are revealed.',
      '3. Post-Flop Betting.',
      '4. Turn — the 4th community card is revealed AND each player receives a new hole card (now holding 3).',
      '5. THE DROP (Turn) — every player simultaneously picks one of their 3 cards to discard face-down into the shared Drop Zone. Choices are hidden until everyone has dropped, then all flip at once.',
      '6. Turn Betting — bet with knowledge of the Drop Zone.',
      '7. River — the 5th community card is revealed AND each player receives another new hole card (3 cards again).',
      '8. THE DROP (River) — another simultaneous drop into the Drop Zone.',
      '9. River Betting.',
      '10. Showdown — best 5-card hand from your 2 kept cards + 5 community cards wins the pot.',
    ],
  },
  {
    heading: 'THE DROP (Signature Mechanic)',
    body: [
      'The Drop happens twice per hand — once at the turn, once at the river.',
      'Each time, you receive a new hole card (going from 2 to 3), then must choose one to discard into the shared Drop Zone.',
      'All players drop simultaneously. Cards stay face-down until everyone has chosen, then flip all at once.',
      'The Drop Zone is visible to everyone and grows throughout the hand — but dropped cards do NOT count toward any player\'s final hand.',
      'If the timer runs out before you choose, the lowest-ranked card in your hand is auto-dropped.',
    ],
  },
  {
    heading: 'Betting',
    body: [
      'Check — stay in for free when no bet is owed.',
      'Call — match the current bet.',
      'Raise — increase the bet (others must call or fold).',
      'Fold — give up your hand and forfeit any chips already in the pot.',
      'All-In — bet all your remaining chips.',
      'Each betting round has a 30-second turn timer. Auto-fold triggers on expiry.',
    ],
  },
  {
    heading: 'Hand Rankings (High to Low)',
    body: [
      'Royal Flush · Straight Flush · Four of a Kind · Full House · Flush · Straight · Three of a Kind · Two Pair · Pair · High Card',
    ],
  },
  {
    heading: 'Multiplayer',
    body: [
      'Create a room and share the 4-letter code with friends.',
      'The host clicks Start Game once everyone has joined.',
      'If you disconnect during a hand, your seat is held for 60 seconds. Rejoin with the same room code to resume automatically.',
    ],
  },
]

const HAND_COLORS: Record<string, string> = {
  'Royal Flush': 'var(--gold)',
  'Straight Flush': '#c084fc',
  'Four of a Kind': '#f472b6',
  'Full House': '#fb923c',
  'Flush': '#4ade80',
  'Straight': '#38bdf8',
  'Three of a Kind': '#a3e635',
  'Two Pair': '#e2e8f0',
  'Pair': '#e2e8f0',
  'High Card': '#9ca3af',
}

function HandRankings() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', marginTop: 4 }}>
      {Object.entries(HAND_COLORS).map(([name, color]) => (
        <span
          key={name}
          style={{
            color,
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {name}
        </span>
      ))}
    </div>
  )
}

export function RulesModal({ open, onClose }: RulesModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to Play — The Drop"
      panelClassName="max-w-2xl"
    >
      <div
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {SECTIONS.map(section => (
          <div key={section.heading}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                marginBottom: 8,
              }}
            >
              {section.heading}
            </div>

            {section.heading === 'Hand Rankings (High to Low)' ? (
              <HandRankings />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {section.body.map((line, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: '#cbd5e1',
                      lineHeight: 1.6,
                      paddingLeft: section.body.length > 1 ? 0 : 0,
                    }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Quick-reference phase strip */}
        <div
          style={{
            borderTop: '1px solid rgba(212,175,55,0.2)',
            paddingTop: 16,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 10,
            }}
          >
            Quick Reference
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              { label: 'Ante', sub: '$10' },
              { label: 'Start Hand', sub: '2 cards' },
              { label: 'At Drop', sub: '3 → 2' },
              { label: 'Drops / Hand', sub: '2×' },
              { label: 'Community', sub: '5 cards' },
              { label: 'Drop Timer', sub: '20 s' },
              { label: 'Action Timer', sub: '30 s' },
              { label: 'Max Players', sub: '6' },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: '#e2e8f0', marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
