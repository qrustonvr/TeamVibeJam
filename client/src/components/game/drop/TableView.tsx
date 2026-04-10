import { Fragment, useEffect, useRef, useState } from 'react'
import type { DropPhase, PublicSeat, Card, HandWinner, BrewResult, BrewModifier, ShowdownPlayerInfo } from '@shared/gameTypes'
import { useSound } from '@/hooks/useSound'
import { CardView } from './CardView'
import { ChipStack } from './ChipStack'
import { CommunityCards } from './CommunityCards'
import { BettingControls } from './BettingControls'
import { DropSelect } from './DropSelect'
import { BrewReveal } from './BrewReveal'
import { OMEN_IMAGES } from './OmensDisplay'
import { Showdown } from './Showdown'
import { TimerBar } from './TimerBar'
import { GameLog } from './GameLog'
import { BREW_DEFS } from '@/utils/brewResolver'

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
  chatBubbles?: Record<number, string>   // seatIndex → message
  onChat?: (message: string) => void
}

// Per-slot layout: badge hovers above the character's head; cards sit on the
// table surface in front of them. All values are % of the 16:9 container.
const OPPONENT_SLOT_CONFIG: Record<number, {
  badge: { left: string; top: string }
  cards: { left: string; top: string }
}> = {
  0: { badge: { left: '49.5%', top: '5%'  }, cards: { left: '50%',  top: '23%' } }, // top-center
  1: { badge: { left: '66%',  top: '8.5%'}, cards: { left: '63%',  top: '28%' } }, // top-right
  2: { badge: { left: '71.5%',top: '47%' }, cards: { left: '62%',  top: '52%' } }, // bot-right
  4: { badge: { left: '29.5%',top: '47%' }, cards: { left: '38%',  top: '52%' } }, // bot-left
  5: { badge: { left: '33.5%',top: '8.5%'}, cards: { left: '37%',  top: '28%' } }, // top-left
}

// The visual slot indices used for opponents (everything except slot 3)
const OPPONENT_SLOTS = [0, 1, 2, 4, 5] as const

// Character portrait per visual seat slot
const SLOT_PORTRAITS: Record<number, string> = {
  0: '/TeamVibeJam/assets/Char__0000s_0000_char__0000_TopCenter.png',
  1: '/TeamVibeJam/assets/Char__0000s_0005_char__0002_TopRight.png',
  2: '/TeamVibeJam/assets/Char__0000s_0002_char__0005_BotRight.png',
  4: '/TeamVibeJam/assets/Char__0000s_0001_char__0006_BotLeft.png',
  5: '/TeamVibeJam/assets/Char__0000s_0006_char__0001_TopLeft.png',
}
const LOCAL_PORTRAIT = '/TeamVibeJam/assets/Sin.png'

// ── ChatBubble ────────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: string }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '110%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20,8,8,0.95)',
      border: '1px solid var(--gold-dim)',
      borderRadius: 8,
      padding: '5px 9px',
      maxWidth: 180,
      minWidth: 60,
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      color: '#e8ddd8',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
      zIndex: 50,
      boxShadow: '0 2px 12px rgba(0,0,0,0.8)',
      animation: 'chatIn 0.15s ease-out',
      pointerEvents: 'none',
    }}>
      {message}
      {/* Tail */}
      <div style={{
        position: 'absolute',
        bottom: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid var(--gold-dim)',
      }} />
    </div>
  )
}

// ── SeatPortrait — circular portrait with green→red SVG timer ring ────────────
// Used for the local player badge only (opponents use full-canvas overlays).

function SeatPortrait({
  src, size = 64, isActive, deadline, dimmed = false, chatMessage,
}: {
  src: string; size?: number; isActive: boolean; deadline: number | null; dimmed?: boolean; chatMessage?: string
}) {
  const [pct, setPct] = useState(1.0)
  const [activeSince, setActiveSince] = useState<number | null>(null)

  useEffect(() => {
    if (isActive) {
      setActiveSince(prev => prev ?? Date.now())
    } else {
      setActiveSince(null)
      setPct(1.0)
    }
  }, [isActive])

  useEffect(() => {
    const effectiveDeadline = deadline ?? (activeSince ? activeSince + 20_000 : null)
    if (!isActive || !effectiveDeadline) { setPct(1.0); return }
    const tick = () => setPct(Math.max(0, (effectiveDeadline - Date.now()) / 20_000))
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [isActive, deadline, activeSince])

  const STROKE = 3
  const r = (size - STROKE) / 2
  const circ = 2 * Math.PI * r
  const hue = Math.round(pct * 120)
  const ringColor = isActive ? `hsl(${hue}, 90%, 55%)` : 'rgba(255,255,255,0.12)'
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1))

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {chatMessage && <ChatBubble message={chatMessage} />}
      {/* Dark circular backing */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(10,4,4,0.85)' }} />
      <img
        src={src}
        draggable={false}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain',
          objectPosition: 'center top',
          borderRadius: '50%',
          opacity: dimmed ? 0.3 : 1,
        }}
      />
      <svg
        width={size} height={size}
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', pointerEvents: 'none' }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={STROKE} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={STROKE}
          strokeDasharray={circ}
          strokeDashoffset={isActive ? offset : 0}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}


