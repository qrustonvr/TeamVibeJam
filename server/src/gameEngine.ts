import { evaluatePlayerHand } from '@shared/handEvaluator.js'
import type { Card, HandWinner } from '@shared/gameTypes.js'
import { ANTE_AMOUNT } from '@shared/constants.js'
import type { ServerRoomState, ServerSeat, BettingAction, ValidationResult } from './types.js'
import { makeDeck, shuffleDeck } from './types.js'

// ─── Helpers ────────────────────────────────────────────────────────────────


function activeSeats(state: ServerRoomState): ServerSeat[] {
  return state.seats.filter(s => !s.folded)
}


// ─── Deal ────────────────────────────────────────────────────────────────────

export function dealHand(state: ServerRoomState): void {
  state.deck = shuffleDeck(makeDeck())
  state.communityCards = []
  state.dropZone = []
  state.pot = 0
  state.currentBetLevel = ANTE_AMOUNT
  state.roundActedSeats = new Set()

  for (const seat of state.seats) {
    seat.currentBet = 0
    seat.totalBetThisHand = 0
    seat.folded = false
    seat.allIn = false
    seat.hasDropped = false
    seat.droppedCard = null
    seat.lastAction = null

    // Deduct ante
    const ante = Math.min(ANTE_AMOUNT, seat.stack)
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

// ─── Community card dealing ──────────────────────────────────────────────────

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

// ─── Betting ─────────────────────────────────────────────────────────────────

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
      // Reset: all other active seats need to act again
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
  // All must have acted and matched the current bet level
  for (const seat of participating) {
    if (!state.roundActedSeats.has(seat.seatIndex)) return false
    if (seat.currentBet < state.currentBetLevel) return false
  }
  return true
}

export function startBettingRound(state: ServerRoomState): void {
  state.roundActedSeats = new Set()
  // Reset current bets but keep pot
  for (const seat of state.seats) {
    seat.currentBet = 0
  }
  state.currentBetLevel = 0
  // Find first active seat after dealer
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

// ─── Drop Phase ──────────────────────────────────────────────────────────────

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

export function revealDropZone(state: ServerRoomState): void {
  for (const seat of state.seats) {
    if (seat.droppedCard) {
      state.dropZone.push(seat.droppedCard)
    }
  }
}

// ─── Showdown ────────────────────────────────────────────────────────────────

export function runShowdown(state: ServerRoomState): HandWinner[] {
  const remaining = activeSeats(state)
  if (remaining.length === 1) {
    const winner = remaining[0]
    winner.stack += state.pot
    return [{
      seatIndex: winner.seatIndex,
      handName: 'Last Player Standing',
      score: 0,
      potWon: state.pot,
      holeCards: [...winner.holeCards],
      bestHandCards: [],
    }]
  }

  const evaluated = remaining.map(seat => {
    const result = evaluatePlayerHand(
      [...seat.holeCards],
      state.communityCards,
      state.dropZone,
    )
    return { seat, result }
  })

  evaluated.sort((a, b) => b.result.score - a.result.score)
  const topScore = evaluated[0].result.score
  const winners = evaluated.filter(e => e.result.score === topScore)

  const share = Math.floor(state.pot / winners.length)
  const remainder = state.pot - share * winners.length

  const handWinners: HandWinner[] = winners.map((w, i) => {
    const potWon = share + (i === 0 ? remainder : 0)
    w.seat.stack += potWon
    return {
      seatIndex: w.seat.seatIndex,
      handName: w.result.name,
      score: w.result.score,
      potWon,
      holeCards: [...w.seat.holeCards],
      bestHandCards: w.result.cards,
    }
  })

  return handWinners
}

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
  const cards = seat.holeCards as [Card, Card, Card]
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

// Get index of next seat that hasn't dropped yet (for AI-style auto-drop)
export function nextUndroppedSeat(state: ServerRoomState): number {
  for (const seat of state.seats) {
    if (!seat.folded && !seat.hasDropped) return seat.seatIndex
  }
  return -1
}
