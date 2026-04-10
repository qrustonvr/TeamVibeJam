import { useState } from 'react'
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

  // Singleplayer hook
  const solo = useDropGame()

  // Multiplayer hook
  const [mpState, mpActions] = useSocket()

  const appendLog = (msg: string) => setLog(prev => [...prev.slice(-49), msg])

  // ─── Mode: solo ──────────────────────────────────────────────────────────

  if (mode === 'solo') {
    const { state, isYourTurn, isYourDropTurn, yourCards, startGame: _unused, playerAction, dropCard, reset, omens, omenMappings, showdownPlayers } = solo
    void _unused

    const seats: PublicSeat[] = state.seats.map(s => ({
      seatIndex: s.seatIndex,
      displayName: s.displayName,
      stack: s.stack,
      currentBet: s.currentBet,
      totalBetThisHand: s.totalBetThisHand,
      folded: s.folded,
      allIn: s.allIn,
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
          playerName={state.seats[0]?.displayName}
          playerStack={state.seats[0]?.stack}
          playerLastAction={state.seats[0]?.lastAction ?? null}
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
            actionDeadline={null}
            handWinners={handWinners}
            log={log}
            dropsReceived={state.seats.filter(s => !s.folded && s.hasDropped).length}
            activeBrew={state.activeBrew}
            omens={omens}
            omenMappings={omenMappings}
            showdownPlayers={showdownPlayers}
            onAction={(action, amount) => {
              appendLog(`You ${action}${amount ? ` ${amount}` : ''}`)
              playerAction(action, amount)
            }}
            onDropCard={(idx) => {
              appendLog('You dropped a card')
              dropCard(idx)
            }}
          />
        </div>
        <BrewSidebar open={brewOpen} onToggle={() => setBrewOpen(o => !o)} activeBrew={state.activeBrew} />
      </div>
    )
  }

  // ─── Mode: multiplayer ───────────────────────────────────────────────────

  if (mode === 'multiplayer') {
    const { gameState, connectionStatus, roomCode, seatIndex, error, log: mpLog } = mpState
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

    const handWinners: HandWinner[] = []
    const activeBrew = gameState.activeBrew as BrewResult | null | undefined

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', gap: 0 }}>
        <FiendSidebar
          dropZone={gameState.dropZone}
          activeBrew={activeBrew}
          phase={gameState.phase}
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
          handWinners={handWinners}
          log={mpLog}
          dropsReceived={gameState.seats.filter(s => !s.folded && s.hasDropped).length}
          activeBrew={activeBrew}
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
