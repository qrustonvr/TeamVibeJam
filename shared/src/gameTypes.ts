// ─── Brew System ─────────────────────────────────────────────────────────────

export type BrewModifier =
  | 'nuke'
  | 'chain-lightning'
  | 'royal-tax'
  | 'underdog'
  | 'bleeding-pot'
  | 'grave-dig'
  | 'jackpot'
  | 'sabotage'
  | 'fire-sale'
  | 'blackout'

export interface BrewResult {
  modifier: BrewModifier
  name: string
  description: string
  icon: string
}

// ─── Phase types ──────────────────────────────────────────────────────────────

export type DropPhase =
  | 'lobby'
  | 'deal'
  | 'omens-reveal'  // brief pre-flop reveal of the 3 omens for this hand
  | 'betting_1'    // pre-flop
  | 'flop'
  | 'betting_2'    // post-flop (BEFORE drop)
  | 'drop'         // simultaneous drop
  | 'brew_reveal'  // modifier revealed + applied
  | 'betting_3'    // post-brew
  | 'turn'
  | 'betting_4'    // turn bet
  | 'river'
  | 'betting_5'    // river/final bet
  | 'showdown'
  | 'payout'

export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in'

export type AIPersonality = 'tight' | 'aggressive' | 'balanced'

// ─── Card ────────────────────────────────────────────────────────────────────

export interface Card {
  rankIndex: number   // 0 = 2, 1 = 3, ... 8 = 10, 9 = J, 10 = Q, 11 = K, 12 = A
  suit: string        // ♠ ♥ ♦ ♣
  display: string     // e.g. "A♠", "10♦"
}

// ─── Seat types ───────────────────────────────────────────────────────────────

export interface PublicSeat {
  seatIndex: number
  displayName: string
  stack: number
  currentBet: number
  totalBetThisHand: number
  folded: boolean
  allIn: boolean
  isConnected: boolean
  hasDropped: boolean     // during drop phase: have they chosen?
  cardCount: number       // 3 before drop, 2 after
  lastAction: PlayerActionType | null
  exposedCard: Card | null  // for Sabotage brew: highest card flipped face-up
  eliminated: boolean     // permanently out of chips after a hand
}

export interface PrivateSeat extends PublicSeat {
  holeCards: [Card, Card, Card] | [Card, Card]
}

// ─── Room snapshot ────────────────────────────────────────────────────────────

export interface RoomSnapshot {
  roomCode: string
  phase: DropPhase
  seats: PublicSeat[]
  communityCards: Card[]
  dropZone: Card[]
  pot: number
  currentBetLevel: number
  activeSeatIndex: number    // whose turn (-1 = none)
  dealerIndex: number
  roundNumber: number
  yourCards: Card[]          // this player's hole cards
  yourSeatIndex: number
  actionDeadline: number | null  // unix ms
  hostSeatIndex: number
  activeBrew: BrewResult | null  // active modifier for current hand
  nextAnteMultiplier: number     // 1 normally, 2 if Royal Tax queued
  turnIsHidden: boolean          // BLACKOUT: turn card dealt face-down
}

// ─── Showdown ─────────────────────────────────────────────────────────────────

export interface HandWinner {
  seatIndex: number
  handName: string
  score: number
  potWon: number
  holeCards: Card[]
  bestHandCards: Card[]
}

export interface ShowdownPlayerInfo {
  seatIndex: number
  handName: string
  score: number
  holeCards: Card[]
  bestHandCards: Card[]
  isWinner: boolean
  potWon: number
  folded: boolean
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
