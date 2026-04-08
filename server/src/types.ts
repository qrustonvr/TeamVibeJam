import type WebSocket from 'ws'
import type { Card, DropPhase, PublicSeat, HandWinner } from '@shared/gameTypes.js'

export interface ServerSeat {
  seatIndex: number
  displayName: string
  stack: number
  currentBet: number
  totalBetThisHand: number
  folded: boolean
  allIn: boolean
  isConnected: boolean
  hasDropped: boolean
  holeCards: [Card, Card, Card] | [Card, Card]
  droppedCard: Card | null
  sessionToken: string
  ws: WebSocket | null
  lastAction: string | null
}

export interface ServerRoomState {
  code: string
  phase: DropPhase
  seats: ServerSeat[]
  deck: Card[]
  communityCards: Card[]
  dropZone: Card[]
  pot: number
  currentBetLevel: number
  activeSeatIndex: number
  dealerIndex: number
  roundNumber: number
  hostSeatIndex: number
  maxPlayers: number
  actionTimer: ReturnType<typeof setTimeout> | null
  lastActivityAt: number
  actionDeadline: number | null
  roundActedSeats: Set<number>
}

export interface BettingAction {
  type: 'fold' | 'check' | 'call' | 'raise' | 'all-in'
  amount?: number
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

export interface ShowdownResult {
  winners: HandWinner[]
}

export function makeDeck(): Card[] {
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
  const suits = ['♠','♥','♦','♣']
  const rankMap: Record<string, number> = {
    '2': 0,'3': 1,'4': 2,'5': 3,'6': 4,'7': 5,'8': 6,'9': 7,'10': 8,'J': 9,'Q': 10,'K': 11,'A': 12
  }
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rankIndex: rankMap[rank], suit, display: rank + suit })
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function seatToPublic(seat: ServerSeat): PublicSeat {
  return {
    seatIndex: seat.seatIndex,
    displayName: seat.displayName,
    stack: seat.stack,
    currentBet: seat.currentBet,
    totalBetThisHand: seat.totalBetThisHand,
    folded: seat.folded,
    allIn: seat.allIn,
    isConnected: seat.isConnected,
    hasDropped: seat.hasDropped,
    cardCount: seat.holeCards.length,
    lastAction: seat.lastAction as (import('@shared/gameTypes.js').PlayerActionType | null),
  }
}
