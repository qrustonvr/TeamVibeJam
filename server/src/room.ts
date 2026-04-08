import { v4 as uuidv4 } from 'uuid'
import type WebSocket from 'ws'
import type { ServerMessage } from '@shared/protocol.js'
import type { DropPhase } from '@shared/gameTypes.js'
import { ANTE_AMOUNT, ACTION_TIMER_MS, DROP_TIMER_MS, PAYOUT_PAUSE_MS, RECONNECT_HOLD_MS } from '@shared/constants.js'
import {
  dealHand, dealFlop, dealTurn, dealRiver, dealCardToPlayers, resetDropState,
  validateAction, applyAction, isBettingRoundComplete,
  startBettingRound, nextBettingPlayer,
  applyDrop, allHaveDropped, revealDropZone, runShowdown,
  getValidActions, rotateDealerIndex, anyActivePlayersHaveChips, autoDropChoice,
  nextUndroppedSeat,
} from './gameEngine.js'
import { assignSession, lookupSession, scheduleExpiry, cancelExpiry } from './sessionStore.js'
import type { ServerRoomState, ServerSeat } from './types.js'
import { seatToPublic } from './types.js'

export class Room {
  state: ServerRoomState

  constructor(code: string, maxPlayers: number, hostSeatIndex: number) {
    this.state = {
      code,
      phase: 'lobby',
      seats: [],
      deck: [],
      communityCards: [],
      dropZone: [],
      pot: 0,
      currentBetLevel: ANTE_AMOUNT,
      activeSeatIndex: -1,
      dealerIndex: 0,
      roundNumber: 0,
      hostSeatIndex,
      maxPlayers,
      actionTimer: null,
      lastActivityAt: Date.now(),
      actionDeadline: null,
      roundActedSeats: new Set(),
    }
  }

  // ─── Player management ───────────────────────────────────────────────────

  addPlayer(ws: WebSocket, displayName: string): { seat: ServerSeat; token: string } {
    const seatIndex = this.state.seats.length
    const token = uuidv4()
    const seat: ServerSeat = {
      seatIndex,
      displayName,
      stack: 1000,
      currentBet: 0,
      totalBetThisHand: 0,
      folded: false,
      allIn: false,
      isConnected: true,
      hasDropped: false,
      holeCards: [] as unknown as [import('@shared/gameTypes.js').Card, import('@shared/gameTypes.js').Card, import('@shared/gameTypes.js').Card],
      droppedCard: null,
      sessionToken: token,
      ws,
      lastAction: null,
    }
    this.state.seats.push(seat)
    assignSession(token, seatIndex, this.state.code)
    return { seat, token }
  }

  findSeatByWs(ws: WebSocket): ServerSeat | null {
    return this.state.seats.find(s => s.ws === ws) ?? null
  }

  findSeatByToken(token: string): ServerSeat | null {
    const entry = lookupSession(token, this.state.code)
    if (!entry) return null
    return this.state.seats[entry.seatIndex] ?? null
  }

  // ─── Broadcast helpers ───────────────────────────────────────────────────

