import { Card } from '@/types/gauntlet'

interface PlayingCardProps {
  card?: Card | null
  highlighted?: boolean   // gold glow
  dimmed?: boolean        // survived/faded
  danger?: boolean        // red glow — killing card
  active?: boolean        // current challenge — pulse
  winFlash?: boolean      // green flash after win
  loseFlash?: boolean     // red flash after lose
  lifted?: boolean        // lift before flip
  flipped?: boolean       // rotateY 180 (back → front)
  size?: 'normal' | 'large'
  animDelay?: number      // seconds, for staggered slide-in
  slideIn?: 'left' | 'right' | 'up' | false
}

const SUIT_COLOR: Record<string, string> = {
  hearts: '#C41E3A',
  diamonds: '#C41E3A',
  spades: '#1A1A2E',
  clubs: '#1A1A2E',
}

export function PlayingCard({
  card,
  highlighted = false,
  dimmed = false,
  danger = false,
  active = false,
  winFlash = false,
  loseFlash = false,
  lifted = false,
  flipped = false,
  size = 'normal',
  animDelay = 0,
  slideIn = false,
}: PlayingCardProps) {
  const isLarge = size === 'large'

  // Fluid card sizing via inline clamp-like values
  const w = isLarge ? 'clamp(81px, 10.5vw, 105px)' : 'clamp(70px, 9vw, 90px)'
  const h = isLarge ? 'clamp(117px, 15vw, 150px)' : 'clamp(100px, 13vw, 130px)'
  const rankFont = isLarge ? 'clamp(12px, 1.6vw, 16px)' : 'clamp(10px, 1.4vw, 14px)'
  const suitFont = isLarge ? 'clamp(28px, 3.5vw, 40px)' : 'clamp(22px, 3vw, 34px)'

  let boxShadow = '0 2px 8px rgba(0,0,0,0.6)'
  if (active)      boxShadow = ''      // handled by animate-card-pulse
  if (highlighted) boxShadow = `0 0 0 2px var(--gold), 0 0 16px rgba(212,175,55,0.5), 0 2px 8px rgba(0,0,0,0.6)`
  if (danger)      boxShadow = `0 0 0 2px #dc2626, 0 0 20px rgba(220,38,38,0.6), 0 2px 8px rgba(0,0,0,0.6)`
  if (winFlash)    boxShadow = `0 0 0 2px #16a34a, 0 0 24px rgba(22,163,74,0.7)`
  if (loseFlash)   boxShadow = `0 0 0 2px #dc2626, 0 0 28px rgba(220,38,38,0.8)`

  // Slide-in animation class
  let slideClass = ''
  if (slideIn === 'left')  slideClass = 'animate-slide-in-left'
  if (slideIn === 'right') slideClass = 'animate-slide-in-right'
  if (slideIn === 'up')    slideClass = 'animate-slide-in-up'

  const activeClass = active ? 'animate-card-pulse' : ''
  const winFlashClass = winFlash ? 'animate-win-card' : ''
  const loseFlashClass = loseFlash ? 'animate-lose-card' : ''

  const containerStyle: React.CSSProperties = {
    width: w,
    height: h,
    perspective: '600px',
    flexShrink: 0,
    opacity: dimmed ? 0.55 : 1,
    animationDelay: animDelay > 0 ? `${animDelay}s` : undefined,
  }

  const innerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s ease-in-out',
    transform: `rotateY(${flipped ? 180 : 0}deg) ${lifted ? 'translateY(-10px)' : ''}`,
  }

  const faceSharedStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '6px',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  }

  const color = card ? SUIT_COLOR[card.suit] : '#1A1A2E'
  const rankStr = card ? card.display.slice(0, -1) : ''   // "A", "K", "10", etc.
  const suitStr = card ? card.display.slice(-1) : ''      // "♠", "♥", etc.

  return (
    <div
      className={[slideClass, activeClass, winFlashClass, loseFlashClass].filter(Boolean).join(' ')}
      style={containerStyle}
    >
      <div style={innerStyle}>
        {/* Face-down back */}
        <div
          style={{
            ...faceSharedStyle,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #12122a 100%)',
            backgroundImage: `
              linear-gradient(135deg, #1a1a2e 0%, #12122a 100%),
              repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 3px, transparent 3px, transparent 9px)
            `,
            border: highlighted
              ? '2px solid var(--gold)'
              : '1px solid rgba(212,175,55,0.35)',
            boxShadow: active ? '' : boxShadow,
          }}
        >
          {/* Pattern overlay */}
          <div
            style={{
              position: 'absolute',
              inset: '4px',
              borderRadius: '4px',
              backgroundImage: `repeating-linear-gradient(
                45deg,
                rgba(212,175,55,0.06) 0px,
                rgba(212,175,55,0.06) 2px,
                transparent 2px,
                transparent 8px
              )`,
              border: '1px solid rgba(212,175,55,0.12)',
            }}
          />
          {/* Center diamond motif */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              color: 'rgba(212,175,55,0.25)',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            ◆
          </div>
        </div>

        {/* Face-up front */}
        <div
          style={{
            ...faceSharedStyle,
            background: '#FAFAF5',
            border: highlighted
              ? '2px solid var(--gold)'
              : danger
              ? '2px solid #dc2626'
              : '1px solid rgba(0,0,0,0.15)',
            transform: 'rotateY(180deg)',
            boxShadow: active ? '' : boxShadow,
            overflow: 'hidden',
          }}
        >
          {card && (
            <>
              {/* Top-left rank + suit */}
              <div
                style={{
                  position: 'absolute',
                  top: '5px',
                  left: '6px',
                  color,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  fontSize: rankFont,
                  userSelect: 'none',
                }}
              >
                <div>{rankStr}</div>
                <div>{suitStr}</div>
              </div>
              {/* Center suit */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: suitFont,
                  color,
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {suitStr}
              </div>
              {/* Bottom-right rank + suit (rotated) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '6px',
                  color,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  fontSize: rankFont,
                  transform: 'rotate(180deg)',
                  userSelect: 'none',
                }}
              >
                <div>{rankStr}</div>
                <div>{suitStr}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
