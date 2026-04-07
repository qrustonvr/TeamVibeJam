export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  rank: Rank
  suit: Suit
  display: string  // e.g. "A♠", "K♥", "10♦"
  faceUp: boolean
}

export type GauntletPhase =
  | 'betting'
  | 'dealing'
  | 'gauntlet'
  | 'won'
  | 'lost'
  | 'collected'
  | 'gauntlet-master'

export type CardResult = 'win' | 'lose' | 'clash-win' | 'clash-lose' | null

export interface GauntletState {
  phase: GauntletPhase
  playerCard: Card | null
  gauntletCards: Card[]       // Always 5 cards once dealt
  currentPosition: number     // 0-4, which gauntlet card is next
  currentPot: number          // Running pot value
  baseBet: number
  result: CardResult
  revealedCount: number       // How many gauntlet cards have been flipped
}

export interface RoundResult {
  champion: Card
  gauntletCards: Card[]
  bet: number
  cardsBeaten: number         // 0-5
  outcome: 'loss' | 'collected' | 'gauntlet-master'
  payout: number
}

export interface PlayerStats {
  totalHands: number
  totalWins: number
  totalLosses: number
  totalCollects: number
  gauntletMasters: number
  biggestWin: number
  longestStreak: number
  currentStreak: number
  peakBalance: number
  roundHistory: RoundResult[]
}

export const initialGauntletState: GauntletState = {
  phase: 'betting',
  playerCard: null,
  gauntletCards: [],
  currentPosition: 0,
  currentPot: 0,
  baseBet: 0,
  result: null,
  revealedCount: 0,
}

export const defaultPlayerStats: PlayerStats = {
  totalHands: 0,
  totalWins: 0,
  totalLosses: 0,
  totalCollects: 0,
  gauntletMasters: 0,
  biggestWin: 0,
  longestStreak: 0,
  currentStreak: 0,
  peakBalance: 0,
  roundHistory: [],
}
