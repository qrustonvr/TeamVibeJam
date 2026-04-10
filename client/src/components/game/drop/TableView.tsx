import { useEffect } from 'react'
import type { DropPhase, PublicSeat, Card, HandWinner, BrewResult, BrewModifier, ShowdownPlayerInfo } from '@shared/gameTypes'
import { useSound } from '@/hooks/useSound'
import { CardView } from './CardView'
import { CommunityCards } from './CommunityCards'
import { BettingControls } from './BettingControls'
import { DropSelect } from './DropSelect'
import { BrewReveal } from './BrewReveal'
import { ActiveModifier } from './ActiveModifier'
import { OmensDisplay } from './OmensDisplay'
import { Showdown } from './Showdown'
import { TimerBar } from './TimerBar'
import { GameLog } from './GameLog'

interface TableViewProps {
  phase: DropPhase | 'lobby'
  seats: PublicSeat[]
  communityCards: Card[]
  dropZone: Card[]
  pot: number
  currentBetLevel: number
  activeSeatIndex: number
  yourCards: Card[]
  yourSeatIndex: number
  isYourTurn: boolean
  isYourDropTurn: boolean
  actionDeadline: number | null
  handWinners: HandWinner[] | null
  log: string[]
  dropsReceived?: number
  activeBrew?: BrewResult | null
  omens?: BrewModifier[]
  omenMappings?: BrewModifier[][]
  omenVotes?: Record<string, number>
  showdownPlayers?: ShowdownPlayerInfo[] | null
  onAction: (action: string, amount?: number) => void
  onDropCard: (cardIndex: number) => void
  onNextHand?: () => void
}

// Visual positions for 6 seats around the oval.
// Index 3 is always the local player (bottom-center).
// cardsFirst: true → cards render closer to the table center (above the badge for bottom seats).
const SEAT_POSITIONS = [
  { left: '50%', top: '-10%', transform: 'translate(-50%, 0)',     cardsFirst: false }, // 0: top-center
  { left: '87%', top: '26%', transform: 'translate(-50%, -50%)',  cardsFirst: false }, // 1: top-right
  { left: '87%', top: '74%', transform: 'translate(-50%, -50%)',  cardsFirst: true  }, // 2: bot-right
  { left: '50%', top: '100%', transform: 'translate(-50%, -100%)', cardsFirst: true  }, // 3: bottom (you)
  { left: '13%', top: '74%', transform: 'translate(-50%, -50%)',  cardsFirst: true  }, // 4: bot-left
  { left: '13%', top: '26%', transform: 'translate(-50%, -50%)',  cardsFirst: false }, // 5: top-left
] as const

// The visual slot indices used for opponents (everything except slot 3)
const OPPONENT_SLOTS = [0, 1, 2, 4, 5] as const

