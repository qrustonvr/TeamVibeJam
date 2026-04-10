import type { Card, BrewModifier, BrewResult } from '@shared/gameTypes.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getColor(card: Card): 'red' | 'black' {
  return card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'
}

function isSequential(ranks: number[]): boolean {
  if (ranks.length < 2) return false
  const sorted = [...ranks].sort((a, b) => a - b)
  // Check no duplicates
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) return false
  }
  // Check consecutive
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
      // 2-player: both must match
      if (count === 2) return suit
    } else {
      // 3+ players: simple majority (> 50%)
      if (count > n / 2) return suit
    }
  }

  return null
}

// ─── Priority-ordered modifier resolution ─────────────────────────────────────

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

export function brewFromModifier(modifier: BrewModifier): BrewResult {
  return makeResult(modifier)
}

export function resolveBrews(droppedCards: Card[]): BrewResult {
  if (droppedCards.length === 0) return makeResult(Math.random() < 0.5 ? 'fire-sale' : 'blackout')

  const ranks = droppedCards.map(c => c.rankIndex)
  const uniqueRanks = [...new Set(ranks)]

  // Priority 1: All same rank → NUKE
  if (uniqueRanks.length === 1) return makeResult('nuke')

  // Priority 2: Sequential ranks → CHAIN LIGHTNING
  if (isSequential(ranks)) return makeResult('chain-lightning')

  // Priority 3: All face cards (J=9, Q=10, K=11, A=12) → ROYAL TAX
  if (ranks.every(r => r >= 9)) return makeResult('royal-tax')

  // Priority 4: All low cards (2–6 = rank 0–4) → UNDERDOG
  if (ranks.every(r => r <= 4)) return makeResult('underdog')

  // Priority 5–8: Suit majority
  const majority = getSuitMajority(droppedCards)
  if (majority !== null) {
    if (majority === '♥') return makeResult('bleeding-pot')
    if (majority === '♠') return makeResult('grave-dig')
    if (majority === '♦') return makeResult('jackpot')
    if (majority === '♣') return makeResult('sabotage')
  }

  // Priority 9–10: Color patterns
  const colors = droppedCards.map(getColor)
  if (colors.every(c => c === 'red'))   return makeResult('fire-sale')
  if (colors.every(c => c === 'black')) return makeResult('blackout')

  // Priority 11: Fallback — randomly fire-sale or blackout
  return makeResult(Math.random() < 0.5 ? 'fire-sale' : 'blackout')
}