  send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg))
    }
  }

  sendTo(seatIndex: number, msg: ServerMessage): void {
    const seat = this.state.seats[seatIndex]
    if (seat?.ws && seat.isConnected) this.send(seat.ws, msg)
  }

  broadcastAll(msg: ServerMessage): void {
    for (const seat of this.state.seats) {
      if (seat.ws && seat.isConnected) this.send(seat.ws, msg)
    }
  }

  broadcastState(): void {
    for (const seat of this.state.seats) {
      if (!seat.ws || !seat.isConnected) continue
      this.send(seat.ws, {
        type: 'ROOM_STATE',
        state: this.buildSnapshot(seat.seatIndex),
      })
    }
  }

  buildSnapshot(forSeatIndex: number): import('@shared/gameTypes.js').RoomSnapshot {
    const mySeat = this.state.seats[forSeatIndex]
    return {
      roomCode: this.state.code,
      phase: this.state.phase,
      seats: this.state.seats.map(seatToPublic),
      communityCards: this.state.communityCards,
      dropZone: this.state.dropZone,
      pot: this.state.pot,
      currentBetLevel: this.state.currentBetLevel,
      activeSeatIndex: this.state.activeSeatIndex,
      dealerIndex: this.state.dealerIndex,
      roundNumber: this.state.roundNumber,
      yourCards: mySeat ? [...mySeat.holeCards] : [],
      yourSeatIndex: forSeatIndex,
      actionDeadline: this.state.actionDeadline,
      hostSeatIndex: this.state.hostSeatIndex,
    }
  }

  logAndBroadcast(message: string): void {
    this.broadcastAll({ type: 'GAME_LOG', message })
  }

  // ─── Timer management ────────────────────────────────────────────────────

  clearTimer(): void {
    if (this.state.actionTimer) {
      clearTimeout(this.state.actionTimer)
      this.state.actionTimer = null
    }
    this.state.actionDeadline = null
  }

  startActionTimer(seatIndex: number): void {
    this.clearTimer()
    const deadline = Date.now() + ACTION_TIMER_MS
    this.state.actionDeadline = deadline
    this.state.actionTimer = setTimeout(() => {
      const seat = this.state.seats[seatIndex]
      if (!seat || seat.folded) return
      const validActions = getValidActions(this.state, seatIndex)
      const autoAction = validActions.includes('check') ? 'check' : 'fold'
      this.logAndBroadcast(`${seat.displayName} timed out — auto ${autoAction}`)
      this.processAction(seatIndex, { type: autoAction as 'check' | 'fold' })
    }, ACTION_TIMER_MS)
  }

  startDropTimer(seatIndex: number): void {
    this.clearTimer()
    const deadline = Date.now() + DROP_TIMER_MS
    this.state.actionDeadline = deadline
    this.state.actionTimer = setTimeout(() => {
      const seat = this.state.seats[seatIndex]
      if (!seat || seat.hasDropped || seat.folded) {
        // Try to find next un-dropped seat
        const next = nextUndroppedSeat(this.state)
        if (next !== -1) this.startDropTimer(next)
        return
      }
      const cardIndex = autoDropChoice(seat)
      this.logAndBroadcast(`${seat.displayName} timed out — auto-dropping card`)
      this.processDrop(seatIndex, cardIndex)
    }, DROP_TIMER_MS)
  }

  // ─── Phase state machine ─────────────────────────────────────────────────

  startGame(): void {
    this.state.roundNumber = 0
    this.startHand()
  }

  startHand(): void {
    this.state.roundNumber++
    this.setPhase('deal')
    dealHand(this.state)

    // Send 2 hole cards privately to each player
    for (const seat of this.state.seats) {
      this.sendTo(seat.seatIndex, {
        type: 'HOLE_CARDS',
        seatIndex: seat.seatIndex,
        cards: seat.holeCards,
      })
      this.broadcastAll({ type: 'HOLE_CARDS_DEALT', seatIndex: seat.seatIndex })
    }

    // After deal animation, start pre-flop betting
    setTimeout(() => this.startBetting1(), 800)
  }

  startBetting1(): void {
    this.setPhase('betting_1')
    startBettingRound(this.state)
    this.broadcastState()
    this.promptCurrentPlayer()
  }

  startFlop(): void {
    this.setPhase('flop')
    const cards = dealFlop(this.state)
    this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: this.state.communityCards })
    this.logAndBroadcast(`Flop: ${cards.map(c => c.display).join(' ')}`)
    setTimeout(() => this.startBetting2(), 600)
  }

  startBetting2(): void {
    this.setPhase('betting_2')
    startBettingRound(this.state)
    this.broadcastState()
    this.promptCurrentPlayer()
  }

  startTurn(): void {
    this.setPhase('turn')
    const card = dealTurn(this.state)
    this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: this.state.communityCards })
    // Deal 1 extra hole card to each non-folded player, then prompt THE DROP
    resetDropState(this.state)
    dealCardToPlayers(this.state)
    for (const seat of this.state.seats) {
      if (!seat.folded) {
        this.sendTo(seat.seatIndex, {
          type: 'HOLE_CARDS',
          seatIndex: seat.seatIndex,
          cards: seat.holeCards,
        })
      }
    }
    this.logAndBroadcast(`Turn: ${card.display} — each player receives a new card`)
    setTimeout(() => this.startDrop1Phase(), 600)
  }

  startDrop1Phase(): void {
    this.setPhase('drop_1')
    this.broadcastState()
    this.logAndBroadcast('THE DROP (turn) — choose a card to send to the drop zone')
    const first = nextUndroppedSeat(this.state)
    if (first !== -1) this.startDropTimer(first)
  }

  startDrop1Reveal(): void {
    this.setPhase('drop_1_reveal')
    revealDropZone(this.state)
    this.broadcastAll({ type: 'DROP_REVEALED', dropZone: this.state.dropZone })
    this.logAndBroadcast(`Drop zone: ${this.state.dropZone.map(c => c.display).join(' ')}`)
    setTimeout(() => this.startBetting3(), 1200)
  }

  startBetting3(): void {
    this.setPhase('betting_3')
    startBettingRound(this.state)
    this.broadcastState()
    this.promptCurrentPlayer()
  }

  startRiver(): void {
    this.setPhase('river')
    const card = dealRiver(this.state)
    this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: this.state.communityCards })
    // Deal 1 extra hole card to each non-folded player, then prompt THE DROP again
    resetDropState(this.state)
    dealCardToPlayers(this.state)
    for (const seat of this.state.seats) {
      if (!seat.folded) {
        this.sendTo(seat.seatIndex, {
          type: 'HOLE_CARDS',
          seatIndex: seat.seatIndex,
          cards: seat.holeCards,
        })
      }
    }
    this.logAndBroadcast(`River: ${card.display} — each player receives a new card`)
    setTimeout(() => this.startDrop2Phase(), 600)
  }

  startDrop2Phase(): void {
    this.setPhase('drop_2')
    this.broadcastState()
    this.logAndBroadcast('THE DROP (river) — choose a card to send to the drop zone')
    const first = nextUndroppedSeat(this.state)
    if (first !== -1) this.startDropTimer(first)
  }

  startDrop2Reveal(): void {
    this.setPhase('drop_2_reveal')
    revealDropZone(this.state)
    this.broadcastAll({ type: 'DROP_REVEALED', dropZone: this.state.dropZone })
    this.logAndBroadcast(`Drop zone: ${this.state.dropZone.map(c => c.display).join(' ')}`)
    setTimeout(() => this.startBetting4(), 1200)
  }

  startBetting4(): void {
    this.setPhase('betting_4')
    startBettingRound(this.state)
    this.broadcastState()
    this.promptCurrentPlayer()
  }

  runShowdownPhase(): void {
    this.setPhase('showdown')
    this.clearTimer()

    const reveals = this.state.seats
      .filter(s => !s.folded)
      .map(s => ({ seatIndex: s.seatIndex, cards: [...s.holeCards] }))
    this.broadcastAll({ type: 'HOLE_CARDS_REVEAL', reveals })

    const winners = runShowdown(this.state)
    this.broadcastAll({
      type: 'HAND_RESULT',
      winners,
      allSeats: this.state.seats.map(seatToPublic),
    })
    this.logAndBroadcast(
      winners.map(w => `${this.state.seats[w.seatIndex].displayName} wins ${w.potWon} chips with ${w.handName}`).join(' | ')
    )

    setTimeout(() => this.endHand(), PAYOUT_PAUSE_MS)
  }

  endHand(): void {
    this.setPhase('payout')
    this.broadcastAll({ type: 'STACKS_UPDATE', seats: this.state.seats.map(seatToPublic) })

    // Remove players who are out
    const alive = this.state.seats.filter(s => s.stack > 0)
    if (alive.length < 2) {
      this.broadcastAll({ type: 'PHASE_CHANGE', phase: 'lobby' })
      this.state.phase = 'lobby'
      return
    }

    if (!anyActivePlayersHaveChips(this.state)) {
      this.broadcastAll({ type: 'PHASE_CHANGE', phase: 'lobby' })
      this.state.phase = 'lobby'
      return
    }

    rotateDealerIndex(this.state)
    setTimeout(() => this.startHand(), 2000)
  }

  setPhase(phase: DropPhase): void {
    this.state.phase = phase
    this.broadcastAll({ type: 'PHASE_CHANGE', phase })
    this.state.lastActivityAt = Date.now()
  }

  // ─── Betting flow ────────────────────────────────────────────────────────

  promptCurrentPlayer(): void {
    const idx = this.state.activeSeatIndex
    if (idx === -1) {
      this.advanceBettingPhase()
      return
    }
    const seat = this.state.seats[idx]
    const validActions = getValidActions(this.state, idx)
    const toCall = this.state.currentBetLevel - seat.currentBet
    const minRaise = this.state.currentBetLevel * 2

    this.broadcastAll({
      type: 'TURN_START',
      seatIndex: idx,
      deadline: Date.now() + ACTION_TIMER_MS,
      toCall,
      minRaise,
      pot: this.state.pot,
      validActions,
    })
    this.broadcastState()
    this.startActionTimer(idx)
  }

  processAction(seatIndex: number, action: { type: 'fold' | 'check' | 'call' | 'raise' | 'all-in'; amount?: number }): void {
    this.clearTimer()

    const validation = validateAction(this.state, seatIndex, action)
    if (!validation.ok) {
      this.sendTo(seatIndex, { type: 'ERROR', code: validation.code as import('@shared/protocol.js').ErrorCode, message: validation.message })
      return
    }

    const { netAmount } = applyAction(this.state, seatIndex, action)
    const seat = this.state.seats[seatIndex]

    this.broadcastAll({
      type: 'ACTION_ACK',
      seatIndex,
      action: action.type,
      amount: netAmount,
      pot: this.state.pot,
      currentBetLevel: this.state.currentBetLevel,
      stack: seat.stack,
    })
    this.logAndBroadcast(`${seat.displayName} ${action.type}${action.type === 'raise' ? ` to ${seat.currentBet}` : ''}`)

    // Check if only one player remains
    const notFolded = this.state.seats.filter(s => !s.folded)
    if (notFolded.length === 1) {
      this.runShowdownPhase()
      return
    }

    if (isBettingRoundComplete(this.state)) {
      this.advanceBettingPhase()
      return
    }

    nextBettingPlayer(this.state)
    this.promptCurrentPlayer()
  }

  advanceBettingPhase(): void {
    switch (this.state.phase) {
      case 'betting_1': this.startFlop(); break
      case 'betting_2': this.startTurn(); break
      case 'betting_3': this.startRiver(); break
      case 'betting_4': this.runShowdownPhase(); break
      default: break
    }
  }


  // ─── Drop flow ───────────────────────────────────────────────────────────

  processDrop(seatIndex: number, cardIndex: 0 | 1 | 2): void {
    const seat = this.state.seats[seatIndex]
    if (seat.hasDropped || seat.folded) return

    applyDrop(this.state, seatIndex, cardIndex)

    const dropsReceived = this.state.seats.filter(s => !s.folded && s.hasDropped).length
    const totalNeeded = this.state.seats.filter(s => !s.folded).length

    this.broadcastAll({ type: 'DROP_ACK', seatIndex, dropsReceived, totalNeeded })
    this.logAndBroadcast(`${seat.displayName} dropped a card`)

    if (allHaveDropped(this.state)) {
      this.clearTimer()
      if (this.state.phase === 'drop_1') {
        this.startDrop1Reveal()
      } else {
        this.startDrop2Reveal()
      }
    } else {
      // Start timer for next person who hasn't dropped
      const next = nextUndroppedSeat(this.state)
      if (next !== -1) this.startDropTimer(next)
    }
  }

  // ─── Disconnect / reconnect ──────────────────────────────────────────────

  handleDisconnect(ws: WebSocket): void {
    const seat = this.findSeatByWs(ws)
    if (!seat) return
    seat.isConnected = false
    seat.ws = null
    this.broadcastAll({ type: 'PLAYER_AWAY', seatIndex: seat.seatIndex, displayName: seat.displayName })
    this.logAndBroadcast(`${seat.displayName} disconnected`)

    // If it was their turn, auto-act
    if (this.state.phase.startsWith('betting') && this.state.activeSeatIndex === seat.seatIndex) {
      this.clearTimer()
      const validActions = getValidActions(this.state, seat.seatIndex)
      const autoAction = validActions.includes('check') ? 'check' : 'fold'
      this.processAction(seat.seatIndex, { type: autoAction as 'check' | 'fold' })
    }

    if ((this.state.phase === 'drop_1' || this.state.phase === 'drop_2') && !seat.hasDropped && !seat.folded) {
      this.clearTimer()
      const cardIndex = autoDropChoice(seat)
      this.processDrop(seat.seatIndex, cardIndex)
    }

    // Schedule removal if in lobby
    if (this.state.phase === 'lobby') {
      scheduleExpiry(seat.sessionToken, RECONNECT_HOLD_MS)
    }
  }

  handleReconnect(ws: WebSocket, token: string): boolean {
    const seat = this.findSeatByToken(token)
    if (!seat) return false
    seat.ws = ws
    seat.isConnected = true
    cancelExpiry(token)

    this.send(ws, { type: 'REJOIN_ACK', state: this.buildSnapshot(seat.seatIndex) })
    this.broadcastAll({ type: 'PLAYER_JOINED', seatIndex: seat.seatIndex, displayName: seat.displayName, seats: this.state.seats.map(seatToPublic) })

    return true
  }

  get isFull(): boolean {
    return this.state.seats.length >= this.state.maxPlayers
  }

  get isEmpty(): boolean {
    return this.state.seats.every(s => !s.isConnected)
  }

  get isPlaying(): boolean {
    return this.state.phase !== 'lobby'
  }
}
