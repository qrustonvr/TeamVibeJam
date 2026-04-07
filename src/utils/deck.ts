import { Card, Suit, Rank, CardResult } from '@/types/gauntlet'
import { shuffleArray } from './random'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

const RANK_DISPLAY: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
}

export function suitRank(suit: Suit): number {
  // Spades=4, Hearts=3, Diamonds=2, Clubs=1
  const order: Record<Suit, number> = { spades: 4, hearts: 3, diamonds: 2, clubs: 1 }
  return order[suit]
}

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        rank,
        suit,
        display: `${RANK_DISPLAY[rank]}${SUIT_SYMBOLS[suit]}`,
        faceUp: false,
      })
    }
  }
  return deck
}

export function buildShuffledDeck(): Card[] {
  return shuffleArray(buildDeck())
}

export function compareCards(champion: Card, gauntlet: Card): CardResult {
  if (champion.rank > gauntlet.rank) return 'win'
  if (champion.rank < gauntlet.rank) return 'lose'
  // Tie — use suit rank
  return suitRank(champion.suit) > suitRank(gauntlet.suit) ? 'clash-win' : 'clash-lose'
}

export function calcWinProbability(champion: Card, knownCards: Card[]): number {
  // Build full deck, remove champion + all known cards
  const allCards = buildDeck()
  const knownKeys = new Set<string>([
    `${champion.rank}-${champion.suit}`,
    ...knownCards.map(c => `${c.rank}-${c.suit}`),
  ])
  const unknown = allCards.filter(c => !knownKeys.has(`${c.rank}-${c.suit}`))
  if (unknown.length === 0) return 100

  let wins = 0
  for (const card of unknown) {
    const r = compareCards(champion, card)
    if (r === 'win' || r === 'clash-win') wins++
  }
  return Math.round((wins / unknown.length) * 100)
}
