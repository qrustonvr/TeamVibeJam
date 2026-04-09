import type { Card, EvaluatedHand } from './gameTypes.js'

const RANK_MAP: Record<string, number> = {
  '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5,
  '8': 6, '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12,
}

const HAND_NAMES = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
]

// Encoding: handRank * 15^5 + k1*15^4 + k2*15^3 + k3*15^2 + k4*15 + k5
// base-15 because rankIndex goes 0–12, plus sentinel 0 for ace-low
const B = 15
const B1 = B
const B2 = B * B
const B3 = B * B * B
const B4 = B * B * B * B
const B5 = B * B * B * B * B

export function parseCard(display: string): Card {
  const suit = display.slice(-1)
  const rankStr = display.slice(0, -1)
  const rankIndex = RANK_MAP[rankStr] ?? 0
  return { rankIndex, suit, display }
}

function encodeScore(handRank: number, kickers: number[]): number {
  const k = [...kickers]
  while (k.length < 5) k.push(0)
  return handRank * B5 + k[0] * B4 + k[1] * B3 + k[2] * B2 + k[3] * B1 + k[4]
}

function score5(cards: Card[]): { score: number; name: string } {
  const ranks = cards.map(c => c.rankIndex).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)

  // Group by rank
  const groups = new Map<number, number>()
  for (const r of ranks) groups.set(r, (groups.get(r) ?? 0) + 1)
  const groupsSorted = [...groups.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])

  const isFlush = suits.every(s => s === suits[0])

  // Straight detection
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b)
  let isStraight = false
  let straightTop = 0
  let isAceLow = false
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[4] - uniqueRanks[0] === 4) {
      isStraight = true
      straightTop = uniqueRanks[4]
    } else if (uniqueRanks[4] === 12 && uniqueRanks[3] === 3 && uniqueRanks[0] === 0) {
      // A-2-3-4-5
      isStraight = true
      straightTop = 3  // 5 is the top card; rankIndex 3
      isAceLow = true
    }
  }

  const handRank = (() => {
    if (isStraight && isFlush) return 8
    if (groupsSorted[0][1] === 4) return 7
    if (groupsSorted[0][1] === 3 && groupsSorted[1]?.[1] === 2) return 6
    if (isFlush) return 5
    if (isStraight) return 4
    if (groupsSorted[0][1] === 3) return 3
    if (groupsSorted[0][1] === 2 && groupsSorted[1]?.[1] === 2) return 2
    if (groupsSorted[0][1] === 2) return 1
    return 0
  })()

  // Build kickers in relevance order
  const kickers: number[] = []
  if (handRank === 8 || handRank === 4) {
    // Straight (flush): only top card matters (ace-low treated as 3)
    kickers.push(isAceLow ? 3 : straightTop)
  } else if (handRank === 5) {
    // Flush: all five ranks descending
    kickers.push(...ranks)
  } else {
    // Groups first (quads, trips, pairs), then kickers
    for (const [rank] of groupsSorted) {
      kickers.push(rank)
    }
  }

  const score = encodeScore(handRank, kickers)
  return { score, name: HAND_NAMES[handRank] }
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  return [
    ...getCombinations(rest, k - 1).map(c => [first, ...c]),
    ...getCombinations(rest, k),
  ]
}

export function best5of(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    return { score: 0, name: 'High Card', cards: [] }
  }

  let bestScore = -1
  let bestName = 'High Card'
  let bestCombo: Card[] = []

  const n = cards.length
  for (let a = 0; a < n - 4; a++)
  for (let b = a + 1; b < n - 3; b++)
  for (let c = b + 1; c < n - 2; c++)
  for (let d = c + 1; d < n - 1; d++)
  for (let e = d + 1; e < n; e++) {
    const combo = [cards[a], cards[b], cards[c], cards[d], cards[e]]
    const { score, name } = score5(combo)
    if (score > bestScore) {
      bestScore = score
      bestName = name
      bestCombo = combo
    }
  }

  return { score: bestScore, name: bestName, cards: bestCombo }
}

export function evaluatePlayerHand(
  holeCards: Card[],
  communityCards: Card[],
  dropZone: Card[],
): EvaluatedHand {
  const community = [...communityCards, ...dropZone]

  // Omaha rules: when a player has 3 hole cards, use exactly 2 from hand + 3 from community
  if (holeCards.length >= 3 && community.length >= 3) {
    const holeCombos = getCombinations(holeCards, 2)
    const commCombos = getCombinations(community, 3)
    let bestScore = -1
    let bestName = 'High Card'
    let bestCards: Card[] = []
    for (const h of holeCombos) {
      for (const c of commCombos) {
        const five = [...h, ...c]
        const { score, name } = score5(five)
        if (score > bestScore) { bestScore = score; bestName = name; bestCards = five }
      }
    }
    return bestScore === -1 ? { score: 0, name: 'High Card', cards: [] } : { score: bestScore, name: bestName, cards: bestCards }
  }

  return best5of([...holeCards, ...community])
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.score - b.score
}
