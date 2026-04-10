import { evaluatePlayerHand } from '@shared/handEvaluator.js'
import type { Card, HandWinner, BrewResult, ShowdownPlayerInfo } from '@shared/gameTypes.js'
import { ANTE_AMOUNT } from '@shared/constants.js'
import type { ServerRoomState, ServerSeat, BettingAction, ValidationResult } from './types.js'
import { makeDeck, shuffleDeck } from './types.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activeSeats(state: ServerRoomState): ServerSeat[] {
  return state.seats.filter(s => !s.folded)
}

// ─── Deal ─────────────────────────────────────────────────────────────────────

export function dealHand(state: ServerRoomState): void {
  state.deck = shuffleDeck(makeDeck())
  state.communityCards = []
  state.dropZone = []
  state.pot = 0
  state.currentBetLevel = ANTE_AMOUNT
  state.roundActedSeats = new Set()
  state.activeBrew = null
  state.turnIsHidden = false
  state.maxBetOverride = 0

  const anteAmount = ANTE_AMOUNT * state.nextAnteMultiplier
  state.nextAnteMultiplier = 1  // reset after use

  for (const seat of state.seats) {
    seat.currentBet = 0
    seat.totalBetThisHand = 0
    seat.folded = false
    seat.allIn = false
    seat.hasDropped = false
    seat.droppedCard = null
    seat.exposedCard = null
    seat.votedOmen = null
    seat.lastAction = null

    // Deduct ante
    const ante = Math.min(anteAmount, seat.stack)
    seat.stack -= ante
    seat.currentBet = ante
    seat.totalBetThisHand = ante
    state.pot += ante

    // Deal 3 hole cards
    const c1 = state.deck.pop()!
    const c2 = state.deck.pop()!
    const c3 = state.deck.pop()!
    seat.holeCards = [c1, c2, c3]
  }
}

// ─── Community card dealing ───────────────────────────────────────────────────

export function dealFlop(state: ServerRoomState): Card[] {
  const cards = [state.deck.pop()!, state.deck.pop()!, state.deck.pop()!]
  state.communityCards.push(...cards)
  return cards
}

export function dealTurn(state: ServerRoomState): Card {
  const card = state.deck.pop()!
  state.communityCards.push(card)
  return card
}

export function dealRiver(state: ServerRoomState): Card {
  const card = state.deck.pop()!
  state.communityCards.push(card)
  return card
}

// ─── Betting ──────────────────────────────────────────────────────────────────

export function validateAction(
  state: ServerRoomState,
  seatIndex: number,
  action: BettingAction,
): ValidationResult {
  if (state.activeSeatIndex !== seatIndex) {
    return { ok: false, code: 'NOT_YOUR_TURN', message: 'Not your turn' }
  }
  const seat = state.seats[seatIndex]
  if (seat.folded) {
    return { ok: false, code: 'INVALID_ACTION', message: 'You have already folded' }
  }
  if (action.type === 'check' && state.currentBetLevel > seat.currentBet) {
    return { ok: false, code: 'INVALID_ACTION', message: 'Cannot check — there is a bet to call' }
  }
  if (action.type === 'call' && state.currentBetLevel <= seat.currentBet) {
    return { ok: false, code: 'INVALID_ACTION', message: 'Nothing to call — use check' }
  }
  if (action.type === 'raise') {
    const minRaise = state.currentBetLevel * 2
    const raiseAmount = action.amount ?? minRaise
    if (raiseAmount < minRaise && raiseAmount < seat.stack + seat.currentBet) {
      return { ok: false, code: 'INVALID_AMOUNT', message: `Minimum raise is ${minRaise}` }
    }
  }
  return { ok: true }
}