// ── Sub-components ──────────────────────────────────────────────────────────

// Name badge only — floats above the character's head
function SeatNameBadge({ seat, isActive, chatMessage }: {
  seat: PublicSeat; isActive: boolean; showOmaha?: boolean; deadline: number | null; chatMessage?: string
}) {
  const dimmed = seat.folded || !seat.isConnected || seat.eliminated
  return (
    <div style={{
      opacity: dimmed ? 0.4 : 1, transition: 'opacity 0.3s',
      position: 'relative',
    }}>
      {chatMessage && <ChatBubble message={chatMessage} />}
      <div style={{
        padding: '3px 8px', borderRadius: 4,
        background: isActive ? 'rgba(212,175,55,0.2)' : 'rgba(0,0,0,0.55)',
        border: isActive ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.15)',
        fontFamily: 'var(--font-body)', fontSize: 11, color: '#e5e7eb',
        whiteSpace: 'nowrap' as const,
        boxShadow: isActive ? '0 0 12px rgba(212,175,55,0.3)' : 'none',
        transition: 'all 0.3s',
      }}>
        {seat.displayName}
        {!seat.isConnected && <span style={{ color: '#ef4444', marginLeft: 4 }}>●</span>}
      </div>
    </div>
  )
}

// Face-down hole cards — sits on the table in front of the character
function SeatFaceDownCards({ seat }: { seat: PublicSeat }) {
  const dimmed = seat.folded || !seat.isConnected || seat.eliminated
  if (seat.cardCount === 0 || seat.eliminated) return null
  return (
    <div style={{ display: 'flex', opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.3s' }}>
      {Array.from({ length: seat.cardCount }).map((_, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -18 }}>
          <CardView card={null} faceDown small />
        </div>
      ))}
    </div>
  )
}

// ── ChatInput ────────────────────────────────────────────────────────────────

const MAX_CHAT = 140

