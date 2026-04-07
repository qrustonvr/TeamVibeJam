import { useReducer, useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '@/context/GameContext'
import { useSound } from '@/hooks/useSound'
import {
  GauntletState,
  GauntletPhase,
  CardResult,
  PlayerStats,
  RoundResult,
  initialGauntletState,
  defaultPlayerStats,
  Card,
} from '@/types/gauntlet'
import { GAME_CONFIG } from '@/utils/constants'
import { buildShuffledDeck, compareCards } from '@/utils/deck'
import { loadStats, saveStats, saveBalance, clearAll } from '@/utils/storage'
import { GauntletRow } from './gauntlet/GauntletRow'
import { MultiplierTrail } from './gauntlet/MultiplierTrail'
import { ChampionArea } from './gauntlet/ChampionArea'
import { BettingPanel } from './gauntlet/BettingPanel'
import { ActionButtons } from './gauntlet/ActionButtons'
import { ResultOverlay } from './gauntlet/ResultOverlay'
import { StatsPanel } from './gauntlet/StatsPanel'
import { OddsDisplay } from './gauntlet/OddsDisplay'

// ─── Gauntlet Reducer ────────────────────────────────────────────────────────

type GauntletAction =
  | { type: 'DEAL'; playerCard: Card; gauntletCards: Card[]; baseBet: number }
  | { type: 'START_GAUNTLET' }
  | { type: 'FLIP_CARD'; result: CardResult; revealedCard: Card }
  | { type: 'ADVANCE_WIN' }
  | { type: 'ADVANCE_LOSE' }
  | { type: 'COLLECT' }
  | { type: 'RESET' }

function gauntletReducer(state: GauntletState, action: GauntletAction): GauntletState {
  switch (action.type) {
    case 'DEAL':
      return {
        ...initialGauntletState,
        phase: 'dealing' as GauntletPhase,
        playerCard: action.playerCard,
        gauntletCards: action.gauntletCards,
        baseBet: action.baseBet,
        currentPot: action.baseBet,
      }
    case 'START_GAUNTLET':
      return { ...state, phase: 'gauntlet' }
    case 'FLIP_CARD': {
      const updated = state.gauntletCards.map((c, i) =>
        i === state.currentPosition ? { ...action.revealedCard, faceUp: true } : c
      )
      return {
        ...state,
        gauntletCards: updated,
        result: action.result,
      }
    }
    case 'ADVANCE_WIN': {
      const newPos = state.currentPosition + 1
      const newPot = state.currentPot * 2
      if (newPos >= 5) {
        return {
          ...state,
          currentPosition: newPos,
          currentPot: newPot,
          revealedCount: state.revealedCount + 1,
          phase: 'gauntlet-master',
        }
      }
      return {
        ...state,
        currentPosition: newPos,
        currentPot: newPot,
        revealedCount: state.revealedCount + 1,
        result: null,
      }
    }
    case 'ADVANCE_LOSE':
      return {
        ...state,
        revealedCount: state.revealedCount + 1,
        phase: 'lost',
      }
    case 'COLLECT':
      return { ...state, phase: 'collected' }
    case 'RESET':
      return { ...initialGauntletState }
    default:
      return state
  }
}

// ─── Sleep helper ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Stats updater ───────────────────────────────────────────────────────────

function applyRoundResult(
  prev: PlayerStats,
  round: RoundResult,
  newBalance: number,
): PlayerStats {
  const isLoss = round.outcome === 'loss'
  const newStreak = isLoss ? 0 : prev.currentStreak + round.cardsBeaten
  return {
    totalHands: prev.totalHands + 1,
    totalWins: isLoss ? prev.totalWins : prev.totalWins + 1,
    totalLosses: isLoss ? prev.totalLosses + 1 : prev.totalLosses,
    totalCollects: round.outcome === 'collected' ? prev.totalCollects + 1 : prev.totalCollects,
    gauntletMasters: round.outcome === 'gauntlet-master' ? prev.gauntletMasters + 1 : prev.gauntletMasters,
    biggestWin: Math.max(prev.biggestWin, round.payout),
    longestStreak: Math.max(prev.longestStreak, newStreak),
    currentStreak: newStreak,
    peakBalance: Math.max(prev.peakBalance, newBalance),
    roundHistory: [round, ...prev.roundHistory].slice(0, 20),
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Gauntlet() {
  const { state: gameState, dispatch: gameDispatch } = useGame()
  const { play, preload } = useSound()

  const [gs, gauntletDispatch] = useReducer(gauntletReducer, initialGauntletState)
  const [stats, setStats] = useState<PlayerStats>(() => loadStats())
  const [sessionStart] = useState(gameState.balance)

  // UI state
  const [localBet, setLocalBet] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showOdds, setShowOdds] = useState(false)

  // Animation state
  const [cardsVisible, setCardsVisible] = useState(false)
  const [championVisible, setChampionVisible] = useState(false)
  const [screenShake, setScreenShake] = useState(false)
  const [flashColor, setFlashColor] = useState<'red' | 'gold' | null>(null)
  const [liftedIndex, setLiftedIndex] = useState(-1)
  const [flippedIndex, setFlippedIndex] = useState(-1)
  const [trailFlash, setTrailFlash] = useState(-1)
  const [survivedCount, setSurvivedCount] = useState(0)
  const [resultVisible, setResultVisible] = useState(false)
  const [isMasterResult, setIsMasterResult] = useState(false)
  const [displayPot, setDisplayPot] = useState(0)

  // track current position for async closures
  const gsRef = useRef(gs)
  useEffect(() => { gsRef.current = gs }, [gs])

  // Preload all sounds on mount
  useEffect(() => {
    const sounds = [
      'card-deal', 'card-slide', 'card-flip', 'card-lift',
      'win-small', 'win-big', 'lose', 'clash',
      'chip-select', 'chip-stack', 'deal-button', 'advance-button',
      'collect-button', 'gauntlet-master', 'multiplier-up', 'ambient-loop',
    ]
    for (const name of sounds) {
      preload(name, `/TeamVibeJam/audio/${name}.mp3`)
    }
  }, [preload])

  // ── Handle chip click ──
  const handleChipClick = useCallback((value: number) => {
    play('chip-select')
    const newBet = Math.min(localBet + value, gameState.balance, GAME_CONFIG.MAX_BET)
    setLocalBet(newBet)
  }, [localBet, gameState.balance, play])

  const handleClearBet = useCallback(() => {
    setLocalBet(0)
  }, [])

  const handleAllIn = useCallback(() => {
    play('chip-stack')
    setLocalBet(Math.min(gameState.balance, GAME_CONFIG.MAX_BET))
  }, [gameState.balance, play])

  // ── DEAL ──
  const handleDeal = useCallback(async () => {
    if (isAnimating || localBet < GAME_CONFIG.MIN_BET) return
    setIsAnimating(true)
    setResultVisible(false)
    setIsMasterResult(false)
    setCardsVisible(false)
    setChampionVisible(false)
    setSurvivedCount(0)
    setTrailFlash(-1)
    setLiftedIndex(-1)
    setFlippedIndex(-1)
    setFlashColor(null)

    play('deal-button')
    gameDispatch({ type: 'PLACE_BET', amount: localBet })

    const deck = buildShuffledDeck()
    const playerCard = { ...deck[0], faceUp: true }
    const gauntletCards = deck.slice(1, 6).map(c => ({ ...c, faceUp: false }))

    gauntletDispatch({ type: 'DEAL', playerCard, gauntletCards, baseBet: localBet })
    setDisplayPot(localBet)
    setLocalBet(0)

    await sleep(300)

    // Champion slides in
    play('card-deal')
    setChampionVisible(true)
    await sleep(500)

    // Gauntlet cards slide in staggered
    setCardsVisible(true)
    for (let i = 0; i < 5; i++) {
      play('card-slide')
      await sleep(120)
    }
    await sleep(400)

    gauntletDispatch({ type: 'START_GAUNTLET' })
    setIsAnimating(false)
  }, [isAnimating, localBet, gameDispatch, play])

  // ── ADVANCE ──
  const handleAdvance = useCallback(async () => {
    const currentGs = gsRef.current
    if (isAnimating || currentGs.phase !== 'gauntlet' || !currentGs.playerCard) return
    setIsAnimating(true)

    play('advance-button')
    await sleep(300)

    // Lift card
    const pos = currentGs.currentPosition
    setLiftedIndex(pos)
    play('card-lift')
    await sleep(600)

    // Flip first half
    setLiftedIndex(-1)
    setFlippedIndex(pos)
    play('card-flip')
    await sleep(300)

    // Reveal card mid-flip
    const gauntletCard = currentGs.gauntletCards[pos]
    const result = compareCards(currentGs.playerCard, gauntletCard)
    const revealedCard = { ...gauntletCard, faceUp: true }
    gauntletDispatch({ type: 'FLIP_CARD', result, revealedCard })

    await sleep(300)
    setFlippedIndex(-1)
    await sleep(300)

    const isWin = result === 'win' || result === 'clash-win'

    if (isWin) {
      play(result === 'clash-win' ? 'clash' : 'win-small')

      gauntletDispatch({ type: 'ADVANCE_WIN' })
      const newCount = pos + 1
      setSurvivedCount(newCount)
      setDisplayPot(currentGs.baseBet * Math.pow(2, newCount))

      // Flash trail badge
      play('multiplier-up')
      setTrailFlash(pos)
      await sleep(450)
      setTrailFlash(-1)
      await sleep(300)

      if (newCount >= 5) {
        // Gauntlet Master!
        await handleGauntletMasterSequence(currentGs)
      } else {
        setIsAnimating(false)
      }
    } else {
      // LOSE
      play('lose')
      setFlashColor('red')
      setScreenShake(true)
      setTimeout(() => {
        setScreenShake(false)
        setFlashColor(null)
      }, 600)

      gauntletDispatch({ type: 'ADVANCE_LOSE' })
      setDisplayPot(0)

      await sleep(800)
      await sleep(500)

      // Tell GameContext we lost (balance already deducted at DEAL via PLACE_BET)
      gameDispatch({ type: 'LOSE' })

      const round: RoundResult = {
        champion: currentGs.playerCard,
        gauntletCards: currentGs.gauntletCards,
        bet: currentGs.baseBet,
        cardsBeaten: pos,
        outcome: 'loss',
        payout: 0,
      }
      const newBalance = gameState.balance - currentGs.baseBet
      setStats(prev => {
        const next = applyRoundResult(prev, round, Math.max(0, newBalance))
        saveStats(next)
        return next
      })
      saveBalance(Math.max(0, newBalance))

      setResultVisible(true)
      // isAnimating stays true until play again
    }
  }, [isAnimating, gameDispatch, gameState.balance, play])

  // ── Gauntlet Master sequence ──
  const handleGauntletMasterSequence = useCallback(async (currentGs: GauntletState) => {
    await sleep(500)

    // Gold flash
    setFlashColor('gold')
    play('gauntlet-master')
    await sleep(300)
    setFlashColor(null)

    // Wave trail badges
    for (let i = 0; i < 5; i++) {
      setTrailFlash(i)
      await sleep(200)
    }
    setTrailFlash(-1)

    const finalPot = currentGs.baseBet * 32
    setDisplayPot(finalPot)

    // Net gain = finalPot - baseBet (baseBet already deducted)
    const netGain = finalPot - currentGs.baseBet
    gameDispatch({ type: 'WIN', payout: netGain })

    const newBalance = gameState.balance + netGain
    saveBalance(newBalance)

    const round: RoundResult = {
      champion: currentGs.playerCard!,
      gauntletCards: currentGs.gauntletCards,
      bet: currentGs.baseBet,
      cardsBeaten: 5,
      outcome: 'gauntlet-master',
      payout: finalPot,
    }
    setStats(prev => {
      const next = applyRoundResult(prev, round, newBalance)
      saveStats(next)
      return next
    })

    await sleep(2800)
    setIsMasterResult(true)
    setResultVisible(true)
  }, [gameDispatch, gameState.balance, play])

  // ── COLLECT ──
  const handleCollect = useCallback(async () => {
    const currentGs = gsRef.current
    if (isAnimating || currentGs.phase !== 'gauntlet' || currentGs.currentPosition === 0) return
    setIsAnimating(true)

    play('collect-button')
    gauntletDispatch({ type: 'COLLECT' })

    await sleep(800)

    const pot = currentGs.currentPot
    const netGain = pot - currentGs.baseBet
    gameDispatch({ type: 'WIN', payout: netGain })

    const newBalance = gameState.balance + netGain
    saveBalance(newBalance)

    const round: RoundResult = {
      champion: currentGs.playerCard!,
      gauntletCards: currentGs.gauntletCards,
      bet: currentGs.baseBet,
      cardsBeaten: currentGs.currentPosition,
      outcome: 'collected',
      payout: pot,
    }
    setStats(prev => {
      const next = applyRoundResult(prev, round, newBalance)
      saveStats(next)
      return next
    })

    play('win-big')
    setFlashColor('gold')
    await sleep(600)
    setFlashColor(null)

    await sleep(300)
    setResultVisible(true)
  }, [isAnimating, gameDispatch, gameState.balance, play])

  // ── PLAY AGAIN ──
  const handleReset = useCallback(() => {
    gauntletDispatch({ type: 'RESET' })
    setResultVisible(false)
    setIsMasterResult(false)
    setCardsVisible(false)
    setChampionVisible(false)
    setSurvivedCount(0)
    setTrailFlash(-1)
    setLiftedIndex(-1)
    setFlippedIndex(-1)
    setFlashColor(null)
    setDisplayPot(0)
    setIsAnimating(false)
  }, [])

  // ── REBUY ──
  const handleRebuy = useCallback(() => {
    gameDispatch({ type: 'RESET' })
    saveBalance(GAME_CONFIG.STARTING_BALANCE)
    handleReset()
  }, [gameDispatch, handleReset])

  // ── STATS RESET ──
  const handleStatsReset = useCallback(() => {
    clearAll()
    setStats({ ...defaultPlayerStats })
    gameDispatch({ type: 'RESET' })
    handleReset()
  }, [gameDispatch, handleReset])

  const inGauntlet = gs.phase === 'gauntlet'
  const inBetting = gs.phase === 'betting' || gs.phase === 'dealing'
  const revealedCards = gs.gauntletCards.filter(c => c.faceUp)

  return (
    <div
      className={[
        'relative w-full h-full flex flex-col overflow-hidden',
        screenShake ? 'animate-screen-shake' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ minHeight: '520px' }}
    >
      {/* ── Flash overlays ── */}
      {flashColor === 'red' && (
        <div
          className="absolute inset-0 pointer-events-none z-40 animate-red-flash"
          style={{ background: '#dc2626' }}
        />
      )}
      {flashColor === 'gold' && (
        <div
          className="absolute inset-0 pointer-events-none z-40 animate-gold-flash"
          style={{ background: '#d4af37' }}
        />
      )}

      {/* ── Top mini-bar ── */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-1"
        style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}
      >
        <span
          className="font-display text-sm tracking-[0.25em] uppercase animate-glow"
          style={{ color: 'var(--gold)' }}
        >
          THE GAUNTLET
        </span>
        <div className="flex items-center gap-2">
          {/* Odds toggle */}
          <button
            onClick={() => setShowOdds(v => !v)}
            title="Toggle odds display"
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all duration-150 hover:scale-110"
            style={{
              background: showOdds ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(212,175,55,0.2)',
              color: showOdds ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
            }}
          >
            ⚙
          </button>
          {/* Stats toggle */}
          <button
            onClick={() => setShowStats(true)}
            title="View statistics"
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all duration-150 hover:scale-110"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(212,175,55,0.2)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            📊
          </button>
        </div>
      </div>

      {/* ── Odds display ── */}
      {showOdds && inGauntlet && gs.playerCard && (
        <div className="flex justify-center pt-1">
          <OddsDisplay champion={gs.playerCard} revealedCards={revealedCards} />
        </div>
      )}

      {/* ── Main game area — scrollable on tiny screens ── */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto pb-2">
        {/* Gauntlet row */}
        <div className="pt-3 pb-1">
          <GauntletRow
            cards={gs.gauntletCards}
            currentPosition={gs.currentPosition}
            phase={gs.phase}
            result={gs.result}
            liftedIndex={liftedIndex}
            flippedIndex={flippedIndex}
            cardsVisible={cardsVisible}
          />
        </div>

        {/* Multiplier trail */}
        <MultiplierTrail
          survivedCount={survivedCount}
          flashIndex={trailFlash}
          phase={gs.phase}
        />

        {/* Champion + pot */}
        <div className="py-1">
          <ChampionArea
            card={gs.playerCard}
            currentPot={gs.currentPot}
            displayPot={displayPot}
            baseBet={gs.baseBet}
            currentPosition={gs.currentPosition}
            phase={gs.phase}
            cardVisible={championVisible}
          />
        </div>

        {/* Action area */}
        <div className="pt-1">
          {inBetting ? (
            <BettingPanel
              bet={localBet}
              balance={gameState.balance}
              isAnimating={isAnimating}
              onChipClick={handleChipClick}
              onClearBet={handleClearBet}
              onAllIn={handleAllIn}
              onDeal={handleDeal}
              onRebuy={handleRebuy}
            />
          ) : inGauntlet ? (
            <ActionButtons
              position={gs.currentPosition}
              currentPot={gs.currentPot}
              isAnimating={isAnimating}
              onAdvance={handleAdvance}
              onCollect={handleCollect}
            />
          ) : null}
        </div>
      </div>

      {/* ── Result overlay ── */}
      {resultVisible && (
        <ResultOverlay
          gs={gs}
          isMaster={isMasterResult}
          onPlayAgain={handleReset}
        />
      )}

      {/* ── Stats panel ── */}
      <StatsPanel
        open={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        balance={gameState.balance}
        sessionStart={sessionStart}
        onReset={handleStatsReset}
      />
    </div>
  )
}
