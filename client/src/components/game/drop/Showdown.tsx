import { useEffect, useMemo, useRef, useState } from 'react'
import type { PublicSeat, BrewResult, ShowdownPlayerInfo } from '@shared/gameTypes'
import type { HandWinner } from '@shared/gameTypes'
import { CardView } from './CardView'

interface ShowdownProps {
  winners: HandWinner[]
  seats: PublicSeat[]
  activeBrew?: BrewResult | null
  allPlayers?: ShowdownPlayerInfo[]
  onPlayAgain?: () => void
}

type Stage = 'reveal' | 'label' | 'spotlight' | 'winner' | 'done'

export function Showdown({ winners, seats, activeBrew, allPlayers, onPlayAgain }: ShowdownProps) {
  const [stage, setStage] = useState<Stage>('reveal')
  const [revealedCount, setRevealedCount] = useState(0)
  const [flash, setFlash] = useState(false)

  const hasChainLightning = activeBrew?.modifier === 'chain-lightning'
  const hasBleedingPot   = activeBrew?.modifier === 'bleeding-pot'

  // Lock the player list the first time it is non-empty so re-renders don't
  // restart the sequence or skip stages when props update mid-animation.
  const lockedRef = useRef<ShowdownPlayerInfo[] | null>(null)
  const candidatePlayers = useMemo(() => {
    if (allPlayers && allPlayers.length > 0) {
      return allPlayers.filter(p => !p.folded).sort((a, b) => b.score - a.score)
    }
    return winners.map(w => ({
      seatIndex:     w.seatIndex,
      handName:      w.handName,
      score:         w.score,
      holeCards:     w.holeCards,
      bestHandCards: w.bestHandCards,
      isWinner:      true,
      potWon:        w.potWon,
      folded:        false,
    } satisfies ShowdownPlayerInfo))
  }, [allPlayers, winners])

  if (lockedRef.current === null && candidatePlayers.length > 0) {
    lockedRef.current = candidatePlayers
  }
  const nonFolded = lockedRef.current ?? candidatePlayers

  // Keep a stable ref to onPlayAgain so the timer chain (keyed on playerCount)
  // always calls the latest callback without needing it in deps.
  const onPlayAgainRef = useRef(onPlayAgain)
  useEffect(() => { onPlayAgainRef.current = onPlayAgain }, [onPlayAgain])

  // ── Single sequential timer chain ──────────────────────────────────────────
  // We run one master effect keyed only on the locked player count so it never
  // restarts due to prop churn.
  const playerCount = nonFolded.length
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (playerCount === 0) return

    const ts = timerRefs.current
    // Clear any previous timers
    ts.forEach(clearTimeout)
    ts.length = 0

    const REVEAL_INTERVAL = 600   // ms per card flip
    const AFTER_REVEAL    = 800   // pause after last flip
    const LABEL_HOLD      = 2000  // show hand names
    const SPOTLIGHT_HOLD  = 1200  // losers dim
    const WINNER_HOLD     = 4000  // winner celebration
    const AUTO_NEXT       = 5000  // auto-advance after winner is shown

    let elapsed = 0

    // Stagger reveals
    for (let i = 0; i < playerCount; i++) {
      const idx = i
      elapsed += REVEAL_INTERVAL
      ts.push(setTimeout(() => setRevealedCount(idx + 1), elapsed))
    }

    elapsed += AFTER_REVEAL
    ts.push(setTimeout(() => setStage('label'), elapsed))

    elapsed += LABEL_HOLD
    ts.push(setTimeout(() => setStage('spotlight'), elapsed))

    elapsed += SPOTLIGHT_HOLD
    ts.push(setTimeout(() => {
      setFlash(true)
      setTimeout(() => setFlash(false), 700)
      setStage('winner')
    }, elapsed))

    elapsed += WINNER_HOLD
    ts.push(setTimeout(() => setStage('done'), elapsed))

    // Auto-advance to next hand 5 s after winner is revealed
    elapsed += AUTO_NEXT
    ts.push(setTimeout(() => onPlayAgainRef.current?.(), elapsed))

    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerCount])

  const winnerSet    = new Set(winners.map(w => w.seatIndex))
  const isSpotlit    = stage === 'spotlight' || stage === 'winner' || stage === 'done'
  const isWinnerStage = stage === 'winner' || stage === 'done'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(6px)',
      borderRadius: 12,
      gap: 10,
      overflowY: 'auto',
      padding: '12px 8px',
    }}>
      <style>{`
        @keyframes winnerGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.25); }
          50%       { box-shadow: 0 0 60px rgba(212,175,55,1),   0 0 120px rgba(212,175,55,0.6); }
        }
        @keyframes winnerPulse {
          0%   { transform: scale(1.04); }
          15%  { transform: scale(1.08); }
          35%  { transform: scale(1.04); }
          55%  { transform: scale(1.07); }
          75%  { transform: scale(1.04); }
          100% { transform: scale(1.04); }
        }
        @keyframes cardReveal {
          from { transform: rotateY(90deg) scale(0.8); opacity: 0; }
          to   { transform: rotateY(0deg)  scale(1);   opacity: 1; }
        }
        @keyframes flashIn {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes crownDrop {
          0%   { transform: translateY(-40px) scale(1.4); opacity: 0; }
          60%  { transform: translateY(4px)   scale(0.95); opacity: 1; }
          80%  { transform: translateY(-3px)  scale(1.02); }
          100% { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        @keyframes potPop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>

      {/* Gold flash when winner is revealed */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(212,175,55,0.35)',
          borderRadius: 12,
          animation: 'flashIn 0.7s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}

      {/* Title */}
      <div style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold)',
        fontSize: isWinnerStage ? 28 : 24,
        letterSpacing: 4,
        textShadow: isWinnerStage
          ? '0 0 40px var(--gold), 0 0 80px rgba(212,175,55,0.4)'
          : '0 0 30px var(--gold)',
        animation: 'glow 2.5s ease-in-out infinite',
        transition: 'font-size 0.4s ease, text-shadow 0.4s ease',
      }}>
        {isWinnerStage ? '✦ SHOWDOWN ✦' : 'SHOWDOWN'}
      </div>

      {activeBrew && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 11,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 1,
        }}>
          {activeBrew.icon} {activeBrew.name} in effect
        </div>
      )}

      {/* 2-column grid of hands */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%', maxWidth: 560 }}>
        {nonFolded.map((player, idx) => {
          const isRevealed  = idx < revealedCount
          const isWinner    = winnerSet.has(player.seatIndex)
          const isDimmed    = isSpotlit && !isWinner
          const seatName    = seats.find(s => s.seatIndex === player.seatIndex)?.displayName
            ?? `Player ${player.seatIndex + 1}`
          const potWon      = player.potWon > 0 ? player.potWon
            : winners.find(w => w.seatIndex === player.seatIndex)?.potWon ?? 0
          const bestSet     = new Set(player.bestHandCards.map(c => c.display))

          return (
            <div
              key={player.seatIndex}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '6px 10px',
                borderRadius: 8,
                border: isWinner && isSpotlit
                  ? '1px solid var(--gold)'
                  : isWinner
                    ? '1px solid rgba(212,175,55,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                background: isWinner && isWinnerStage
                  ? 'rgba(212,175,55,0.12)'
                  : 'rgba(0,0,0,0.3)',
                opacity: isDimmed ? 0.28 : 1,
                transition: 'all 0.6s ease',
                animation: isWinner && isWinnerStage
                  ? 'winnerGlow 1.8s ease-in-out infinite, winnerPulse 1.4s ease-in-out infinite'
                  : 'none',
                filter: isDimmed ? 'grayscale(0.9)' : 'none',
              }}
            >
              {/* Name + pot won */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  color: isWinner ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                  fontSize: isWinner && isWinnerStage ? 15 : 13,
                  letterSpacing: 1,
                  transition: 'font-size 0.4s ease',
                }}>
                  {isWinner && isWinnerStage && (
                    <span style={{
                      animation: 'crownDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                      display: 'inline-block', marginRight: 4,
                    }}>
                      🏆
                    </span>
                  )}
                  {seatName}
                </div>
                {isWinner && potWon > 0 && isWinnerStage && (
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 13, fontWeight: 700,
                    background: 'linear-gradient(90deg, #22c55e, #86efac, #22c55e)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'potPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both, shimmer 2s linear infinite',
                  }}>
                    +◆{potWon}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', gap: 4 }}>
                {player.holeCards.map((card, ci) => (
                  <div key={ci} style={{
                    animation: isRevealed ? `cardReveal 0.35s ease ${ci * 0.12}s both` : 'none',
                    opacity: isRevealed ? 1 : 0,
                  }}>
                    <CardView
                      card={isRevealed ? card : null}
                      faceDown={!isRevealed}
                      small
                      glowing={isRevealed && isWinner && isWinnerStage && bestSet.has(card.display)}
                    />
                  </div>
                ))}
              </div>

              {/* Hand name */}
              {(stage === 'label' || isSpotlit) && isRevealed && (
                <div style={{
                  fontFamily: 'var(--font-body)',
                  color: isWinner && isWinnerStage
                    ? 'var(--gold)'
                    : isWinner
                      ? 'rgba(212,175,55,0.7)'
                      : 'rgba(255,255,255,0.4)',
                  fontSize: isWinner && isWinnerStage ? 12 : 10,
                  letterSpacing: 1, textTransform: 'uppercase',
                  fontWeight: isWinner ? 700 : 400,
                  transition: 'all 0.4s ease',
                  textShadow: isWinner && isWinnerStage ? '0 0 12px var(--gold)' : 'none',
                }}>
                  {player.handName}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Brew notes */}
      {stage !== 'reveal' && (
        <>
          {hasChainLightning && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#facc15', textAlign: 'center', maxWidth: 280 }}>
              ⚡ CHAIN LIGHTNING — highest and lowest stacks swapped!
            </div>
          )}
          {hasBleedingPot && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#f472b6', textAlign: 'center', maxWidth: 280 }}>
              💔 BLEEDING POT — winner paid 50% to runner-up
            </div>
          )}
        </>
      )}

    </div>
  )
}
