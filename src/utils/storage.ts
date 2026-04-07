import { GAME_CONFIG } from './constants'
import { PlayerStats, defaultPlayerStats } from '@/types/gauntlet'

const BALANCE_KEY = 'gauntlet-balance'
const STATS_KEY = 'gauntlet-stats'

export function loadBalance(): number {
  try {
    const stored = localStorage.getItem(BALANCE_KEY)
    if (stored !== null) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  } catch {
    // localStorage unavailable
  }
  return GAME_CONFIG.STARTING_BALANCE
}

export function saveBalance(n: number): void {
  try {
    localStorage.setItem(BALANCE_KEY, String(n))
  } catch {
    // localStorage unavailable
  }
}

export function loadStats(): PlayerStats {
  try {
    const stored = localStorage.getItem(STATS_KEY)
    if (stored !== null) {
      return { ...defaultPlayerStats, ...(JSON.parse(stored) as Partial<PlayerStats>) }
    }
  } catch {
    // localStorage unavailable or corrupt
  }
  return { ...defaultPlayerStats }
}

export function saveStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // localStorage unavailable
  }
}

export function clearAll(): void {
  try {
    localStorage.removeItem(BALANCE_KEY)
    localStorage.removeItem(STATS_KEY)
  } catch {
    // localStorage unavailable
  }
}
