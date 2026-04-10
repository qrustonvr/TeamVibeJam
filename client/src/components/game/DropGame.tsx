import { useState, useEffect, useRef } from 'react'
import { useDropGame } from '@/hooks/useDropGame'
import { useSocket } from '@/hooks/useSocket'
import { Lobby } from './drop/Lobby'
import { WaitingRoom } from './drop/WaitingRoom'
import { TableView } from './drop/TableView'
import { ConnectionStatus } from './drop/ConnectionStatus'
import { BrewSidebar } from './drop/BrewSidebar'
import { FiendSidebar } from './drop/FiendSidebar'
import type { HandWinner, PublicSeat, BrewResult } from '@shared/gameTypes'

type GameMode = 'idle' | 'solo' | 'multiplayer'

const BETTING_PHASES = ['betting_1','betting_2','betting_3','betting_4','betting_5']

export function DropGame() {
  const [mode, setMode] = useState<GameMode>('idle')
  const [log, setLog] = useState<string[]>([])
  const [brewOpen, setBrewOpen] = useState(false)
  const [chatBubbles, setChatBubbles] = useState<Record<number, string>>({})
  const chatTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  // Singleplayer hook
  const solo = useDropGame()

  // Solo turn deadline — resets to 20 s whenever the player's turn starts
  const [soloDeadline, setSoloDeadline] = useState<number | null>(null)
  const soloTurnActiveRef = useRef(false)
  useEffect(() => {
    const active = solo.isYourTurn || solo.isYourDropTurn
    if (active && !soloTurnActiveRef.current) {
      soloTurnActiveRef.current = true
      setSoloDeadline(Date.now() + 20_000)
    } else if (!active) {
      soloTurnActiveRef.current = false
      setSoloDeadline(null)
    }
  }, [solo.isYourTurn, solo.isYourDropTurn])

  // ─── Solo game log — watches state changes and emits lines ──────────────

  type LogPrev = {
    phase: string
    roundNumber: number
    actions: Record<number, string | null>
    hasDropped: Record<number, boolean>
    handWinners: null | Array<{ seatIndex: number; handName: string; potWon: number }>
    eliminated: Record<number, boolean>
  }
  const logPrevRef = useRef<LogPrev>({
    phase: '', roundNumber: 0, actions: {}, hasDropped: {}, handWinners: null, eliminated: {},
  })

  useEffect(() => {
    if (mode !== 'solo') return
    const s = solo.state
    const prev = logPrevRef.current
    const lines: string[] = []

    const seatName = (idx: number) =>
      idx === 0 ? 'You' : (s.seats[idx]?.displayName ?? `Seat ${idx}`)

    // New hand
    if (s.roundNumber !== prev.roundNumber) {
      if (s.roundNumber > 0) lines.push(`━━ Hand #${s.roundNumber} ━━`)
      prev.roundNumber = s.roundNumber
      prev.actions = {}
      prev.hasDropped = {}
    }

    // Phase transitions
    if (s.phase !== prev.phase) {
      const cc = s.communityCards
      if (s.phase === 'flop' && cc.length >= 3)
        lines.push(`Flop: ${cc.slice(0,3).map(c => c.display).join(' ')}`)
      else if (s.phase === 'turn' && cc.length >= 4)
        lines.push(`Turn: ${cc[3].display}`)
      else if (s.phase === 'river' && cc.length >= 5)
        lines.push(`River: ${cc[4].display}`)
      else if (s.phase === 'drop')
        lines.push('— Drop phase: sacrifice a card —')
      else if (s.phase === 'brew_reveal' && s.activeBrew)
        lines.push(`${s.activeBrew.icon} The Rite: ${s.activeBrew.name}`)

      // Reset action tracking at the start of each betting round
      if (['betting_1','betting_2','betting_3','betting_4','betting_5'].includes(s.phase))
        prev.actions = {}

      prev.phase = s.phase
    }

    // Betting actions (all seats)
    for (const seat of s.seats) {
      const curr = seat.lastAction ?? null
      const p = prev.actions[seat.seatIndex] ?? null
      if (curr && curr !== p) {
        const n = seatName(seat.seatIndex)
        if (curr === 'fold')    lines.push(`${n} folds`)
        else if (curr === 'check')  lines.push(`${n} checks`)
        else if (curr === 'call')   lines.push(`${n} calls ◆${seat.currentBet}`)
        else if (curr === 'raise')  lines.push(`${n} raises to ◆${seat.currentBet}`)
        else if (curr === 'all-in') lines.push(`${n} goes ALL IN ◆${seat.currentBet}`)
      }
      prev.actions[seat.seatIndex] = curr
    }

    // Drops
    for (const seat of s.seats) {
      if (seat.hasDropped && !prev.hasDropped[seat.seatIndex]) {
        lines.push(`${seatName(seat.seatIndex)} sacrificed a card`)
        prev.hasDropped[seat.seatIndex] = true
      }
    }

    // Hand winners
    if (s.handWinners && s.handWinners !== prev.handWinners) {
      for (const w of s.handWinners)
        lines.push(`${seatName(w.seatIndex)} wins ◆${w.potWon} — ${w.handName}`)
      prev.handWinners = s.handWinners
    }

    // Eliminations
    for (const seat of s.seats) {
      if (seat.eliminated && !prev.eliminated[seat.seatIndex]) {
        lines.push(`☠ ${seatName(seat.seatIndex)} eliminated`)
        prev.eliminated[seat.seatIndex] = true
      }
    }

    if (lines.length > 0)
      setLog(p => [...p.slice(-(50 - lines.length)), ...lines])
  }, [solo.state, mode])

  const handleChat = (seatIndex: number, message: string, displayName: string) => {
    // Show bubble on portrait — auto-clear after 5 s
    if (chatTimers.current[seatIndex]) clearTimeout(chatTimers.current[seatIndex])
    setChatBubbles(prev => ({ ...prev, [seatIndex]: message }))
    chatTimers.current[seatIndex] = setTimeout(() => {
      setChatBubbles(prev => { const n = { ...prev }; delete n[seatIndex]; return n })
    }, 5000)
    // Log it
    setLog(prev => [...prev.slice(-49), `${displayName}: ${message}`])
  }

  // Multiplayer hook
  const [mpState, mpActions] = useSocket()

  // ─── Mode: solo ──────────────────────────────────────────────────────────

  if (mode === 'solo') {
    const { state, isYourTurn, isYourDropTurn, yourCards, startGame: _unused, playerAction, dropCard, reset, omens, omenMappings, showdownPlayers, nextHand } = solo
    void _unused

    const seats: PublicSeat[] = state.seats.map(s => ({
      seatIndex: s.seatIndex,
      displayName: s.displayName,
      stack: s.stack,
      currentBet: s.currentBet,
      totalBetThisHand: s.totalBetThisHand,
      folded: s.folded,
      allIn: s.allIn,
      eliminated: s.eliminated,
      isConnected: true,
      hasDropped: s.hasDropped,
      cardCount: s.holeCards.length,
      lastAction: s.lastAction as (import('@shared/gameTypes').PlayerActionType | null),
      exposedCard: s.exposedCard,
    }))

    const handWinners: HandWinner[] = state.handWinners?.map(w => {
      const sp = showdownPlayers?.find(p => p.seatIndex === w.seatIndex)
      return {
        seatIndex: w.seatIndex,
        handName: w.handName,
        score: sp?.score ?? 0,
        potWon: w.potWon,
        holeCards: sp?.holeCards ?? state.seats[w.seatIndex]?.holeCards ?? [],
        bestHandCards: sp?.bestHandCards ?? [],
      }
    }) ?? []

    if (state.phase === 'lobby') {
      return (
        <Lobby
          onStartSolo={(aiCount) => {
            solo.startGame(aiCount)
            setLog([])
            logPrevRef.current = { phase: '', roundNumber: 0, actions: {}, hasDropped: {}, handWinners: null, eliminated: {} }
          }}
          onCreateRoom={() => { setMode('multiplayer'); mpActions.createRoom('', 4) }}
          onJoinRoom={() => { setMode('multiplayer') }}
        />
      )
    }

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', gap: 0 }}>
        <FiendSidebar
          dropZone={state.dropZone}
          activeBrew={state.activeBrew}
          omens={omens}
          phase={state.phase}
          seats={seats}
          yourSeatIndex={0}
          activeSeatIndex={state.activeSeatIndex}
          actionDeadline={soloDeadline}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', alignItems: 'center' }}>
            <button
              onClick={() => { reset(); setMode('idle') }}
              style={{
                padding: '3px 10px', fontSize: 11, borderRadius: 4,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              ← Lobby
            </button>
          </div>
          <TableView
            phase={state.phase}
            seats={seats}
            communityCards={state.communityCards}
            dropZone={state.dropZone}
            pot={state.pot}
            currentBetLevel={state.currentBetLevel}
            activeSeatIndex={state.activeSeatIndex}
            yourCards={yourCards}
            yourSeatIndex={0}
            isYourTurn={isYourTurn}
            isYourDropTurn={isYourDropTurn}
            actionDeadline={soloDeadline}
            handWinners={handWinners}
            log={log}
            dropsReceived={state.seats.filter(s => !s.folded && s.hasDropped).length}
            activeBrew={state.activeBrew}
            omens={omens}
            omenMappings={omenMappings}
            showdownPlayers={showdownPlayers}
            onAction={(action, amount) => { playerAction(action, amount) }}
            onDropCard={(idx) => { dropCard(idx) }}
            onNextHand={() => { nextHand() }}
            chatBubbles={chatBubbles}
            onChat={(msg) => handleChat(0, msg, 'You')}
          />
        </div>
        <BrewSidebar open={brewOpen} onToggle={() => setBrewOpen(o => !o)} activeBrew={state.activeBrew} />
      </div>
    )
  }

  // ─── Mode: multiplayer ───────────────────────────────────────────────────

  if (mode === 'multiplayer') {
    const { gameState, connectionStatus, roomCode, seatIndex, error, log: mpLog,
            handWinners: mpHandWinners, showdownPlayers: mpShowdownPlayers,
            omens: mpOmens, myOmenMappings } = mpState
    const { createRoom, joinRoom, startGame, sendAction, dropCard, clearError, disconnect } = mpActions

    if (!gameState || gameState.phase === 'lobby') {
      if (roomCode && gameState) {
        const isHost = seatIndex === gameState.hostSeatIndex
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '4px 12px', display: 'flex', justifyContent: 'flex-end' }}>
              <ConnectionStatus status={connectionStatus} roomCode={roomCode} />
            </div>
            <WaitingRoom
              roomCode={roomCode}
              seats={gameState.seats}
              isHost={isHost}
              onStartGame={startGame}
              onLeave={() => { disconnect(); setMode('idle') }}
            />
          </div>
        )
      }

      return (
        <Lobby
          onStartSolo={(aiCount) => {
            setMode('solo')
            solo.startGame(aiCount)
            setLog([])
          }}
          onCreateRoom={(name, max) => { createRoom(name, max) }}
          onJoinRoom={(code, name) => { joinRoom(code, name) }}
          isConnecting={connectionStatus === 'connecting'}
          error={error}
        />
      )
    }

    if (!gameState) return null

    const isYourTurn = gameState.activeSeatIndex === seatIndex &&
      BETTING_PHASES.includes(gameState.phase)
    const isYourDropTurn = gameState.phase === 'drop' &&
      !gameState.seats.find(s => s.seatIndex === seatIndex)?.hasDropped

    const activeBrew = gameState.activeBrew as BrewResult | null | undefined

    // Build omenMappings in the same shape as solo: BrewModifier[][]
    // Server only sends this player's own mappings; fill the rest with empty
    const mpOmenMappings: import('@shared/gameTypes').BrewModifier[][] = gameState.seats.map(s =>
      s.seatIndex === (seatIndex ?? 0) ? myOmenMappings : []
    )

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', gap: 0 }}>
        <FiendSidebar
          dropZone={gameState.dropZone}
          activeBrew={activeBrew}
          omens={mpOmens}
          phase={gameState.phase}
          seats={gameState.seats}
          yourSeatIndex={seatIndex ?? 0}
          activeSeatIndex={gameState.activeSeatIndex}
          actionDeadline={gameState.actionDeadline}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '4px 12px', alignItems: 'center',
        }}>
          <button
            onClick={() => { disconnect(); clearError(); setMode('idle') }}
            style={{
              padding: '3px 10px', fontSize: 11, borderRadius: 4,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            ← Lobby
          </button>
          <ConnectionStatus status={connectionStatus} roomCode={roomCode} />
        </div>

        {error && (
          <div style={{
            margin: '4px 12px', padding: '6px 12px', borderRadius: 4,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)',
            color: '#fca5a5', fontFamily: 'var(--font-body)', fontSize: 11,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {error}
            <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        {connectionStatus === 'reconnecting' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 20, letterSpacing: 2,
          }}>
            Reconnecting…
          </div>
        )}

        <TableView
          phase={gameState.phase}
          seats={gameState.seats}
          communityCards={gameState.communityCards}
          dropZone={gameState.dropZone}
          pot={gameState.pot}
          currentBetLevel={gameState.currentBetLevel}
          activeSeatIndex={gameState.activeSeatIndex}
          yourCards={gameState.yourCards}
          yourSeatIndex={seatIndex ?? 0}
          isYourTurn={isYourTurn}
          isYourDropTurn={isYourDropTurn}
          actionDeadline={gameState.actionDeadline}
          handWinners={mpHandWinners}
          log={mpLog}
          dropsReceived={gameState.seats.filter(s => !s.folded && s.hasDropped).length}
          activeBrew={activeBrew}
          omens={mpOmens}
          omenMappings={mpOmenMappings}
          showdownPlayers={mpShowdownPlayers}
          onAction={(action, amount) => sendAction(action, amount)}
          onDropCard={(idx) => dropCard(idx as 0 | 1 | 2)}
        />
        </div>
        <BrewSidebar open={brewOpen} onToggle={() => setBrewOpen(o => !o)} activeBrew={activeBrew} />
      </div>
    )
  }

  // ─── Mode: idle (lobby) ──────────────────────────────────────────────────

  return (
    <Lobby
      onStartSolo={(aiCount) => {
        setMode('solo')
        solo.startGame(aiCount)
        setLog([])
      }}
      onCreateRoom={(name, max) => {
        setMode('multiplayer')
        mpActions.createRoom(name, max)
      }}
      onJoinRoom={(code, name) => {
        setMode('multiplayer')
        mpActions.joinRoom(code, name)
      }}
      isConnecting={mpState.connectionStatus === 'connecting'}
      error={mpState.error}
    />
  )
}
