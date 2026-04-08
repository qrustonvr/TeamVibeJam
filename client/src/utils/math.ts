import { GAME_CONFIG } from './constants'

export function calculatePayout(bet: number, multiplier: number): number {
  return Math.round(bet * multiplier)
}

export function calculateOdds(wins: number, total: number): number {
  if (total === 0) return 0
  return wins / total
}

export function formatCurrency(amount: number): string {
  return `${GAME_CONFIG.CURRENCY_SYMBOL} ${amount.toLocaleString()}`
}

export function clampBet(bet: number): number {
  return Math.max(GAME_CONFIG.MIN_BET, Math.min(GAME_CONFIG.MAX_BET, bet))
}
