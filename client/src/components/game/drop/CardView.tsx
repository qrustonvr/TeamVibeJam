import type { Card } from '@shared/gameTypes'

interface CardViewProps {
  card: Card | null
  faceDown?: boolean
  selected?: boolean
  onClick?: () => void
  small?: boolean
  dimmed?: boolean
  glowing?: boolean
}

const SUIT_COLORS: Record<string, string> = {
  '♠': '#1a1020',
  '♣': '#1a1020',
  '♥': '#8b0000',
  '♦': '#8b0000',
}

export function CardView({ card, faceDown = false, selected = false, onClick, small = false, dimmed = false, glowing = false }: CardViewProps) {
  const w = small ? 36 : 52
  const h = small ? 52 : 76
  const rankSize = small ? 14 : 22
  const suitSize = small ? 12 : 18

  const baseStyle: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: small ? 4 : 6,
    border: selected
      ? '2px solid var(--gold)'
      : '1px solid rgba(255,255,255,0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    transform: selected ? 'translateY(-8px)' : 'none',
    boxShadow: glowing
      ? '0 0 12px var(--gold), 0 0 24px var(--gold-dim)'
      : selected
        ? '0 8px 20px rgba(212,175,55,0.5)'
        : '0 2px 8px rgba(0,0,0,0.5)',
    opacity: dimmed ? 0.4 : 1,
    userSelect: 'none',
    position: 'relative',
  }

  if (faceDown || !card) {
    return (
      <div style={{
        ...baseStyle,
        backgroundImage: "url('/TeamVibeJam/assets/Cardback.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1a0808',
      }} />
    )
  }

  const suitColor = SUIT_COLORS[card.suit] ?? '#fff'
  const rankStr = card.display.slice(0, -1)
  const suitStr = card.suit

  return (
    <div
      style={{
        ...baseStyle,
        background: 'linear-gradient(160deg, #fff8e0 0%, #ffe08a 35%, #ffb830 65%, #ff7a00 100%)',
        boxShadow: glowing
          ? '0 0 12px var(--gold), 0 0 24px var(--gold-dim)'
          : selected
            ? '0 8px 20px rgba(212,175,55,0.5)'
            : '0 2px 8px rgba(0,0,0,0.6), inset 0 0 12px rgba(255,160,0,0.15)',
      }}
      onClick={onClick}
    >
      {/* Center large rank + suit */}
      <div style={{
        color: suitColor, fontFamily: 'var(--font-display)', fontWeight: 700,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        textShadow: '0 1px 4px rgba(255,255,255,0.6)',
      }}>
        <div style={{ fontSize: rankSize * 2, lineHeight: 1, height: rankSize * 2.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rankStr}</div>
        <div style={{ fontSize: suitSize * 1.6, lineHeight: 1, height: suitSize * 1.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{suitStr}</div>
      </div>

    </div>
  )
}
