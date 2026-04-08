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
  '♠': '#1a1a2e',
  '♣': '#1a1a2e',
  '♥': '#c0392b',
  '♦': '#c0392b',
}

export function CardView({ card, faceDown = false, selected = false, onClick, small = false, dimmed = false, glowing = false }: CardViewProps) {
  const w = small ? 36 : 52
  const h = small ? 52 : 76
  const fontSize = small ? 11 : 15

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
        background: 'linear-gradient(135deg, #1a3a5c 0%, #0d2040 100%)',
      }}>
        <div style={{
          width: '80%', height: '80%',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 3,
          background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(212,175,55,0.05) 3px, rgba(212,175,55,0.05) 6px)',
        }} />
      </div>
    )
  }

  const suitColor = SUIT_COLORS[card.suit] ?? '#fff'
  const rankStr = card.display.slice(0, -1)
  const suitStr = card.suit

  return (
    <div
      style={{
        ...baseStyle,
        background: 'linear-gradient(180deg, #f8f4e8 0%, #ece8d8 100%)',
      }}
      onClick={onClick}
    >
      <div style={{ color: suitColor, fontFamily: 'var(--font-body)', fontWeight: 700 }}>
        <div style={{ fontSize, lineHeight: 1, textAlign: 'center' }}>{rankStr}</div>
        <div style={{ fontSize: fontSize * 0.9, textAlign: 'center' }}>{suitStr}</div>
      </div>
    </div>
  )
}
