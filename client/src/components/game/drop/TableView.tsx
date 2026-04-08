import type { DropPhase, PublicSeat, Card, HandWinner } from '@shared/gameTypes'
import { PlayerSeat } from './PlayerSeat'
import { HoleCards } from './HoleCards'
import { CommunityCards } from './CommunityCards'
import { BettingControls } from './BettingControls'
import { DropSelect } from './DropSelect'
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
  onAction: (action: string, amount?: number) => void
  onDropCard: (cardIndex: number) => void
  onNextHand?: () => void
}

export function TableView({
  phase, seats, communityCards, dropZone, pot, currentBetLevel,
  activeSeatIndex, yourCards, yourSeatIndex, isYourTurn, isYourDropTurn,
  actionDeadline, handWinners, log,
  dropsReceived = 0,
  onAction, onDropCard, onNextHand,
}: TableViewProps) {
  const mySeat = seats.find(s => s.seatIndex === yourSeatIndex)
  const otherSeats = seats.filter(s => s.seatIndex !== yourSeatIndex)
  const isBettingPhase = ['betting_1','betting_2','betting_3','betting_4'].includes(phase)
  const isDropPhase = phase === 'drop'
  const isShowdown = phase === 'showdown' || phase === 'payout'
  const activeSeat = seats.find(s => s.seatIndex === activeSeatIndex)
  const totalDroppers = seats.filter(s => !s.folded).length

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      gap: 8, padding: 12,
      position: 'relative',
    }}>
      {/* Opponent seats */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
        minHeight: 80,
      }}>
        {otherSeats.map(seat => (
          <PlayerSeat
            key={seat.seatIndex}
            seat={seat}
            isActive={seat.seatIndex === activeSeatIndex}
            isYou={false}
          />
        ))}
      </div>

      {/* Center: community + drop zone + pot */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <CommunityCards communityCards={communityCards} dropZone={dropZone} pot={pot} />

        {/* Drop select overlay */}
        {isDropPhase && (
          <DropSelect
            cards={yourCards}
            hasDropped={mySeat?.hasDropped ?? false}
            dropsReceived={dropsReceived}
            totalDroppers={totalDroppers}
            deadline={isYourDropTurn ? actionDeadline : null}
            onDrop={onDropCard}
          />
        )}

        {/* Showdown overlay */}
        {isShowdown && handWinners && handWinners.length > 0 && (
          <Showdown
            winners={handWinners}
            seats={seats}
            onPlayAgain={onNextHand}
          />
        )}
      </div>

      {/* Your seat */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        {/* Your cards */}
        <HoleCards
          cards={yourCards}
          isDropPhase={isDropPhase}
          hasDropped={mySeat?.hasDropped ?? false}
          onDrop={isYourDropTurn ? onDropCard : undefined}
          faceDown={false}
        />

        {/* Your stack */}
        {mySeat && (
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-body)', fontSize: 12 }}>
            <span style={{ color: 'var(--gold-dim)' }}>◆ {mySeat.stack}</span>
            {mySeat.currentBet > 0 && <span style={{ color: '#a3e635' }}>Bet: {mySeat.currentBet}</span>}
          </div>
        )}

        {/* Timer bar */}
        {(isYourTurn || isYourDropTurn) && (
          <div style={{ width: '100%', maxWidth: 300 }}>
            <TimerBar deadline={actionDeadline} totalMs={isYourDropTurn ? 20_000 : 30_000} />
          </div>
        )}

        {/* Betting controls */}
        {isBettingPhase && (
          <BettingControls
            isYourTurn={isYourTurn}
            pot={pot}
            currentBetLevel={currentBetLevel}
            myCurrentBet={mySeat?.currentBet ?? 0}
            myStack={mySeat?.stack ?? 0}
            activeSeatName={activeSeat?.displayName}
            onAction={onAction}
          />
        )}
      </div>

      {/* Game log */}
      <GameLog messages={log} />
    </div>
  )
}