const ACTION_COLORS: Record<string, string> = {
  fold: '#ef4444',
  check: '#6b7280',
  call: '#22c55e',
  raise: 'var(--gold)',
  'all-in': '#a855f7',
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EmptySeat({ cardsFirst }: { cardsFirst: boolean }) {
  const badge = (
    <div style={{
      padding: '3px 10px',
      borderRadius: 4,
      background: 'rgba(0,0,0,0.2)',
      border: '1px dashed rgba(255,255,255,0.1)',
      fontFamily: 'var(--font-body)',
      fontSize: 10,
      color: 'rgba(255,255,255,0.2)',
      whiteSpace: 'nowrap' as const,
      minWidth: 72,
      textAlign: 'center' as const,
    }}>
      Empty
    </div>
  )

  const cards = (
    <div style={{ display: 'flex', gap: 3, opacity: 0.2 }}>
      <CardView card={null} faceDown small />
      <CardView card={null} faceDown small />
      <CardView card={null} faceDown small />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {cardsFirst ? <>{cards}{badge}</> : <>{badge}{cards}</>}
    </div>
  )
}

interface SeatBlockProps {
  seat: PublicSeat
  isActive: boolean
  cardsFirst: boolean
  showOmaha?: boolean
}

function SeatBlock({ seat, isActive, cardsFirst, showOmaha = false }: SeatBlockProps) {
  const dimmed = seat.folded || !seat.isConnected

  const badge = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      opacity: dimmed ? 0.4 : 1,
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        padding: '3px 8px',
        borderRadius: 4,
        background: isActive ? 'rgba(212,175,55,0.2)' : 'rgba(0,0,0,0.5)',
        border: isActive ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.15)',
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        color: '#e5e7eb',
        whiteSpace: 'nowrap' as const,
        boxShadow: isActive ? '0 0 12px rgba(212,175,55,0.3)' : 'none',
        transition: 'all 0.3s',
      }}>
        {seat.displayName}
        {!seat.isConnected && <span style={{ color: '#ef4444', marginLeft: 4 }}>●</span>}
        {seat.isConnected && isActive && <span style={{ marginLeft: 4 }}>●</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--gold-dim)' }}>
        ◆ {seat.stack}
      </div>
      {seat.currentBet > 0 && (
        <div style={{ fontSize: 10, color: '#a3e635', fontFamily: 'var(--font-body)' }}>
          Bet: {seat.currentBet}
        </div>
      )}
      {seat.lastAction && (
        <div style={{
          padding: '1px 6px',
          borderRadius: 3,
          background: ACTION_COLORS[seat.lastAction] ?? 'rgba(255,255,255,0.2)',
          fontSize: 9,
          fontFamily: 'var(--font-body)',
          color: '#000',
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: 1,
        }}>
          {seat.lastAction}
        </div>
      )}
      {showOmaha && (
        <div style={{
          padding: '1px 5px', borderRadius: 3,
          background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.6)',
          fontSize: 8, fontFamily: 'var(--font-body)', color: '#c084fc',
          fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const,
        }}>
          OMAHA
        </div>
      )}
    </div>
  )

  const cards = (
    <div style={{ display: 'flex', gap: 3, opacity: dimmed ? 0.4 : 1, transition: 'opacity 0.3s' }}>
      {Array.from({ length: seat.cardCount }).map((_, i) => (
        <CardView key={i} card={null} faceDown small />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {cardsFirst ? <>{cards}{badge}</> : <>{badge}{cards}</>}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function TableView({
  phase, seats, communityCards, dropZone, pot, currentBetLevel,
  activeSeatIndex, yourCards, yourSeatIndex, isYourTurn, isYourDropTurn,
  actionDeadline, handWinners, log,
  dropsReceived = 0,
  activeBrew,
  omens = [],
  omenMappings = [],
  omenVotes,
  showdownPlayers,
  onAction, onDropCard, onNextHand,
}: TableViewProps) {
  const mySeat = seats.find(s => s.seatIndex === yourSeatIndex)
  const otherSeats = seats.filter(s => s.seatIndex !== yourSeatIndex)
  const isBettingPhase = ['betting_1','betting_2','betting_3','betting_4','betting_5'].includes(phase)
  const isDropPhase = phase === 'drop'
  const isBrewReveal = phase === 'brew_reveal'
  const isShowdown = phase === 'showdown' || phase === 'payout'
  const isOmensReveal = phase === 'omens-reveal'
  // Post-drop phases: show OMAHA badge when a player still has 3 cards from brew effects
  const isPostDrop = ['brew_reveal','betting_3','turn','betting_4','river','betting_5','showdown','payout'].includes(phase)
  const activeSeat = seats.find(s => s.seatIndex === activeSeatIndex)
  const totalDroppers = seats.filter(s => !s.folded).length
  const isBlackout = activeBrew?.modifier === 'blackout'
  const isFireSale = activeBrew?.modifier === 'fire-sale'
  const isMyTurnActive = mySeat?.seatIndex === activeSeatIndex

  const { play, preload } = useSound()
  useEffect(() => { preload('your-turn', '/TeamVibeJam/audio/your-turn.wav') }, [preload])
  useEffect(() => { preload('drop-card', '/TeamVibeJam/audio/drop-card.wav') }, [preload])
  useEffect(() => { if (isYourTurn || isYourDropTurn) play('your-turn') }, [isYourTurn, isYourDropTurn, play])

  const handleDropCard = (cardIndex: number) => { play('drop-card'); onDropCard(cardIndex) }

  return (
    <div style={{
      width: '100%',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      position: 'relative',
      outline: isFireSale ? '2px solid #9333ea' : 'none',
      outlineOffset: -2,
      boxShadow: isFireSale ? 'inset 0 0 30px rgba(147,51,234,0.2)' : 'none',
      borderRadius: 12,
    }}>

      {/* ── Oval table + all seats ────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: 520 }}>

        {/* Oval felt surface */}
        <div style={{
          position: 'absolute',
          left: '13%', right: '13%', top: '12%', bottom: '12%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #2a0808 0%, #160404 45%, #080202 100%)',
          border: '10px solid #3a0a0a',
          boxShadow: [
            '0 0 0 2px #7a1a1a',
            '0 0 0 4px #1a0404',
            'inset 0 0 80px rgba(0,0,0,0.6)',
            '0 12px 48px rgba(0,0,0,0.8)',
          ].join(', '),
          overflow: 'hidden',
        }}>
          {/* Felt noise overlay */}
          <div className="table-felt-noise absolute inset-0 pointer-events-none" />

          {/* Inner rim */}
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />

          {/* Center: community cards, drop zone, pot, modifiers, overlays */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 60 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <CommunityCards
                  communityCards={communityCards}
                  dropZone={dropZone}
                  pot={pot}
                  turnIsHidden={isBlackout}
                />
                {activeBrew && <ActiveModifier brew={activeBrew} />}
              </div>

              {isDropPhase && (
                <DropSelect
                  cards={yourCards}
                  hasDropped={mySeat?.hasDropped ?? false}
                  dropsReceived={dropsReceived}
                  totalDroppers={totalDroppers}
                  deadline={isYourDropTurn ? actionDeadline : null}
                  onDrop={handleDropCard}
                  omenMappings={omenMappings[yourSeatIndex]}
                />
              )}

              {isBrewReveal && activeBrew && (
                <BrewReveal
                  brew={activeBrew}
                  dropZone={dropZone}
                  omens={omens}
                  omenVotes={omenVotes}
                />
              )}

              {isShowdown && handWinners && handWinners.length > 0 && (
                <Showdown
                  winners={handWinners}
                  seats={seats}
                  activeBrew={activeBrew}
                  allPlayers={showdownPlayers ?? undefined}
                  onPlayAgain={onNextHand}
                />
              )}
            </div>
          </div>
        </div>

        {/* Opponent seats (visual slots 0, 1, 2, 4, 5) */}
        {OPPONENT_SLOTS.map((visualSlot, arrayIdx) => {
          const seat = otherSeats[arrayIdx] ?? null
          const pos = SEAT_POSITIONS[visualSlot]
          return (
            <div
              key={visualSlot}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                transform: pos.transform,
              }}
            >
              {seat
                ? <SeatBlock seat={seat} isActive={seat.seatIndex === activeSeatIndex} cardsFirst={pos.cardsFirst} showOmaha={isPostDrop && seat.cardCount >= 3} />
                : <EmptySeat cardsFirst={pos.cardsFirst} />
              }
            </div>
          )
        })}

        {/* Local player seat slot 3 — empty, badge moved below oval */}
      </div>

      {/* ── Controls panel + log — anchored to bottom ───────────── */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Omens display */}
        {(isOmensReveal || omens.length > 0) && !activeBrew && !isBrewReveal && !isShowdown && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <OmensDisplay omens={omens} />
          </div>
        )}

        {/* Player badge + stack */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            padding: '3px 8px',
            borderRadius: 4,
            background: isMyTurnActive ? 'rgba(212,175,55,0.2)' : 'rgba(0,0,0,0.5)',
            border: isMyTurnActive ? '1px solid var(--gold)' : '1px solid rgba(212,175,55,0.3)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--gold)',
            whiteSpace: 'nowrap' as const,
            boxShadow: isMyTurnActive ? '0 0 12px rgba(212,175,55,0.3)' : 'none',
            transition: 'all 0.3s',
          }}>
            ⭐ You
          </div>
          {mySeat && (
            <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-body)', fontSize: 11 }}>
              <span style={{ color: 'var(--gold-dim)' }}>◆ {mySeat.stack}</span>
              {mySeat.currentBet > 0 && (
                <span style={{ color: '#a3e635' }}>Bet: {mySeat.currentBet}</span>
              )}
            </div>
          )}
          {mySeat?.exposedCard && (
            <span style={{ color: '#c084fc', fontSize: 10, fontFamily: 'var(--font-body)' }}>
              🗡️ {mySeat.exposedCard.display}
            </span>
          )}
        </div>

        {/* Player's hole cards on PlayerTable */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {(() => {
            const hasDropped = mySeat?.hasDropped ?? false
            // Flat card slot left-edges (px) inside a 480×270 container
            // Slot x-centres at 35%, 50%, 65% → left = centre − 26 (half of 52px card width)
            const CARD_W = 52, CARD_H = 76
            const allSlotX = [142, 214, 286] as const
            const slotX: number[] =
              yourCards.length <= 1 ? [214] :
              yourCards.length === 2 ? [142, 286] :
              [142, 214, 286]
            // Slot y-centre at 65% of 270px = 175px → top = 175 − 38 (half of 76px)
            const cardTop = 137
            return (
              <div style={{ position: 'relative', width: 480, height: 270, flexShrink: 0, maxWidth: '100%' }}>
                <img
                  src="/TeamVibeJam/assets/PlayerTable.png"
                  draggable={false}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    mixBlendMode: 'lighten',
                    pointerEvents: 'none', userSelect: 'none',
                  }}
                />
                {yourCards.map((card, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: slotX[i] ?? allSlotX[1],
                      top: cardTop,
                      width: CARD_W,
                      height: CARD_H,
                      cursor: isDropPhase && !hasDropped && isYourDropTurn ? 'pointer' : 'default',
                    }}
                  >
                    <CardView
                      card={card}
                      onClick={isDropPhase && !hasDropped && isYourDropTurn ? () => handleDropCard(i) : undefined}
                      selected={false}
                    />
                  </div>
                ))}
                {isDropPhase && !hasDropped && (
                  <div style={{
                    position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center',
                    fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-body)',
                    letterSpacing: 1, textTransform: 'uppercase',
                    animation: 'glow 2.5s ease-in-out infinite',
                  }}>
                    Select a card to drop
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* minHeight reserves space for betting controls so the panel never collapses between phases */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 56 }}>
          <div style={{ width: '100%', maxWidth: 300 }}>
            {isYourTurn ? (
              <TimerBar deadline={actionDeadline} totalMs={30_000} />
            ) : (
              <div style={{ height: 4 }} />
            )}
          </div>
          {isBettingPhase && (
            <BettingControls
              isYourTurn={isYourTurn}
              pot={pot}
              currentBetLevel={currentBetLevel}
              myCurrentBet={mySeat?.currentBet ?? 0}
              myStack={mySeat?.stack ?? 0}
              activeSeatName={activeSeat?.displayName}
              activeBrew={activeBrew}
              onAction={onAction}
            />
          )}
        </div>

        {/* Game log */}
        <GameLog messages={log} />
      </div>
    </div>
  )
}