export function applyAction(
  state: ServerRoomState,
  seatIndex: number,
  action: BettingAction,
): { netAmount: number } {
  const seat = state.seats[seatIndex]
  let netAmount = 0

  switch (action.type) {
    case 'fold':
      seat.folded = true
      seat.lastAction = 'fold'
      break

    case 'check':
      seat.lastAction = 'check'
      break

    case 'call': {
      const toCall = Math.min(state.currentBetLevel - seat.currentBet, seat.stack)
      seat.stack -= toCall
      seat.currentBet += toCall
      seat.totalBetThisHand += toCall
      state.pot += toCall
      netAmount = toCall
      if (seat.stack === 0) seat.allIn = true
      seat.lastAction = 'call'
      break
    }

    case 'raise': {
      const raiseTarget = Math.min(action.amount ?? state.currentBetLevel * 2, seat.stack + seat.currentBet)
      const additional = raiseTarget - seat.currentBet
      seat.stack -= additional
      seat.currentBet = raiseTarget
      seat.totalBetThisHand += additional
      state.pot += additional
      state.currentBetLevel = raiseTarget
      netAmount = additional
      state.roundActedSeats = new Set([seatIndex])
      if (seat.stack === 0) seat.allIn = true
      seat.lastAction = 'raise'
      break
    }

    case 'all-in': {
      const allInAmount = seat.stack
      seat.currentBet += allInAmount
      seat.totalBetThisHand += allInAmount
      state.pot += allInAmount
      if (seat.currentBet > state.currentBetLevel) {
        state.currentBetLevel = seat.currentBet
        state.roundActedSeats = new Set([seatIndex])
      }
      seat.stack = 0
      seat.allIn = true
      netAmount = allInAmount
      seat.lastAction = 'all-in'
      break
    }
  }

  if (action.type !== 'raise') {
    state.roundActedSeats.add(seatIndex)
  }

  return { netAmount }
}

export function isBettingRoundComplete(state: ServerRoomState): boolean {
  const participating = state.seats.filter(s => !s.folded && !s.allIn)
  if (participating.length === 0) return true
  for (const seat of participating) {
    if (!state.roundActedSeats.has(seat.seatIndex)) return false
    if (seat.currentBet < state.currentBetLevel) return false
  }
  return true
}

export function startBettingRound(state: ServerRoomState): void {
  state.roundActedSeats = new Set()
  for (const seat of state.seats) {
    seat.currentBet = 0
  }
  state.currentBetLevel = 0
  let idx = (state.dealerIndex + 1) % state.seats.length
  const n = state.seats.length
  let found = false
  for (let i = 0; i < n; i++) {
    const s = state.seats[idx]
    if (!s.folded && !s.allIn) { found = true; break }
    idx = (idx + 1) % n
  }
  state.activeSeatIndex = found ? idx : -1
}

export function nextBettingPlayer(state: ServerRoomState): void {
  const start = state.activeSeatIndex
  const n = state.seats.length
  let idx = (start + 1) % n
  for (let i = 0; i < n; i++) {
    const s = state.seats[idx]
    if (!s.folded && !s.allIn) {
      state.activeSeatIndex = idx
      return
    }
    idx = (idx + 1) % n
  }
  state.activeSeatIndex = -1
}

// ─── Drop Phase ───────────────────────────────────────────────────────────────

export function applyDrop(state: ServerRoomState, seatIndex: number, cardIndex: 0 | 1 | 2): void {
  const seat = state.seats[seatIndex]
  const cards = seat.holeCards as [Card, Card, Card]
  const dropped = cards[cardIndex]
  seat.droppedCard = dropped
  seat.hasDropped = true
  const kept = cards.filter((_, i) => i !== cardIndex) as [Card, Card]
  seat.holeCards = kept
}

export function allHaveDropped(state: ServerRoomState): boolean {
  return activeSeats(state).every(s => s.hasDropped)
}

export function collectDropZone(state: ServerRoomState): Card[] {
  const dropped: Card[] = []
  for (const seat of state.seats) {
    if (seat.droppedCard) {
      dropped.push(seat.droppedCard)
      state.dropZone.push(seat.droppedCard)
      seat.droppedCard = null
    }
  }
  return dropped
}

// ─── Brew effects ─────────────────────────────────────────────────────────────

