export type DropPhase =
  | 'lobby'
  | 'deal'
  | 'betting_1'      // pre-flop
  | 'flop'
  | 'betting_2'      // post-flop
  | 'turn'           // community turn + 1 hole card dealt to each player
  | 'drop_1'         // simultaneous drop at turn
  | 'drop_1_reveal'
  | 'betting_3'      // turn betting
  | 'river'          // community river + 1 hole card dealt to each player
  | 'drop_2'         // simultaneous drop at river
  | 'drop_2_reveal'
  | 'betting_4'      // river betting
  | 'showdown'
  | 'payout'

export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in'

export type AIPersonality = 'tight' | 'aggressive' | 'balanced'

export interface Card {
  rankIndex: number   // 0 = 2, 1 = 3, ... 8 = 10, 9 = J, 10 = Q, 11 = K, 12 = A
  suit: string        // ♠ ♥ ♦ ♣
  display: string     // e.g. "A♠", "10♦"
}

export interface PublicSeat {
  seatIndex: number
  displayName: string
  stack: number
  currentBet: number
  totalBetThisHand: number
  folded: boolean
  allIn: boolean
  isConnected: boolean
  hasDropped: boolean   // during drop phase: have they chosen?
  cardCount: number     // 3 before drop, 2 after
  lastAction: PlayerActionType | null
}

export interface PrivateSeat extends PublicSeat {
  holeCards: [Card, Card, Card] | [Card, Card]
}

export interface RoomSnapshot {
  roomCode: string
  phase: DropPhase
  seats: PublicSeat[]
  communityCards: Card[]
  dropZone: Card[]
  pot: number
  currentBetLevel: number
  activeSeatIndex: number   // whose turn (-1 = none)
  dealerIndex: number
  roundNumber: number
  yourCards: Card[]         // this player's hole cards
  yourSeatIndex: number
  actionDeadline: number | null  // unix ms
  hostSeatIndex: number
}

export interface HandWinner {
  seatIndex: number
  handName: string
  score: number
  potWon: number
  holeCards: Card[]
  bestHandCards: Card[]
}

export interface SidePot {
  amount: number
  eligibleSeats: number[]
}

export interface EvaluatedHand {
  score: number
  name: string
  cards: Card[]
}