function ChatInput({ onSend }: { onSend: (msg: string) => void }) {
  const [value, setValue] = useState('')

  const submit = () => {
    const msg = value.trim()
    if (!msg) return
    onSend(msg)
    setValue('')
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="text"
        value={value}
        maxLength={MAX_CHAT}
        placeholder="Say something…"
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        style={{
          flex: 1,
          padding: '6px 10px',
          borderRadius: 4,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(212,175,55,0.25)',
          color: '#e8ddd8',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          outline: 'none',
        }}
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        style={{
          padding: '6px 14px',
          borderRadius: 4,
          background: value.trim() ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${value.trim() ? 'var(--gold-dim)' : 'rgba(255,255,255,0.08)'}`,
          color: value.trim() ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          cursor: value.trim() ? 'pointer' : 'default',
          transition: 'all 0.15s',
          letterSpacing: 1,
        }}
      >
        Send
      </button>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: 9,
        color: value.length > MAX_CHAT * 0.8 ? '#f59e0b' : 'rgba(255,255,255,0.2)',
        minWidth: 28,
        textAlign: 'right',
      }}>
        {MAX_CHAT - value.length}
      </span>
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
  chatBubbles = {},
  onChat,
}: TableViewProps) {
  const mySeat = seats.find(s => s.seatIndex === yourSeatIndex)
  const otherSeats = seats.filter(s => s.seatIndex !== yourSeatIndex)
  const isBettingPhase = ['betting_1','betting_2','betting_3','betting_4','betting_5'].includes(phase)
  const isDropPhase = phase === 'drop'
  const isBrewReveal = phase === 'brew_reveal'
  const isShowdown = phase === 'showdown' || phase === 'payout'

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
  useEffect(() => { preload('betraise', '/TeamVibeJam/audio/betraise.wav') }, [preload])
  useEffect(() => { preload('check', '/TeamVibeJam/audio/check.wav') }, [preload])
  useEffect(() => { preload('fold', '/TeamVibeJam/audio/fold.wav') }, [preload])
  useEffect(() => { if (isYourTurn || isYourDropTurn) play('your-turn') }, [isYourTurn, isYourDropTurn, play])

  // Auto check/fold when turn timer expires
  const onActionRef = useRef(onAction)
  onActionRef.current = onAction
  const autoStateRef = useRef({ currentBetLevel, yourSeatIndex, seats })
  autoStateRef.current = { currentBetLevel, yourSeatIndex, seats }

  useEffect(() => {
    if (!isYourTurn || !actionDeadline) return
    const remaining = actionDeadline - Date.now()
    const fire = () => {
      const { currentBetLevel: lvl, yourSeatIndex: idx, seats: ss } = autoStateRef.current
      const mySeat = ss.find(s => s.seatIndex === idx)
      const canCheck = (mySeat?.currentBet ?? 0) >= lvl
      onActionRef.current(canCheck ? 'check' : 'fold')
    }
    if (remaining <= 0) { fire(); return }
    const t = setTimeout(fire, remaining)
    return () => clearTimeout(t)
  }, [isYourTurn, actionDeadline])

  // Play sounds when opponents act
  const prevLastActions = useRef<Record<number, string | null>>({})
  useEffect(() => {
    for (const seat of seats) {
      if (seat.seatIndex === yourSeatIndex) continue
      const prev = prevLastActions.current[seat.seatIndex]
      const curr = seat.lastAction ?? null
      if (curr !== null && curr !== prev) {
        if (curr === 'fold') play('fold')
        else if (curr === 'check') play('check')
        else play('betraise')
      }
      prevLastActions.current[seat.seatIndex] = curr
    }
  }, [seats, yourSeatIndex, play])

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

      {/* ── Table image + all overlays ───────────────────────────── */}
      {/* Background.png is 2560×1440 (16:9). All seats and cards are
          absolute-positioned using percentages relative to this container. */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>

        {/* ── Layer 1: cave background ── */}
        <img
          src="/TeamVibeJam/assets/Background.png"
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', userSelect: 'none',
          }}
        />

        {/* ── Layer 2: player table — open (tombstones visible) before omen picked,
                closed after brew_reveal and for the rest of the hand ── */}
        <img
          src={['brew_reveal','betting_3','turn','betting_4','river','betting_5','showdown','payout'].includes(phase)
            ? '/TeamVibeJam/assets/PlayerTableClosed.png'
            : '/TeamVibeJam/assets/PlayerTable.png'}
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', userSelect: 'none',
          }}
        />

        {/* ── Layer 3: opponent character art (only for occupied seats) ── */}
        {OPPONENT_SLOTS.map((visualSlot, arrayIdx) => {
          const seat = otherSeats[arrayIdx] ?? null
          const charSrc = SLOT_PORTRAITS[visualSlot]
          if (!seat || !charSrc) return null
          return (
            <img
              key={`char-${visualSlot}`}
              src={charSrc}
              draggable={false}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none', userSelect: 'none',
                opacity: (seat.folded || !seat.isConnected || seat.eliminated) ? 0.25 : 1,
                transition: 'opacity 0.4s',
              }}
            />
          )
        })}

        {/* Community cards + phase overlays — center of table surface */}
        <div style={{
          position: 'absolute',
          top: '32%', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          zIndex: 1,
        }}>
          <div style={{ transform: 'scale(0.85)', transformOrigin: 'center top' }}>
            <CommunityCards
              communityCards={communityCards}
              pot={pot}
              turnIsHidden={isBlackout}
            />
          </div>

        </div>

        {/* Opponent seats (visual slots 0, 1, 2, 4, 5)
            Badge floats above the character's head; cards sit on the table */}
        {OPPONENT_SLOTS.map((visualSlot, arrayIdx) => {
          const seat = otherSeats[arrayIdx] ?? null
          const cfg = OPPONENT_SLOT_CONFIG[visualSlot]
          const isActive = seat?.seatIndex === activeSeatIndex
          return (
            <Fragment key={visualSlot}>
              {/* Name / stack badge — above head */}
              <div style={{
                position: 'absolute',
                left: cfg.badge.left, top: cfg.badge.top,
                transform: 'translate(-50%, -100%)',
                zIndex: 2,
              }}>
                {seat
                  ? <SeatNameBadge
                      seat={seat}
                      isActive={isActive}
                      showOmaha={isPostDrop && seat.cardCount >= 3}
                      deadline={isActive ? actionDeadline : null}
                      chatMessage={chatBubbles[seat.seatIndex]}
                    />
                  : <div style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      fontFamily: 'var(--font-body)', fontSize: 10,
                      color: 'rgba(255,255,255,0.2)',
                    }}>Empty</div>
                }
              </div>
              {/* Face-down cards — on the table */}
              {seat && (
                <div style={{
                  position: 'absolute',
                  left: cfg.cards.left, top: cfg.cards.top,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                }}>
                  <SeatFaceDownCards seat={seat} />
                </div>
              )}
            </Fragment>
          )
        })}

        {/* Local player — portrait + badge, right side of player table */}
        <div style={{
          position: 'absolute',
          left: '78%', top: '74%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          zIndex: 2,
        }}>
          <SeatPortrait
            src={LOCAL_PORTRAIT}
            size={56}
            isActive={isMyTurnActive}
            deadline={isMyTurnActive ? actionDeadline : null}
            chatMessage={chatBubbles[yourSeatIndex]}
          />
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
          {(mySeat?.currentBet ?? 0) > 0 && (
            <ChipStack amount={mySeat!.currentBet} chipSize={24} maxTypes={3} showLabel={false} />
          )}
          {mySeat?.exposedCard && (
            <span style={{ color: '#c084fc', fontSize: 10, fontFamily: 'var(--font-body)' }}>
              🗡️ {mySeat.exposedCard.display}
            </span>
          )}
        </div>

        {/* Gravestone omen icons — shown on the three gravestones when omens are set */}
        {omens.length > 0 && !activeBrew && !isShowdown && omens.slice(0, 3).map((omen, i) => {
          const slotX = [42.5, 50.5, 59][i] ?? 50
          const def = BREW_DEFS[omen]
          const imgSrc = OMEN_IMAGES[omen]
          return (
            <div
              key={omen}
              style={{
                position: 'absolute',
                left: `${slotX}%`,
                top: '67%',
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                pointerEvents: 'none',
              }}
            >
              <img src={imgSrc} alt={def.name} style={{ width: 104, height: 104, objectFit: 'contain' }} />
            </div>
          )
        })}

        {/* Hole cards — overlaid at the card slots visible at the bottom of the image */}
        {(() => {
          const hasDropped = mySeat?.hasDropped ?? false
          // Card slot x-centres as % of image width, y-centre as % of image height
          const slotCentresX =
            yourCards.length <= 1 ? [50] :
            yourCards.length === 2 ? [40, 60] :
            [40, 50, 60]
          const CARD_W = 52, CARD_H = 76
          return yourCards.map((card, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `calc(${slotCentresX[i]}% - ${CARD_W / 2}px)`,
                top: 'calc(82% - 38px)',
                width: CARD_W, height: CARD_H,
                transform: 'perspective(500px) rotateX(-28deg)',
                transformOrigin: 'center bottom',
                cursor: isDropPhase && !hasDropped && isYourDropTurn ? 'pointer' : 'default',
                zIndex: 2,
              }}
            >
              <CardView
                card={card}
                onClick={isDropPhase && !hasDropped && isYourDropTurn ? () => handleDropCard(i) : undefined}
                selected={false}
              />
            </div>
          ))
        })()}

        {/* BrewReveal — full table overlay, must be above all card layers */}
        {isBrewReveal && activeBrew && (
          <BrewReveal
            brew={activeBrew}
            dropZone={dropZone}
            omens={omens}
            omenVotes={omenVotes}
          />
        )}

        {/* Showdown — full table overlay */}
        {isShowdown && handWinners && handWinners.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
            <Showdown
              winners={handWinners}
              seats={seats}
              activeBrew={activeBrew}
              allPlayers={showdownPlayers ?? undefined}
              onPlayAgain={onNextHand}
            />
          </div>
        )}

        {/* DropSelect — positioned over the player card table area */}
        {isDropPhase && (
          <div style={{
            position: 'absolute',
            top: '58%', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}>
            <DropSelect
              cards={yourCards}
              hasDropped={mySeat?.hasDropped ?? false}
              dropsReceived={dropsReceived}
              totalDroppers={totalDroppers}
              deadline={isYourDropTurn ? actionDeadline : null}
              onDrop={handleDropCard}
              omenMappings={omenMappings[yourSeatIndex]}
            />
          </div>
        )}
      </div>

      {/* ── Controls panel + log — below the table image ─────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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

        {/* Chat input */}
        {onChat && <ChatInput onSend={onChat} />}
      </div>
    </div>
  )
}
