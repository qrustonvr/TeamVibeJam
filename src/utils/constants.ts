export const GAME_CONFIG = {
  STARTING_BALANCE: 1000,
  MIN_BET: 10,
  MAX_BET: 500,
  CURRENCY_SYMBOL: '◆',
  GAME_NAME: 'CASINO GAME JAM',
} as const

export const CHIP_VALUES = [10, 25, 50, 100] as const

export const MAX_ROUND_HISTORY = 10
