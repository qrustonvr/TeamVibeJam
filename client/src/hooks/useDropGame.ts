import { useReducer, useEffect, useCallback, useRef } from 'react'
import type { Card, AIPersonality, BrewResult } from '@shared/gameTypes'
import { ANTE_AMOUNT } from '@shared/constants'
import { best5of } from '@shared/handEvaluator'
import { computeAIAction, computeAIDropChoice, randomPersonality } from '@/ai/dropAI'
import { resolveBrews } from '@/utils/brewResolver'
import { useGame } from '@/context/GameContext'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocalSeat {
  seatIndex: number
  displayName: string
  stack: number
  currentBet: number
  totalBetThisHand: number
  folded: boolean
  allIn: boolean
  hasDropped: boolean
  holeCards: Card[]
  droppedCard: Card | null
  exposedCard: Card | null
  lastAction: string | null
  isAI: boolean
  personality: AIPersonality
}

type DropPhaseLocal =
  | 'lobby' | 'deal'
  | 'betting_1'   // pre-flop
  | 'flop'
  | 'betting_2'   // post-flop (BEFORE drop)
  | 'drop'        // simultaneous drop
  | 'brew_reveal' // modifier revealed + applied
  | 'betting_3'   // post-brew
  | 'turn'
  | 'betting_4'   // turn bet
  | 'river'
  | 'betting_5'   // river/final bet
  | 'showdown'
  | 'payout'

interface LocalGameState {
  phase: DropPhaseLocal
  seats: LocalSeat[]
  deck: Card[]
  communityCards: Card[]
  dropZone: Card[]
  pot: number
  currentBetLevel: number
  activeSeatIndex: number
  dealerIndex: number
  roundNumber: number
  handWinners: Array<{ seatIndex: number; handName: string; potWon: number }> | null
  roundActedSeats: number[]
  activeBrew: BrewResult | null
  nextAnteMultiplier: number
  turnIsHidden: boolean
}

type LocalAction =
  | { type: 'START_GAME'; aiCount: number }
  | { type: 'START_HAND' }
  | { type: 'START_BETTING_ROUND'; phase: DropPhaseLocal }
  | { type: 'SET_PHASE'; phase: DropPhaseLocal }
  | { type: 'DEAL_FLOP' }
  | { type: 'DEAL_TURN' }
  | { type: 'DEAL_RIVER' }
  | { type: 'PLAYER_ACTION'; seatIndex: number; action: string; amount?: number }
  | { type: 'PLAYER_DROP'; seatIndex: number; cardIndex: number }
  | { type: 'RESOLVE_BREW' }
  | { type: 'RUN_SHOWDOWN' }
  | { type: 'NEXT_HAND' }
  | { type: 'RESET' }

// ─── Deck helpers ─────────────────────────────────────────────────────────────

