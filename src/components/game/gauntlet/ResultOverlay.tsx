import { useEffect, useState } from 'react'
import { GauntletState } from '@/types/gauntlet'
import { GAME_CONFIG } from '@/utils/constants'
import { Button } from '@/components/ui/Button'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { PlayingCard } from './PlayingCard'

interface ResultOverlayProps {
  gs: GauntletState
  isMaster: boolean
  onPlayAgain: () => void
}

function CoinRain() {
  const coins = Array.from({ length: 12 }, (_, i) => i)
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {coins.map(i => (
        <div
          key={i}
          className="absolute animate-coin-rain font-body font-bold"
          style={{
            left: `${10 + (i * 7.5) % 85}%`,
            top: '-20px',
            '--dur': `${0.7 + (i * 0.13) % 0.6}s`,
            '--delay': `${(i * 0.09) % 0.5}s`,
            fontSize: `${14 + (i % 3) * 4}px`,
            color: 'var(--gold)',
          } as React.CSSProperties}
        >
          ◆
        </div>
      ))}
    </div>
  )
}

function ParticleExplosion() {
  const count = 32
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 360
        const dist = 80 + (i % 4) * 40
        const tx = Math.round(Math.cos((angle * Math.PI) / 180) * dist)
        const ty = Math.round(Math.sin((angle * Math.PI) / 180) * dist)
        const dur = 0.9 + (i % 5) * 0.15
        const rot = (i % 6) * 60
        return (
          <div
            key={i}
            className="absolute animate-particle font-body font-bold"
            style={{
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              '--dur': `${dur}s`,
              '--rot': `${rot}deg`,
              fontSize: `${10 + (i % 4) * 5}px`,
              color: i % 3 === 0 ? 'var(--gold)' : i % 3 === 1 ? '#fff' : '#d4af37aa',
            } as React.CSSProperties}
          >
            {i % 2 === 0 ? '◆' : '★'}
          </div>
        )
      })}
    </div>
  )
}

export function ResultOverlay({ gs, isMaster, onPlayAgain }: ResultOverlayProps) {
  const [showButton, setShowButton] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const isLoss = gs.phase === 'lost'
  const isCollected = gs.phase === 'collected'

  const delay = isMaster ? 2800 : isLoss ? 1400 : 600

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 80)
    const t2 = setTimeout(() => setShowButton(true), delay)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [delay])

  const killerCard = isLoss && gs.gauntletCards[gs.currentPosition]?.faceUp
    ? gs.gauntletCards[gs.currentPosition]
    : null

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center"
      style={{
        background: isMaster
          ? 'rgba(0,0,0,0.88)'
          : isLoss
          ? 'rgba(0,0,0,0.88)'
          : 'rgba(0,0,0,0.84)',
      }}
    >
      {/* Gold shimmer sweep for collect */}
      {isCollected && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <div
            className="absolute inset-y-0 w-1/3 animate-gold-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
            }}
          />
        </div>
      )}

      {/* Particles for master */}
      {isMaster && <ParticleExplosion />}
      {isCollected && <CoinRain />}

      {showContent && (
        <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
          {/* Main headline */}
          {isMaster ? (
            <div className="flex flex-col items-center gap-2">
              <span
                className="font-body text-3xl animate-crown-bounce"
                style={{ lineHeight: 1 }}
              >
                👑
              </span>
              <h1
                className="font-display animate-master-slam uppercase tracking-[0.2em]"
                style={{
                  fontSize: 'clamp(22px, 4vw, 36px)',
                  color: 'var(--gold)',
                  textShadow: '0 0 40px rgba(212,175,55,0.8), 0 0 80px rgba(212,175,55,0.4)',
                }}
              >
                GAUNTLET MASTER
              </h1>
            </div>
          ) : isLoss ? (
            <h1
              className="font-display animate-slide-in-up uppercase"
              style={{
                fontSize: 'clamp(16px, 3vw, 26px)',
                color: '#ef4444',
                textShadow: '0 0 24px rgba(239,68,68,0.6)',
                letterSpacing: '0.12em',
              }}
            >
              THE GAUNTLET CLAIMS ANOTHER
            </h1>
          ) : (
            <h1
              className="font-display animate-slide-in-up uppercase tracking-[0.2em]"
              style={{
                fontSize: 'clamp(20px, 3.5vw, 32px)',
                color: 'var(--gold)',
              }}
            >
              WELL PLAYED
            </h1>
          )}

          {/* Loss: champion vs killer */}
          {isLoss && gs.playerCard && killerCard && (
            <div className="flex items-center gap-4 animate-fade-in">
              <div className="flex flex-col items-center gap-1">
                <span className="font-body text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>YOUR CHAMPION</span>
                <PlayingCard card={gs.playerCard} flipped={true} highlighted />
              </div>
              <span
                className="font-display text-xl"
                style={{ color: '#dc2626' }}
              >
                VS
              </span>
              <div className="flex flex-col items-center gap-1">
                <span className="font-body text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>DEFEATED BY</span>
                <PlayingCard card={killerCard} flipped={true} danger />
              </div>
            </div>
          )}

          {/* Payout / loss amount */}
          <div className="flex flex-col items-center gap-1 animate-fade-in">
            {isLoss ? (
              <>
                <span className="font-body text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>LOST</span>
                <span
                  className="font-display text-2xl font-bold tabular-nums"
                  style={{ color: '#ef4444' }}
                >
                  −{GAME_CONFIG.CURRENCY_SYMBOL} {gs.baseBet.toLocaleString()}
                </span>
              </>
            ) : (
              <>
                <span className="font-body text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {isMaster ? 'TOTAL WINNINGS' : 'COLLECTED'}
                </span>
                <span style={{ color: 'var(--gold)' }}>
                  <AnimatedNumber
                    value={gs.currentPot}
                    prefix={`${GAME_CONFIG.CURRENCY_SYMBOL} `}
                    className="font-display text-2xl font-bold tabular-nums"
                    duration={600}
                  />
                </span>
                {!isMaster && (
                  <span className="font-body text-xs tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Survived {gs.revealedCount} of 5
                  </span>
                )}
              </>
            )}
          </div>

          {/* Play Again */}
          {showButton && (
            <div className="animate-slide-in-up mt-2">
              <Button
                variant={isLoss ? 'danger' : 'primary'}
                onClick={onPlayAgain}
                className="px-8 tracking-[0.25em]"
              >
                PLAY AGAIN
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