// Replace the first 3 community cards (flop) with new ones from the deck
export function applyNuke(state: ServerRoomState): Card[] {
  state.communityCards = state.communityCards.slice(3)  // keep turn/river if already dealt (won't be)
  const newFlop = [state.deck.pop()!, state.deck.pop()!, state.deck.pop()!]
  state.communityCards.unshift(...newFlop)
  return newFlop
}

// Double the pot (house funds the match)
export function applyBleedingPot(state: ServerRoomState): void {
  state.pot *= 2
}

// Add 50% bonus to pot
export function applyJackpot(state: ServerRoomState): number {
  const bonus = Math.floor(state.pot * 0.5)
  state.pot += bonus
  return bonus
}

// Deal 1 card to every active player
export function applyGraveDig(state: ServerRoomState): Map<number, Card> {
  const dealt = new Map<number, Card>()
  for (const seat of state.seats) {
    if (seat.folded) continue
    const card = state.deck.pop()!
    seat.holeCards = [...seat.holeCards, card] as [Card, Card, Card]
    dealt.set(seat.seatIndex, card)
  }
  return dealt
}

// Find weakest player, deal them 1 extra card. Returns seat index.
export function applyUnderdog(state: ServerRoomState): { seatIndex: number; card: Card } | null {
  const remaining = activeSeats(state)
  if (remaining.length === 0) return null

  // Evaluate each player's current hand strength
  let weakestSeat = remaining[0]
  let weakestScore = Infinity

  for (const seat of remaining) {
    const result = evaluatePlayerHand([...seat.holeCards], state.communityCards, [])
    if (result.score < weakestScore) {
      weakestScore = result.score
      weakestSeat = seat
    }
  }

  const card = state.deck.pop()!
  weakestSeat.holeCards = [...weakestSeat.holeCards, card] as [Card, Card, Card]
  return { seatIndex: weakestSeat.seatIndex, card }
}

// Expose each active player's highest-ranked hole card
export function applySabotage(state: ServerRoomState): Array<{ seatIndex: number; card: Card }> {
  const exposed: Array<{ seatIndex: number; card: Card }> = []
  for (const seat of state.seats) {
    if (seat.folded || seat.holeCards.length < 1) continue
    const highest = [...seat.holeCards].reduce((a, b) => a.rankIndex > b.rankIndex ? a : b)
    seat.exposedCard = highest
    exposed.push({ seatIndex: seat.seatIndex, card: highest })
  }
  return exposed
}

// ─── Showdown ─────────────────────────────────────────────────────────────────

