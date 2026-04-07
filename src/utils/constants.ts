export const GAME_CONFIG = {
  STARTING_BALANCE: 1000,
  MIN_BET: 10,
  MAX_BET: 500,
  CURRENCY_SYMBOL: '◆',
  GAME_NAME: 'THE GAUNTLET',
} as const

export const CHIP_VALUES = [10, 25, 50, 100, 250, 500] as const

export const MAX_ROUND_HISTORY = 10

export const GAUNTLET_MULTIPLIERS = [2, 4, 8, 16, 32] as const
