export enum GamePhase {
  BETTING = 'BETTING',
  PLAYING = 'PLAYING',
  RESOLVING = 'RESOLVING',
  GAME_OVER = 'GAME_OVER',
}

export type BetType = 'standard' | 'double' | 'split' | 'insurance' | 'side'

export interface Round {
  id: string
  bet: number
  payout: number
  result: 'win' | 'lose' | 'push'
  timestamp: number
}

export interface GameState {
  balance: number
  currentBet: number
  phase: GamePhase
  roundHistory: Round[]
  totalWins: number
  totalLosses: number
  totalPushes: number
}

export type GameAction =
  | { type: 'PLACE_BET'; amount: number }
  | { type: 'CLEAR_BET' }
  | { type: 'WIN'; payout: number }
  | { type: 'LOSE' }
  | { type: 'PUSH' }
  | { type: 'RESET' }
  | { type: 'SET_PHASE'; phase: GamePhase }