export function runShowdown(state: ServerRoomState): { winners: HandWinner[]; showdownPlayers: ShowdownPlayerInfo[] } {
  const remaining = activeSeats(state)
  if (remaining.length === 1) {
    const winner = remaining[0]
    winner.stack += state.pot
    const handWinners: HandWinner[] = [{
      seatIndex: winner.seatIndex,
      handName: 'Last Player Standing',
      score: 0,
      potWon: state.pot,
      holeCards: [...winner.holeCards],
      bestHandCards: [],
    }]
    const showdownPlayers: ShowdownPlayerInfo[] = state.seats.map(s => ({
      seatIndex: s.seatIndex,
      handName: s.folded ? 'Folded' : (s.seatIndex === winner.seatIndex ? 'Last Player Standing' : '—'),
      score: 0,
      holeCards: [...s.holeCards],
      bestHandCards: [],
      isWinner: s.seatIndex === winner.seatIndex,
      potWon: s.seatIndex === winner.seatIndex ? state.pot : 0,
      folded: s.folded,
    }))
    return { winners: handWinners, showdownPlayers }
  }

  const evaluated = remaining.map(seat => {
    const result = evaluatePlayerHand(
      [...seat.holeCards],
      state.communityCards,
      [],  // drop zone excluded from hand evaluation
    )
    return { seat, result }
  })

  evaluated.sort((a, b) => b.result.score - a.result.score)
  const topScore = evaluated[0].result.score
  const winners = evaluated.filter(e => e.result.score === topScore)

  let pot = state.pot

  // BLEEDING POT: winner gives 50% of their winnings to runner-up
  let bleedingPotRunnerUp: ServerSeat | null = null
  if (state.activeBrew?.modifier === 'bleeding-pot' && evaluated.length > 1) {
    bleedingPotRunnerUp = evaluated.find(e => e.result.score < topScore)?.seat ?? null
  }

  const share = Math.floor(pot / winners.length)
  const remainder = pot - share * winners.length

  const handWinners: HandWinner[] = winners.map((w, i) => {
    const potWon = share + (i === 0 ? remainder : 0)
    let actualWon = potWon

    // BLEEDING POT: winner pays 50% to runner-up
    if (bleedingPotRunnerUp && i === 0) {
      const splitAmount = Math.floor(potWon * 0.5)
      actualWon -= splitAmount
      bleedingPotRunnerUp.stack += splitAmount
    }

    w.seat.stack += actualWon
    return {
      seatIndex: w.seat.seatIndex,
      handName: w.result.name,
      score: w.result.score,
      potWon: actualWon,
      holeCards: [...w.seat.holeCards],
      bestHandCards: w.result.cards,
    }
  })

  const winnerSet = new Set(handWinners.map(w => w.seatIndex))
  const potWonMap = new Map(handWinners.map(w => [w.seatIndex, w.potWon]))
  const evalMap = new Map(evaluated.map(e => [e.seat.seatIndex, e.result]))

  const showdownPlayers: ShowdownPlayerInfo[] = state.seats.map(s => {
    const result = evalMap.get(s.seatIndex)
    return {
      seatIndex: s.seatIndex,
      handName: s.folded ? 'Folded' : (result?.name ?? 'High Card'),
      score: result?.score ?? 0,
      holeCards: [...s.holeCards],
      bestHandCards: result?.cards ?? [],
      isWinner: winnerSet.has(s.seatIndex),
      potWon: potWonMap.get(s.seatIndex) ?? 0,
      folded: s.folded,
    }
  })

  // CHAIN LIGHTNING: swap chip stacks of highest and lowest hands
  if (state.activeBrew?.modifier === 'chain-lightning' && evaluated.length > 1) {
    const highest = evaluated[evaluated.length - 1].seat
    const lowest = evaluated[0].seat
    if (highest.seatIndex !== lowest.seatIndex) {
      const temp = highest.stack
      highest.stack = lowest.stack
      lowest.stack = temp
    }
  }

  return { winners: handWinners, showdownPlayers }
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

export function getValidActions(state: ServerRoomState, seatIndex: number): string[] {
  const seat = state.seats[seatIndex]
  const actions: string[] = ['fold']
  const toCall = state.currentBetLevel - seat.currentBet
  if (toCall === 0) {
    actions.push('check')
  } else {
    actions.push('call')
  }
  if (seat.stack > toCall) {
    actions.push('raise')
  }
  actions.push('all-in')
  return actions
}

export function rotateDealerIndex(state: ServerRoomState): void {
  const n = state.seats.length
  let idx = (state.dealerIndex + 1) % n
  for (let i = 0; i < n; i++) {
    if (state.seats[idx].stack > 0) { state.dealerIndex = idx; return }
    idx = (idx + 1) % n
  }
}

export function anyActivePlayersHaveChips(state: ServerRoomState): boolean {
  const playersWithChips = state.seats.filter(s => s.stack > 0)
  return playersWithChips.length >= 2
}

export function autoDropChoice(seat: ServerSeat): 0 | 1 | 2 {
  const cards = seat.holeCards
  if (cards.length < 3) return 0
  let minIdx = 0
  let minRank = cards[0].rankIndex
  for (let i = 1; i < 3; i++) {
    if (cards[i].rankIndex < minRank) {
      minRank = cards[i].rankIndex
      minIdx = i
    }
  }
  return minIdx as 0 | 1 | 2
}

export function nextUndroppedSeat(state: ServerRoomState): number {
  for (const seat of state.seats) {
    if (!seat.folded && !seat.hasDropped) return seat.seatIndex
  }
  return -1
}

export function getActiveBrew(state: ServerRoomState): BrewResult | null {
  return state.activeBrew
}
