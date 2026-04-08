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
  'calm-waters':   { name: 'CALM WATERS',   icon: '🌊',  description: 'No modifier this round.' },
}

function makeResult(modifier: BrewModifier): BrewResult {
  return { modifier, ...BREW_DEFS[modifier] }
}

export function resolveBrews(droppedCards: Card[]): BrewResult {
  if (droppedCards.length === 0) return makeResult('calm-waters')

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

  // Priority 11: Fallback
  return makeResult('calm-waters')
}
