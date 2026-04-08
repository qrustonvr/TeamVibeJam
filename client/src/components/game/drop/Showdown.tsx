import type { PublicSeat, BrewResult } from '@shared/gameTypes'
import type { HandWinner } from '@shared/gameTypes'
import { CardView } from './CardView'

interface ShowdownProps {
  winners: HandWinner[]
  seats: PublicSeat[]
  activeBrew?: BrewResult | null
  onPlayAgain?: () => void
}

export function Showdown({ winners, seats, activeBrew, onPlayAgain }: ShowdownProps) {
  const winnerSeats = winners.map(w => seats.find(s => s.seatIndex === w.seatIndex))
  const hasChainLightning = activeBrew?.modifier === 'chain-lightning'
  const hasBleedingPot = activeBrew?.modifier === 'bleeding-pot'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      borderRadius: 12,
      gap: 16,
      zIndex: 20,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold)',
        fontSize: 28,
        letterSpacing: 4,
        textShadow: '0 0 30px var(--gold)',
        animation: 'glow 2.5s ease-in-out infinite',
      }}>
        SHOWDOWN
      </div>

      {/* Active modifier reminder */}
      {activeBrew && activeBrew.modifier !== 'calm-waters' && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 11,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 1,
        }}>
          {activeBrew.icon} {activeBrew.name} in effect
        </div>
      )}

      {winners.map((winner, i) => {
        const seat = winnerSeats[i]
        return (
          <div key={winner.seatIndex} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '12px 24px',
            border: '1px solid var(--gold)',
            borderRadius: 8,
            background: 'rgba(212,175,55,0.1)',
            boxShadow: '0 0 30px rgba(212,175,55,0.3)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', color: 'var(--gold)',
              fontSize: 18, letterSpacing: 2,
            }}>
              🏆 {seat?.displayName ?? `Player ${winner.seatIndex + 1}`}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)',
              fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
            }}>
              {winner.handName}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {winner.holeCards.map((card, ci) => (
                <CardView key={ci} card={card} small glowing />
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', color: '#22c55e', fontSize: 16 }}>
              +◆ {winner.potWon}
            </div>
          </div>
        )
      })}

      {/* Chain Lightning note */}
      {hasChainLightning && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 12,
          color: '#facc15',
          textAlign: 'center', maxWidth: 240,
        }}>
          ⚡ CHAIN LIGHTNING — highest and lowest stacks swapped!
        </div>
      )}

      {/* Bleeding Pot note */}
      {hasBleedingPot && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 12,
          color: '#f472b6',
          textAlign: 'center', maxWidth: 240,
        }}>
          💔 BLEEDING POT — winner paid 50% to runner-up
        </div>
      )}

      {onPlayAgain && (
        <button
          onClick={onPlayAgain}
          style={{
            marginTop: 8, padding: '8px 24px', borderRadius: 6,
            background: 'rgba(212,175,55,0.2)', border: '1px solid var(--gold)',
            color: 'var(--gold)', fontFamily: 'var(--font-body)', fontSize: 13,
            cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
          }}
        >
          Next Hand
        </button>
      )}
    </div>
  )
}
