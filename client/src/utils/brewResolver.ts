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
  'nuke':           { name: 'THE ASHEN DECREE',    icon: '🔥', description: 'The board is scorched clean and redealt from the ashes.' },
  'chain-lightning':{ name: 'UNCHAINED',            icon: '⛓️', description: 'The strongest and weakest are bound. Their stacks are exchanged at showdown.' },
  'royal-tax':      { name: 'THE TITHE',            icon: '👑', description: "Hell collects its due. The next hand's ante is doubled." },
  'underdog':       { name: 'THE CHOSEN AFFLICTED', icon: '🩸', description: 'The weakest soul receives dark favour — they draw a bonus card from shadow.' },
  'bleeding-pot':   { name: 'BLOOD BOUNTY',         icon: '💔', description: 'The pot swells with crimson debt. The winner tithes half their spoils to the runner-up.' },
  'grave-dig':      { name: 'FROM THE PIT',         icon: '⚰️', description: 'The dead do not rest. Every soul draws a card from the grave.' },
  'jackpot':        { name: 'TRIBUTE DUE',          icon: '💰', description: 'A dark offering is demanded — and the house fills the pot as its answer.' },
  'sabotage':       { name: 'UNVEILED',             icon: '👁️', description: "All masks are stripped away. Every player's strongest card is laid bare." },
  'fire-sale':      { name: 'THE INVERSION',        icon: '🌀', description: 'All limits shatter. Raise without bounds for this hand.' },
  'blackout':       { name: 'THE SHROUD',           icon: '🌑', description: 'The fourth card drowns in darkness. The turn is hidden from all eyes.' },
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
  'nuke':           '#ef4444',  // crimson-red
  'chain-lightning':'#a78bfa',  // violet
  'royal-tax':      '#f59e0b',  // amber
  'underdog':       '#dc2626',  // deep red
  'bleeding-pot':   '#be123c',  // rose-crimson
  'grave-dig':      '#6366f1',  // indigo
  'jackpot':        '#b45309',  // dark gold
  'sabotage':       '#7c3aed',  // purple
  'fire-sale':      '#9333ea',  // dark violet
  'blackout':       '#374151',  // dark gray
}

export { BREW_DEFS }
