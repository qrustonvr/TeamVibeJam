import { useEffect, useState } from 'react'
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

type Stage = 'reveal' | 'label' | 'spotlight' | 'done'

export function Showdown({ winners, seats, activeBrew, allPlayers, onPlayAgain }: ShowdownProps) {
  const [stage, setStage] = useState<Stage>('reveal')
  const [revealedCount, setRevealedCount] = useState(0)
  const hasChainLightning = activeBrew?.modifier === 'chain-lightning'
  const hasBleedingPot = activeBrew?.modifier === 'bleeding-pot'

  // Players to show: use allPlayers for rich cinematic, fallback to winner-only
  const showAll = allPlayers && allPlayers.length > 0
  const nonFolded = showAll
    ? allPlayers.filter(p => !p.folded).sort((a, b) => b.score - a.score)
    : winners.map(w => ({
        seatIndex: w.seatIndex,
        handName: w.handName,
        score: w.score,
        holeCards: w.holeCards,
        bestHandCards: w.bestHandCards,
        isWinner: true,
        potWon: w.potWon,
        folded: false,
      } satisfies ShowdownPlayerInfo))

  // Staggered card reveals: 0.4s per player
  useEffect(() => {
    if (stage !== 'reveal') return
    if (revealedCount >= nonFolded.length) {
      const t = setTimeout(() => setStage('label'), 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRevealedCount(c => c + 1), 400)
    return () => clearTimeout(t)
  }, [stage, revealedCount, nonFolded.length])

  // label → spotlight after 1.5s
  useEffect(() => {
    if (stage !== 'label') return
    const t = setTimeout(() => setStage('spotlight'), 1500)
    return () => clearTimeout(t)
  }, [stage])

  // spotlight → done after 2s
  useEffect(() => {
    if (stage !== 'spotlight') return
    const t = setTimeout(() => setStage('done'), 2000)
    return () => clearTimeout(t)
  }, [stage])

  const winnerSet = new Set(winners.map(w => w.seatIndex))

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      borderRadius: 12,
      gap: 10,
      zIndex: 20,
      overflowY: 'auto',
      padding: '12px 8px',
    }}>
      <style>{`
        @keyframes winnerGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.2); }
          50%       { box-shadow: 0 0 40px rgba(212,175,55,0.8), 0 0 80px rgba(212,175,55,0.4); }
        }
        @keyframes cardReveal {
          from { transform: rotateY(90deg) scale(0.8); opacity: 0; }
          to   { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
      `}</style>

      <div style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold)',
        fontSize: 24,
        letterSpacing: 4,
        textShadow: '0 0 30px var(--gold)',
        animation: 'glow 2.5s ease-in-out infinite',
      }}>
        SHOWDOWN
      </div>

      {activeBrew && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 11,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 1,
        }}>
          {activeBrew.icon} {activeBrew.name} in effect
        </div>
      )}

      {/* All non-folded player hands */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 360, alignItems: 'center' }}>
        {nonFolded.map((player, idx) => {
          const isRevealed = idx < revealedCount
          const isWinner = winnerSet.has(player.seatIndex)
          const isSpotlit = stage === 'spotlight' || stage === 'done'
          const isDimmed = isSpotlit && !isWinner
          const seatName = seats.find(s => s.seatIndex === player.seatIndex)?.displayName
            ?? `Player ${player.seatIndex + 1}`
          const potWon = player.potWon > 0 ? player.potWon
            : winners.find(w => w.seatIndex === player.seatIndex)?.potWon ?? 0

          // Highlight best-hand cards vs kickers
          const bestSet = new Set(player.bestHandCards.map(c => c.display))

          return (
            <div
              key={player.seatIndex}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '8px 16px',
                borderRadius: 8,
                border: isWinner && (stage === 'spotlight' || stage === 'done')
                  ? '1px solid var(--gold)'
                  : isWinner
                    ? '1px solid rgba(212,175,55,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                background: isWinner && isSpotlit
                  ? 'rgba(212,175,55,0.1)'
                  : 'rgba(0,0,0,0.3)',
                opacity: isDimmed ? 0.45 : 1,
                transition: 'all 0.6s ease',
                animation: isWinner && isSpotlit ? 'winnerGlow 2s ease-in-out infinite' : 'none',
                filter: isDimmed ? 'grayscale(0.7)' : 'none',
                width: '100%',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  color: isWinner ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                  fontSize: 14, letterSpacing: 1,
                }}>
                  {isWinner && (stage === 'spotlight' || stage === 'done') && '🏆 '}{seatName}
                </div>
                {potWon > 0 && (stage === 'done' || stage === 'spotlight') && (
                  <div style={{
                    fontFamily: 'var(--font-display)', color: '#22c55e', fontSize: 13,
                  }}>
                    +◆{potWon}
                  </div>
                )}
              </div>

              {/* Card row */}
              <div style={{ display: 'flex', gap: 4 }}>
                {player.holeCards.map((card, ci) => (
                  <div key={ci} style={{
                    animation: isRevealed ? `cardReveal 0.35s ease ${ci * 0.1}s both` : 'none',
                    opacity: isRevealed ? 1 : 0,
                  }}>
                    <CardView
                      card={isRevealed ? card : null}
                      faceDown={!isRevealed}
                      small
                      glowing={isRevealed && isWinner && isSpotlit && bestSet.has(card.display)}
                    />
                  </div>
                ))}
              </div>

              {/* Hand label — appears at label stage */}
              {(stage === 'label' || stage === 'spotlight' || stage === 'done') && isRevealed && (
                <div style={{
                  fontFamily: 'var(--font-body)',
                  color: isWinner ? 'var(--gold)' : 'rgba(255,255,255,0.45)',
                  fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
                  animation: 'glow 0.5s ease-out both',
                }}>
                  {player.handName}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Brew effect notes */}
      {stage !== 'reveal' && (
        <>
          {hasChainLightning && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#facc15', textAlign: 'center', maxWidth: 240 }}>
              ⚡ CHAIN LIGHTNING — highest and lowest stacks swapped!
            </div>
          )}
          {hasBleedingPot && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#f472b6', textAlign: 'center', maxWidth: 240 }}>
              💔 BLEEDING POT — winner paid 50% to runner-up
            </div>
          )}
        </>
      )}

      {onPlayAgain && stage === 'done' && (
        <button
          onClick={onPlayAgain}
          style={{
            marginTop: 4, padding: '7px 20px', borderRadius: 6,
            background: 'rgba(212,175,55,0.2)', border: '1px solid var(--gold)',
            color: 'var(--gold)', fontFamily: 'var(--font-body)', fontSize: 12,
            cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
          }}
        >
          Next Hand
        </button>
      )}
    </div>
  )
}
