import { best5of } from '@shared/handEvaluator'
import type { Card, AIPersonality } from '@shared/gameTypes'

export interface AIGameContext {
  holeCards: Card[]
  communityCards: Card[]
  dropZone: Card[]
  pot: number
  currentBetLevel: number
  myCurrentBet: number
  myStack: number
  personality: AIPersonality
}

export interface AIDecision {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in'
  amount?: number
}

// Score ranges: 0 = worst high card, ~6.7M = royal flush
// Normalize to 0..1
const MAX_SCORE = 6_725_892

function handStrength(holeCards: Card[], communityCards: Card[], dropZone: Card[]): number {
  const result = best5of([...holeCards, ...communityCards, ...dropZone])
  return result.score / MAX_SCORE
}

export function computeAIAction(ctx: AIGameContext): AIDecision {
  const strength = handStrength(ctx.holeCards, ctx.communityCards, ctx.dropZone)
  const toCall = ctx.currentBetLevel - ctx.myCurrentBet
  const canCheck = toCall === 0
  const potOdds = toCall / (ctx.pot + toCall) || 0

  const bluffRoll = Math.random()

  let bluffChance: number
  let foldThreshold: number
  let raiseThreshold: number

  switch (ctx.personality) {
    case 'tight':
      bluffChance = 0.10
      foldThreshold = 0.35
      raiseThreshold = 0.70
      break
    case 'aggressive':
      bluffChance = 0.30
      foldThreshold = 0.20
      raiseThreshold = 0.45
      break
    case 'balanced':
    default:
      bluffChance = 0.20
      foldThreshold = 0.28
      raiseThreshold = 0.58
      break
  }

  const isBluffing = bluffRoll < bluffChance

  if (isBluffing && !canCheck && strength < 0.4) {
    // Bluff: call or small raise
    if (Math.random() < 0.5 && ctx.myStack > toCall * 2) {
      const raiseAmount = Math.min(ctx.currentBetLevel * 2, ctx.myStack + ctx.myCurrentBet)
      return { action: 'raise', amount: raiseAmount }
    }
    return toCall > 0 ? { action: 'call' } : { action: 'check' }
  }

  if (canCheck) {
    if (strength >= raiseThreshold && ctx.myStack > 0) {
      const raiseAmount = Math.min(
        Math.round(ctx.currentBetLevel * (1 + Math.random())),
        ctx.myStack,
      )
      return { action: 'raise', amount: Math.max(raiseAmount, ctx.currentBetLevel) }
    }
    return { action: 'check' }
  }

  // There's a bet to call
  if (strength < foldThreshold && potOdds > strength) {
    return { action: 'fold' }
  }

  if (strength >= raiseThreshold && ctx.myStack > toCall) {
    const raiseAmount = Math.min(ctx.currentBetLevel * 2, ctx.myStack + ctx.myCurrentBet)
    return { action: 'raise', amount: raiseAmount }
  }

  if (toCall >= ctx.myStack) {
    return strength > foldThreshold ? { action: 'all-in' } : { action: 'fold' }
  }

  return { action: 'call' }
}

export function computeAIDropChoice(holeCards: [Card, Card, Card], communityCards: Card[]): 0 | 1 | 2 {
  // Try dropping each card and see which 2-card combination gives the best potential
  let bestScore = -1
  let bestDropIndex: 0 | 1 | 2 = 0

  for (let i = 0; i < 3; i++) {
    const kept = holeCards.filter((_, idx) => idx !== i)
    const result = best5of([...kept, ...communityCards])
    if (result.score > bestScore) {
      bestScore = result.score
      bestDropIndex = i as 0 | 1 | 2
    }
  }

  // Actually we want to DROP the card that leaves us with the best remaining hand
  // The above computes best hand with 2 kept cards + community; return which to drop
  return bestDropIndex === 0 ? 0 : bestDropIndex === 1 ? 1 : 2
}

// Counterintuitively, we want to DROP the card that, when removed, gives us
// the WORST remaining hand — wait, no. We want to keep the best cards.
// So: drop index = the one whose removal yields the BEST 2-card + community hand.
// That's correct above: for each i, we check the hand without card[i], take the best.
// Actually: drop the card whose *absence* maximizes hand strength.
// The loop above does exactly this. But we're returning the index with the best score,
// which means "drop card i to get this score" — that's the card we WANT to keep removed.
// Wait: if dropping card 0 gives score X, dropping card 1 gives Y, dropping card 2 gives Z,
// we want to drop the card that gives the HIGHEST remaining score (best 2-card hand).
// So bestDropIndex is correct — it's the index to drop that gives the best remaining hand.
export function randomPersonality(): AIPersonality {
  const options: AIPersonality[] = ['tight', 'aggressive', 'balanced']
  return options[Math.floor(Math.random() * options.length)]
}