function makeDeck(): Card[] {
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
  const suits = ['♠','♥','♦','♣']
  const rankMap: Record<string, number> = {
    '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12,
  }
  const deck: Card[] = []
  for (const suit of suits)
    for (const rank of ranks)
      deck.push({ rankIndex: rankMap[rank], suit, display: rank + suit })
  return deck
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

function drawCards(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
  const cards = deck.slice(-count)
  return { cards, remaining: deck.slice(0, -count) }
}

// ─── Betting helpers ──────────────────────────────────────────────────────────

function nextActivePlayerAfter(seats: LocalSeat[], from: number): number {
  const n = seats.length
  let i = (from + 1) % n
  for (let attempt = 0; attempt < n; attempt++) {
    if (!seats[i].folded && !seats[i].allIn) return i
    i = (i + 1) % n
  }
  return -1
}

function firstActiveAfterDealer(seats: LocalSeat[], dealerIndex: number): number {
  return nextActivePlayerAfter(seats, dealerIndex)
}

function isBettingComplete(state: LocalGameState): boolean {
  const participating = state.seats.filter(s => !s.folded && !s.allIn)
  if (participating.length === 0) return true
  for (const seat of participating) {
    if (!state.roundActedSeats.includes(seat.seatIndex)) return false
    if (seat.currentBet < state.currentBetLevel) return false
  }
  return true
}

function applyStartBettingRound(state: LocalGameState): LocalGameState {
  const seats = state.seats.map(s => ({ ...s, currentBet: 0 }))
  const firstActive = firstActiveAfterDealer(seats, state.dealerIndex)
  return { ...state, seats, currentBetLevel: 0, roundActedSeats: [], activeSeatIndex: firstActive }
}

// ─── Brew effect application ──────────────────────────────────────────────────

function applyBrewEffect(state: LocalGameState, brew: BrewResult): LocalGameState {
  let { deck, seats, communityCards, pot, turnIsHidden, nextAnteMultiplier } = state

  switch (brew.modifier) {
    case 'nuke': {
      // Replace flop (first 3 community cards)
      const { cards: newFlop, remaining } = drawCards(deck, 3)
      deck = remaining
      communityCards = [...newFlop, ...communityCards.slice(3)]
      break
    }

    case 'royal-tax':
      nextAnteMultiplier = 2
      break

    case 'underdog': {
      // Find weakest player by current hand strength, deal them a card
      const remaining2 = seats.filter(s => !s.folded)
      if (remaining2.length > 0) {
        let weakestIdx = remaining2[0].seatIndex
        let weakestScore = Infinity
        for (const seat of remaining2) {
          const result = best5of([...seat.holeCards, ...communityCards])
          if (result.score < weakestScore) {
            weakestScore = result.score
            weakestIdx = seat.seatIndex
          }
        }
        const { cards: [bonusCard], remaining: deckAfter } = drawCards(deck, 1)
        deck = deckAfter
        seats = seats.map(s => s.seatIndex === weakestIdx
          ? { ...s, holeCards: [...s.holeCards, bonusCard] }
          : s
        )
      }
      break
    }

    case 'bleeding-pot':
      pot = pot * 2
      break

    case 'grave-dig': {
      // Deal 1 card to every active player
      let deckRemaining = deck
      seats = seats.map(seat => {
        if (seat.folded) return seat
        const { cards: [newCard], remaining: r } = drawCards(deckRemaining, 1)
        deckRemaining = r
        return { ...seat, holeCards: [...seat.holeCards, newCard] }
      })
      deck = deckRemaining
      break
    }

    case 'jackpot': {
      const bonus = Math.floor(pot * 0.5)
      pot += bonus
      break
    }

    case 'sabotage': {
      // Expose each active player's highest-ranked hole card
      seats = seats.map(seat => {
        if (seat.folded || seat.holeCards.length === 0) return seat
        const highest = [...seat.holeCards].reduce((a, b) => a.rankIndex > b.rankIndex ? a : b)
        return { ...seat, exposedCard: highest }
      })
      break
    }

    case 'blackout':
      turnIsHidden = true
      break

    // fire-sale, chain-lightning, calm-waters: handled in display/showdown, no state change needed
    default:
      break
  }

  return { ...state, deck, seats, communityCards, pot, turnIsHidden, nextAnteMultiplier }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function makeInitialState(): LocalGameState {
  return {
    phase: 'lobby', seats: [], deck: [], communityCards: [], dropZone: [],
    pot: 0, currentBetLevel: ANTE_AMOUNT, activeSeatIndex: -1,
    dealerIndex: 0, roundNumber: 0, handWinners: null, roundActedSeats: [],
    activeBrew: null, nextAnteMultiplier: 1, turnIsHidden: false,
  }
}

function reducer(state: LocalGameState, action: LocalAction): LocalGameState {
  switch (action.type) {

    case 'START_GAME': {
      const playerSeat: LocalSeat = {
        seatIndex: 0, displayName: 'You', stack: 1000,
        currentBet: 0, totalBetThisHand: 0, folded: false, allIn: false,
        hasDropped: false, holeCards: [], droppedCard: null, exposedCard: null,
        lastAction: null, isAI: false, personality: 'balanced',
      }
      const aiSeats: LocalSeat[] = Array.from({ length: action.aiCount }, (_, i) => ({
        seatIndex: i + 1, displayName: `AI ${i + 1}`, stack: 1000,
        currentBet: 0, totalBetThisHand: 0, folded: false, allIn: false,
        hasDropped: false, holeCards: [], droppedCard: null, exposedCard: null,
        lastAction: null, isAI: true, personality: randomPersonality(),
      }))
      return { ...makeInitialState(), seats: [playerSeat, ...aiSeats] }
    }

    case 'START_HAND': {
      let deck = shuffle(makeDeck())
      let pot = 0
      const anteAmount = ANTE_AMOUNT * state.nextAnteMultiplier
      const seats = state.seats.map(seat => {
        const ante = Math.min(anteAmount, seat.stack)
        const { cards, remaining } = drawCards(deck, 3)
        deck = remaining
        pot += ante
        return {
          ...seat, currentBet: ante, totalBetThisHand: ante,
          stack: seat.stack - ante, folded: false,
          allIn: seat.stack - ante === 0,
          hasDropped: false, droppedCard: null, exposedCard: null, holeCards: cards, lastAction: null,
        }
      })
      return {
        ...state, phase: 'deal', deck, seats, communityCards: [], dropZone: [], pot,
        currentBetLevel: ANTE_AMOUNT, activeSeatIndex: -1,
        roundNumber: state.roundNumber + 1, handWinners: null, roundActedSeats: [],
        activeBrew: null, nextAnteMultiplier: 1, turnIsHidden: false,
      }
    }

    case 'START_BETTING_ROUND':
      return { ...applyStartBettingRound(state), phase: action.phase }

    case 'SET_PHASE':
      return { ...state, phase: action.phase }

    case 'DEAL_FLOP': {
      const { cards, remaining } = drawCards(state.deck, 3)
      return { ...state, deck: remaining, communityCards: [...state.communityCards, ...cards], phase: 'flop' }
    }

    case 'DEAL_TURN': {
      const { cards, remaining } = drawCards(state.deck, 1)
      return { ...state, deck: remaining, communityCards: [...state.communityCards, ...cards], phase: 'turn' }
    }

    case 'DEAL_RIVER': {
      const { cards, remaining } = drawCards(state.deck, 1)
      return { ...state, deck: remaining, communityCards: [...state.communityCards, ...cards], phase: 'river' }
    }

    case 'PLAYER_ACTION': {
      const { seatIndex, action: playerAction, amount } = action

      let seats = [...state.seats]
      let pot = state.pot
      let currentBetLevel = state.currentBetLevel
      let roundActedSeats = [...state.roundActedSeats]
      const seat = { ...seats[seatIndex] }

      switch (playerAction) {
        case 'fold':
          seat.folded = true; seat.lastAction = 'fold'; break
        case 'check':
          seat.lastAction = 'check'; break
        case 'call': {
          const toCall = Math.min(currentBetLevel - seat.currentBet, seat.stack)
          seat.stack -= toCall; seat.currentBet += toCall; seat.totalBetThisHand += toCall
          pot += toCall
          if (seat.stack === 0) seat.allIn = true
          seat.lastAction = 'call'; break
        }
        case 'raise': {
          const raiseTarget = Math.min(amount ?? currentBetLevel * 2, seat.stack + seat.currentBet)
          const additional = raiseTarget - seat.currentBet
          seat.stack -= additional; pot += additional
          seat.currentBet = raiseTarget; seat.totalBetThisHand += additional
          currentBetLevel = raiseTarget
          if (seat.stack === 0) seat.allIn = true
          seat.lastAction = 'raise'
          roundActedSeats = [seatIndex]
          seats[seatIndex] = seat
          return { ...state, seats, pot, currentBetLevel, roundActedSeats, activeSeatIndex: nextActivePlayerAfter(seats, seatIndex) }
        }
        case 'all-in': {
          const allInAmount = seat.stack
          const newBet = seat.currentBet + allInAmount
          pot += allInAmount; seat.stack = 0; seat.currentBet = newBet; seat.totalBetThisHand += allInAmount
          if (newBet > currentBetLevel) { currentBetLevel = newBet; roundActedSeats = [seatIndex] }
          seat.allIn = true; seat.lastAction = 'all-in'; break
        }
      }

      if (!roundActedSeats.includes(seatIndex)) roundActedSeats.push(seatIndex)
      seats[seatIndex] = seat

      const notFolded = seats.filter(s => !s.folded)
      if (notFolded.length === 1) {
        return { ...state, seats, pot, currentBetLevel, roundActedSeats, phase: 'showdown', activeSeatIndex: -1 }
      }

      const tempState = { ...state, seats, pot, currentBetLevel, roundActedSeats }
      if (isBettingComplete(tempState)) {
        return { ...tempState, activeSeatIndex: -1 }
      }

      return { ...state, seats, pot, currentBetLevel, roundActedSeats, activeSeatIndex: nextActivePlayerAfter(seats, seatIndex) }
    }

    case 'PLAYER_DROP': {
      const { seatIndex, cardIndex } = action
      const seat = { ...state.seats[seatIndex] }
      const dropped = seat.holeCards[cardIndex]
      seat.droppedCard = dropped
      seat.hasDropped = true
      seat.holeCards = seat.holeCards.filter((_, i) => i !== cardIndex)
      return { ...state, seats: state.seats.map(s => s.seatIndex === seatIndex ? seat : s) }
    }

    case 'RESOLVE_BREW': {
      // Collect dropped cards, run brew resolution, apply effect
      const droppedCards = state.seats.filter(s => !s.folded && s.droppedCard).map(s => s.droppedCard!)
      const dropZone = [...state.dropZone, ...droppedCards]
      const seats: LocalSeat[] = state.seats.map(s => ({ ...s, droppedCard: null as Card | null }))
      const brew = resolveBrews(droppedCards)

      let newState: LocalGameState = { ...state, dropZone, seats, activeBrew: brew, phase: 'brew_reveal' as DropPhaseLocal }
      newState = applyBrewEffect(newState, brew)
      return newState
    }

    case 'RUN_SHOWDOWN': {
      const remaining = state.seats.filter(s => !s.folded)

      if (remaining.length === 1) {
        const winner = remaining[0]
        const seats = state.seats.map(s =>
          s.seatIndex === winner.seatIndex ? { ...s, stack: s.stack + state.pot } : s
        )
        return { ...state, phase: 'payout', seats, handWinners: [{ seatIndex: winner.seatIndex, handName: 'Last Standing', potWon: state.pot }] }
      }

      const evaluated = remaining.map(seat => ({
        seat, result: best5of([...seat.holeCards, ...state.communityCards]),
      })).sort((a, b) => b.result.score - a.result.score)

      const topScore = evaluated[0].result.score
      const winners = evaluated.filter(e => e.result.score === topScore)
      const share = Math.floor(state.pot / winners.length)
      const remainder = state.pot - share * winners.length

      const winRecords: NonNullable<LocalGameState['handWinners']> = []
      const stackDeltas: Record<number, number> = {}

      // BLEEDING POT: winner pays 50% to runner-up
      const runnerUp = state.activeBrew?.modifier === 'bleeding-pot' && evaluated.length > 1
        ? evaluated.find(e => e.result.score < topScore)?.seat ?? null
        : null

      winners.forEach((w, i) => {
        let potWon = share + (i === 0 ? remainder : 0)
        if (runnerUp && i === 0) {
          const split = Math.floor(potWon * 0.5)
          potWon -= split
          stackDeltas[runnerUp.seatIndex] = (stackDeltas[runnerUp.seatIndex] ?? 0) + split
        }
        stackDeltas[w.seat.seatIndex] = (stackDeltas[w.seat.seatIndex] ?? 0) + potWon
        winRecords.push({ seatIndex: w.seat.seatIndex, handName: w.result.name, potWon })
      })

      let seats = state.seats.map(s => ({ ...s, stack: s.stack + (stackDeltas[s.seatIndex] ?? 0) }))

      // CHAIN LIGHTNING: swap highest and lowest stacks
      if (state.activeBrew?.modifier === 'chain-lightning' && evaluated.length > 1) {
        const highSeat = evaluated[evaluated.length - 1].seat
        const lowSeat = evaluated[0].seat
        if (highSeat.seatIndex !== lowSeat.seatIndex) {
          const highStack = seats[highSeat.seatIndex].stack
          const lowStack = seats[lowSeat.seatIndex].stack
          seats = seats.map(s => {
            if (s.seatIndex === highSeat.seatIndex) return { ...s, stack: lowStack }
            if (s.seatIndex === lowSeat.seatIndex) return { ...s, stack: highStack }
            return s
          })
        }
      }

      return { ...state, phase: 'payout', seats, handWinners: winRecords }
    }

    case 'NEXT_HAND': {
      const alive = state.seats.filter(s => s.stack > 0)
      if (alive.length < 2) return { ...state, phase: 'lobby' }
      const n = state.seats.length
      let dealerIdx = state.dealerIndex
      for (let i = 0; i < n; i++) {
        dealerIdx = (dealerIdx + 1) % n
        if (state.seats[dealerIdx].stack > 0) break
      }
      return { ...state, dealerIndex: dealerIdx }
    }

    case 'RESET':
      return makeInitialState()

    default:
      return state
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const BETTING_PHASES = ['betting_1','betting_2','betting_3','betting_4','betting_5'] as const

export function useDropGame() {
  const [state, dispatch] = useReducer(reducer, makeInitialState())
  const { dispatch: gameDispatch } = useGame()
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current) { clearTimeout(phaseTimerRef.current); phaseTimerRef.current = null }
  }, [])

  const schedulePhase = useCallback((fn: () => void, ms: number) => {
    clearPhaseTimer()
    phaseTimerRef.current = setTimeout(fn, ms)
  }, [clearPhaseTimer])

  // ─── Phase transitions ────────────────────────────────────────────────────

  // deal → betting_1
  useEffect(() => {
    if (state.phase === 'deal') {
      schedulePhase(() => dispatch({ type: 'START_BETTING_ROUND', phase: 'betting_1' }), 800)
    }
  }, [state.phase, schedulePhase])

  // flop → betting_2 (post-flop, BEFORE drop)
  useEffect(() => {
    if (state.phase === 'flop') {
      schedulePhase(() => dispatch({ type: 'START_BETTING_ROUND', phase: 'betting_2' }), 800)
    }
  }, [state.phase, schedulePhase])

  // turn → betting_4
  useEffect(() => {
    if (state.phase === 'turn') {
      schedulePhase(() => dispatch({ type: 'START_BETTING_ROUND', phase: 'betting_4' }), 800)
    }
  }, [state.phase, schedulePhase])

  // river → betting_5
  useEffect(() => {
    if (state.phase === 'river') {
      schedulePhase(() => dispatch({ type: 'START_BETTING_ROUND', phase: 'betting_5' }), 800)
    }
  }, [state.phase, schedulePhase])

  // Detect all players dropped → resolve brew
  useEffect(() => {
    if (state.phase !== 'drop') return
    const allDropped = state.seats.filter(s => !s.folded).every(s => s.hasDropped)
    if (allDropped) {
      schedulePhase(() => dispatch({ type: 'RESOLVE_BREW' }), 400)
    }
  }, [state.phase, state.seats, schedulePhase])

  // brew_reveal → brewing effect time → betting_3
  useEffect(() => {
    if (state.phase === 'brew_reveal') {
      schedulePhase(() => dispatch({ type: 'START_BETTING_ROUND', phase: 'betting_3' }), 4000)
    }
  }, [state.phase, schedulePhase])

  // showdown trigger
  useEffect(() => {
    if (state.phase === 'showdown') {
      schedulePhase(() => dispatch({ type: 'RUN_SHOWDOWN' }), 600)
    }
  }, [state.phase, schedulePhase])

  // ─── Betting complete → advance street ───────────────────────────────────

  useEffect(() => {
    if (state.activeSeatIndex !== -1) return
    switch (state.phase) {
      case 'betting_1': schedulePhase(() => dispatch({ type: 'DEAL_FLOP' }), 400); break
      case 'betting_2': schedulePhase(() => dispatch({ type: 'SET_PHASE', phase: 'drop' }), 400); break
      case 'betting_3': schedulePhase(() => dispatch({ type: 'DEAL_TURN' }), 400); break
      case 'betting_4': schedulePhase(() => dispatch({ type: 'DEAL_RIVER' }), 400); break
      case 'betting_5': schedulePhase(() => dispatch({ type: 'RUN_SHOWDOWN' }), 400); break
    }
  }, [state.activeSeatIndex, state.phase, schedulePhase])

  // ─── Payout ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'payout') return
    const winners = state.handWinners
    if (winners) {
      const heroWin = winners.find(w => w.seatIndex === 0)
      if (heroWin) gameDispatch({ type: 'WIN', payout: heroWin.potWon - ANTE_AMOUNT })
      else gameDispatch({ type: 'LOSE' })
    }
    schedulePhase(() => {
      dispatch({ type: 'NEXT_HAND' })
      dispatch({ type: 'START_HAND' })
    }, 3500)
  }, [state.phase, state.handWinners, gameDispatch, schedulePhase])

  // ─── AI betting ───────────────────────────────────────────────────────────

  useEffect(() => {
    const { phase, activeSeatIndex, seats } = state
    if (activeSeatIndex === -1) return
    const seat = seats[activeSeatIndex]
    if (!seat?.isAI) return
    if (!BETTING_PHASES.includes(phase as typeof BETTING_PHASES[number])) return

    const delay = 800 + Math.random() * 1200
    const t = setTimeout(() => {
      const s = stateRef.current
      if (s.activeSeatIndex !== activeSeatIndex) return
      if (!BETTING_PHASES.includes(s.phase as typeof BETTING_PHASES[number])) return
      const currentSeat = s.seats[activeSeatIndex]
      if (!currentSeat?.isAI || currentSeat.folded) return

      const decision = computeAIAction({
        holeCards: currentSeat.holeCards,
        communityCards: s.communityCards,
        pot: s.pot,
        currentBetLevel: s.currentBetLevel,
        myCurrentBet: currentSeat.currentBet,
        myStack: currentSeat.stack,
        personality: currentSeat.personality,
      })
      dispatch({ type: 'PLAYER_ACTION', seatIndex: activeSeatIndex, action: decision.action, amount: decision.amount })
    }, delay)

    return () => clearTimeout(t)
  }, [state.activeSeatIndex, state.phase])

  // ─── AI drop ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'drop') return
    const aiPending = state.seats.find(s => s.isAI && !s.hasDropped && !s.folded)
    if (!aiPending) return

    const delay = 600 + Math.random() * 1000
    const t = setTimeout(() => {
      const s = stateRef.current
      if (s.phase !== 'drop') return
      const seat = s.seats[aiPending.seatIndex]
      if (!seat || seat.hasDropped || seat.folded || seat.holeCards.length !== 3) return
      const idx = computeAIDropChoice(seat.holeCards as [Card, Card, Card], s.communityCards)
      dispatch({ type: 'PLAYER_DROP', seatIndex: aiPending.seatIndex, cardIndex: idx })
    }, delay)

    return () => clearTimeout(t)
  }, [state.phase, state.seats])

  // ─── Public API ───────────────────────────────────────────────────────────

  const isYourTurn =
    state.activeSeatIndex === 0 &&
    BETTING_PHASES.includes(state.phase as typeof BETTING_PHASES[number])

  const isYourDropTurn =
    state.phase === 'drop' &&
    !(state.seats[0]?.hasDropped ?? true) &&
    !(state.seats[0]?.folded ?? true)

  return {
    state,
    isYourTurn,
    isYourDropTurn,
    yourCards: state.seats[0]?.holeCards ?? [],
    yourSeatIndex: 0,
    startGame: (aiCount: number) => {
      dispatch({ type: 'START_GAME', aiCount })
      setTimeout(() => dispatch({ type: 'START_HAND' }), 50)
    },
    playerAction: (action: string, amount?: number) => {
      if (!isYourTurn) return
      dispatch({ type: 'PLAYER_ACTION', seatIndex: 0, action, amount })
    },
    dropCard: (cardIndex: number) => {
      if (!isYourDropTurn) return
      dispatch({ type: 'PLAYER_DROP', seatIndex: 0, cardIndex })
    },
    reset: () => dispatch({ type: 'RESET' }),
  }
}
