import type { Card, BrewModifier, BrewResult } from '@shared/gameTypes'

// Client-side copy of server brew resolution logic — identical to server/src/brewEngine.ts

function getColor(card: Card): 'red' | 'black' {
  return card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'
}

function isSequential(ranks: number[]): boolean {
  if (ranks.length < 2) return false
  const sorted = [...ranks].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) return false
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

function getSuitMajority(cards: Card[]): string | null {
  const n = cards.length
  if (n === 0) return null
  const suitCount: Record<string, number> = {}
  for (const card of cards) {
    suitCount[card.suit] = (suitCount[card.suit] ?? 0) + 1
  }
  for (const [suit, count] of Object.entries(suitCount)) {
    if (n === 2) {
      if (count === 2) return suit
    } else {
      if (count > n / 2) return suit
    }
  }
  return null
}

const BREW_DEFS: Record<BrewModifier, { name: string; description: string; icon: string }> = {
  'nuke':          { name: 'NUKE',          icon: '☢️',  description: 'The board has been wiped and redealt!' },
  'chain-lightning':{ name: 'CHAIN LIGHTNING',icon: '⚡', description: 'Highest and lowest hands swap stacks at showdown!' },
  'royal-tax':     { name: 'ROYAL TAX',     icon: '👑',  description: "Next hand's ante is doubled!" },
  'underdog':      { name: 'UNDERDOG',       icon: '🐕',  description: 'The weakest hand draws a bonus card!' },
  'bleeding-pot':  { name: 'BLEEDING POT',  icon: '💔',  description: 'Pot doubled! But winner splits 50% with runner-up.' },
  'grave-dig':     { name: 'GRAVE DIG',     icon: '⚰️',  description: 'Everyone draws a card from the grave!' },
  'jackpot':       { name: 'JACKPOT',       icon: '💎',  description: 'The house adds a bonus pot!' },
  'sabotage':      { name: 'SABOTAGE',      icon: '🗡️',  description: "Everyone's strongest card is exposed!" },
  'fire-sale':     { name: 'FIRE SALE',     icon: '🔥',  description: 'All betting limits removed for this hand!' },
  'blackout':      { name: 'BLACKOUT',      icon: '🌑',  description: 'The turn card is hidden. Good luck.' },
}

function makeResult(modifier: BrewModifier): BrewResult {
  return { modifier, ...BREW_DEFS[modifier] }
}

export function makeBrewFromModifier(modifier: BrewModifier): BrewResult {
  return makeResult(modifier)
}

export function resolveBrews(droppedCards: Card[]): BrewResult {
  if (droppedCards.length === 0) return makeResult(Math.random() < 0.5 ? 'fire-sale' : 'blackout')

  const ranks = droppedCards.map(c => c.rankIndex)
  const uniqueRanks = [...new Set(ranks)]

  if (uniqueRanks.length === 1) return makeResult('nuke')
  if (isSequential(ranks)) return makeResult('chain-lightning')
  if (ranks.every(r => r >= 9)) return makeResult('royal-tax')
  if (ranks.every(r => r <= 4)) return makeResult('underdog')

  const majority = getSuitMajority(droppedCards)
  if (majority !== null) {
    if (majority === '♥') return makeResult('bleeding-pot')
    if (majority === '♠') return makeResult('grave-dig')
    if (majority === '♦') return makeResult('jackpot')
    if (majority === '♣') return makeResult('sabotage')
  }

  const colors = droppedCards.map(getColor)
  if (colors.every(c => c === 'red'))   return makeResult('fire-sale')
  if (colors.every(c => c === 'black')) return makeResult('blackout')

  return makeResult(Math.random() < 0.5 ? 'fire-sale' : 'blackout')
}

export const BREW_MODIFIER_COLORS: Record<BrewModifier, string> = {
  'nuke':           '#f87171',  // red
  'chain-lightning':'#facc15',  // yellow
  'royal-tax':      '#fbbf24',  // gold
  'underdog':       '#a3e635',  // lime
  'bleeding-pot':   '#f472b6',  // pink
  'grave-dig':      '#818cf8',  // indigo
  'jackpot':        '#60a5fa',  // blue
  'sabotage':       '#c084fc',  // purple
  'fire-sale':      '#fb923c',  // orange
  'blackout':       '#6b7280',  // gray
}

export { BREW_DEFS }
