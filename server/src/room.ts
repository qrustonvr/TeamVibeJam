import { v4 as uuidv4 } from 'uuid'
import type WebSocket from 'ws'
import type { ServerMessage } from '@shared/protocol.js'
import type { DropPhase, Card, BrewModifier } from '@shared/gameTypes.js'
import { ANTE_AMOUNT, ACTION_TIMER_MS, DROP_TIMER_MS, PAYOUT_PAUSE_MS, RECONNECT_HOLD_MS } from '@shared/constants.js'
import {
  dealHand, dealFlop, dealTurn, dealRiver,
  validateAction, applyAction, isBettingRoundComplete,
  startBettingRound, nextBettingPlayer,
  applyDrop, allHaveDropped, collectDropZone,
  applyNuke, applyBleedingPot, applyJackpot, applyGraveDig, applyUnderdog, applySabotage,
  runShowdown,
  getValidActions, rotateDealerIndex, anyActivePlayersHaveChips, autoDropChoice,
  nextUndroppedSeat,
} from './gameEngine.js'
import { brewFromModifier } from './brewEngine.js'
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
      activeBrew: null,
      nextAnteMultiplier: 1,
      turnIsHidden: false,
      maxBetOverride: 0,
      omens: [],
      omenMappings: [],
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
      holeCards: [] as unknown as [Card, Card, Card],
      droppedCard: null,
      exposedCard: null,
      votedOmen: null,
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
    // For BLACKOUT: mask the turn card (index 3) as face-down placeholder
    let communityCards = this.state.communityCards
    if (this.state.turnIsHidden && communityCards.length >= 4) {
      communityCards = [
        ...communityCards.slice(0, 3),
        { rankIndex: -1, suit: '?', display: '?' },
        ...communityCards.slice(4),
      ]
    }
    return {
      roomCode: this.state.code,
      phase: this.state.phase,
      seats: this.state.seats.map(seatToPublic),
      communityCards,
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
      activeBrew: this.state.activeBrew,
      nextAnteMultiplier: this.state.nextAnteMultiplier,
      turnIsHidden: this.state.turnIsHidden,
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
  //
  // New flow:
  //   deal (3 cards) → betting_1 (pre-flop)
  //   → flop → betting_2 (post-flop, BEFORE drop)
  //   → drop → brew_reveal → betting_3 (post-brew)
  //   → turn → betting_4
  //   → river → betting_5
  //   → showdown → payout

  startGame(): void {
    this.state.roundNumber = 0
    this.startHand()
  }

  startHand(): void {
    this.state.roundNumber++
    this.setPhase('deal')
    dealHand(this.state)

    // Generate 3 omens for this hand
    const ALL_MODIFIERS: BrewModifier[] = [
      'nuke', 'chain-lightning', 'royal-tax', 'underdog', 'bleeding-pot',
      'grave-dig', 'jackpot', 'sabotage', 'fire-sale', 'blackout',
    ]
    const shuffled = [...ALL_MODIFIERS].sort(() => Math.random() - 0.5)
    this.state.omens = shuffled.slice(0, 3)

    // Generate private omen mappings (shuffled assignment of the 3 omens to each seat's 3 card slots)
    this.state.omenMappings = []
    for (const seat of this.state.seats) {
      this.state.omenMappings[seat.seatIndex] = [...this.state.omens].sort(() => Math.random() - 0.5)
    }

    // Send 3 hole cards privately to each player
    for (const seat of this.state.seats) {
      this.sendTo(seat.seatIndex, {
        type: 'HOLE_CARDS',
        seatIndex: seat.seatIndex,
        cards: seat.holeCards,
      })
      this.broadcastAll({ type: 'HOLE_CARDS_DEALT', seatIndex: seat.seatIndex })
    }

    setTimeout(() => this.startOmensReveal(), 800)
  }

  startOmensReveal(): void {
    this.setPhase('omens-reveal')
    this.broadcastAll({ type: 'OMENS_REVEALED', omens: this.state.omens })
    // Send private card-to-omen mappings to each player
    for (const seat of this.state.seats) {
      this.sendTo(seat.seatIndex, {
        type: 'OMEN_MAPPINGS',
        mappings: this.state.omenMappings[seat.seatIndex] ?? [],
      })
    }
    this.logAndBroadcast(`Omens: ${this.state.omens.join(' · ')}`)
    setTimeout(() => this.startBetting1(), 3000)
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

  startDropPhase(): void {
    this.setPhase('drop')
    this.broadcastState()
    this.logAndBroadcast('THE DROP — choose a card to send to the Brew')
    this.broadcastAll({ type: 'DROP_PROMPT', deadline: Date.now() + DROP_TIMER_MS })
    const first = nextUndroppedSeat(this.state)
    if (first !== -1) this.startDropTimer(first)
  }

  startBrewReveal(): void {
    this.clearTimer()
    collectDropZone(this.state)

    // Tally omen votes to determine the modifier
    const voteTally: Record<string, number> = {}
    for (const seat of this.state.seats) {
      if (!seat.folded && seat.votedOmen) {
        voteTally[seat.votedOmen] = (voteTally[seat.votedOmen] ?? 0) + 1
      }
    }

    // Winning omen = most votes; ties broken randomly among tied omens
    let winningOmen: BrewModifier = this.state.omens[0] ?? 'fire-sale'
    let maxVotes = -1
    const tiedOmens: BrewModifier[] = []
    for (const omen of this.state.omens) {
      const votes = voteTally[omen] ?? 0
      if (votes > maxVotes) { maxVotes = votes; tiedOmens.length = 0; tiedOmens.push(omen) }
      else if (votes === maxVotes) { tiedOmens.push(omen) }
    }
    winningOmen = tiedOmens[Math.floor(Math.random() * tiedOmens.length)]

    const brew = brewFromModifier(winningOmen)
    this.state.activeBrew = brew

    // Broadcast vote tallies alongside the brew reveal
    const omenVotes: Record<string, number> = {}
    for (const omen of this.state.omens) omenVotes[omen] = voteTally[omen] ?? 0

    this.setPhase('brew_reveal')
    this.broadcastAll({ type: 'BREW_REVEAL', brew, dropZone: this.state.dropZone })
    this.logAndBroadcast(`${brew.icon} ${brew.name} — ${brew.description}`)

    // Apply brew effect, then after animation delay advance to post-brew betting
    setTimeout(() => {
      this.applyBrewEffect()
    }, 5000)
  }

  private applyBrewEffect(): void {
    const brew = this.state.activeBrew
    if (!brew) { this.startBetting3(); return }

    switch (brew.modifier) {
      case 'nuke': {
        const newFlop = applyNuke(this.state)
        this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: this.state.communityCards })
        this.logAndBroadcast(`☢️ New flop: ${newFlop.map(c => c.display).join(' ')}`)
        this.broadcastState()
        break
      }

      case 'chain-lightning':
        // Effect resolved at showdown
        this.logAndBroadcast('⚡ Stacks will swap at showdown!')
        this.broadcastState()
        break

      case 'royal-tax':
        this.state.nextAnteMultiplier = 2
        this.logAndBroadcast("👑 Next hand's ante is doubled!")
        this.broadcastState()
        break

      case 'underdog': {
        const result = applyUnderdog(this.state)
        if (result) {
          const seatName = this.state.seats[result.seatIndex]?.displayName ?? 'Unknown'
          // Send updated cards privately to the underdog player
          this.sendTo(result.seatIndex, {
            type: 'HOLE_CARDS',
            seatIndex: result.seatIndex,
            cards: this.state.seats[result.seatIndex].holeCards,
          })
          this.logAndBroadcast(`🐕 ${seatName} draws a bonus card!`)
        }
        this.broadcastState()
        break
      }

      case 'bleeding-pot':
        applyBleedingPot(this.state)
        this.logAndBroadcast(`💔 Pot doubled to ${this.state.pot}! Winner splits 50% with runner-up.`)
        this.broadcastState()
        break

      case 'grave-dig': {
        const dealt = applyGraveDig(this.state)
        for (const [seatIndex] of dealt) {
          this.sendTo(seatIndex, {
            type: 'HOLE_CARDS',
            seatIndex,
            cards: this.state.seats[seatIndex].holeCards,
          })
        }
        this.logAndBroadcast('⚰️ Everyone draws a card from the grave!')
        this.broadcastState()
        break
      }

      case 'jackpot': {
        const bonus = applyJackpot(this.state)
        this.logAndBroadcast(`💎 The house adds ◆${bonus} to the pot! Total: ◆${this.state.pot}`)
        this.broadcastState()
        break
      }

      case 'sabotage': {
        const exposed = applySabotage(this.state)
        for (const { seatIndex, card } of exposed) {
          this.broadcastAll({ type: 'CARD_EXPOSED', seatIndex, card })
        }
        this.logAndBroadcast("🗡️ Everyone's strongest card is exposed!")
        this.broadcastState()
        break
      }

      case 'fire-sale':
        this.state.maxBetOverride = Number.MAX_SAFE_INTEGER
        this.logAndBroadcast('🔥 All betting limits removed!')
        this.broadcastState()
        break

      case 'blackout':
        this.state.turnIsHidden = true
        this.logAndBroadcast('🌑 The turn card will be hidden. Good luck.')
        this.broadcastState()
        break

    }

    this.startBetting3()
  }

  startBetting3(): void {
    this.setPhase('betting_3')
    startBettingRound(this.state)
    this.broadcastState()
    this.promptCurrentPlayer()
  }

  startTurn(): void {
    this.setPhase('turn')
    const card = dealTurn(this.state)

    if (this.state.turnIsHidden) {
      // Broadcast with masked card — server keeps real value for evaluation
      this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: [
        ...this.state.communityCards.slice(0, 3),
        { rankIndex: -1, suit: '?', display: '?' },
      ]})
      this.logAndBroadcast('Turn: [HIDDEN]')
    } else {
      this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: this.state.communityCards })
      this.logAndBroadcast(`Turn: ${card.display}`)
    }
    setTimeout(() => this.startBetting4(), 600)
  }

  startBetting4(): void {
    this.setPhase('betting_4')
    startBettingRound(this.state)
    this.broadcastState()
    this.promptCurrentPlayer()
  }

  startRiver(): void {
    this.setPhase('river')
    const card = dealRiver(this.state)
    // River is always revealed (only turn is hidden)
    this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: this.state.communityCards })
    this.logAndBroadcast(`River: ${card.display}`)
    setTimeout(() => this.startBetting5(), 600)
  }

  startBetting5(): void {
    this.setPhase('betting_5')
    startBettingRound(this.state)
    this.broadcastState()
    this.promptCurrentPlayer()
  }

  runShowdownPhase(): void {
    this.setPhase('showdown')
    this.clearTimer()

    // If blackout, reveal the hidden turn card now
    if (this.state.turnIsHidden) {
      this.broadcastAll({ type: 'COMMUNITY_CARDS', cards: this.state.communityCards })
      this.logAndBroadcast(`Turn revealed: ${this.state.communityCards[3]?.display ?? '?'}`)
    }

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
      winners.map(w => `${this.state.seats[w.seatIndex].displayName} wins ◆${w.potWon} with ${w.handName}`).join(' | ')
    )

    // Log chain lightning swap if applicable
    if (this.state.activeBrew?.modifier === 'chain-lightning') {
      this.logAndBroadcast('⚡ CHAIN LIGHTNING — stacks swapped!')
    }

    setTimeout(() => this.endHand(), PAYOUT_PAUSE_MS)
  }

  endHand(): void {
    this.setPhase('payout')
    this.broadcastAll({ type: 'STACKS_UPDATE', seats: this.state.seats.map(seatToPublic) })

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
      case 'betting_2': this.startDropPhase(); break
      case 'betting_3': this.startTurn(); break
      case 'betting_4': this.startRiver(); break
      case 'betting_5': this.runShowdownPhase(); break
    }
  }

  // ─── Drop flow ───────────────────────────────────────────────────────────

  processDrop(seatIndex: number, cardIndex: 0 | 1 | 2): void {
    const seat = this.state.seats[seatIndex]
    if (seat.hasDropped || seat.folded) return

    // Record omen vote BEFORE drop removes the card
    const votedOmen = this.state.omenMappings[seatIndex]?.[cardIndex]
    if (votedOmen) seat.votedOmen = votedOmen

    applyDrop(this.state, seatIndex, cardIndex)

    const dropsReceived = this.state.seats.filter(s => !s.folded && s.hasDropped).length
    const totalNeeded = this.state.seats.filter(s => !s.folded).length

    this.broadcastAll({ type: 'DROP_ACK', seatIndex, dropsReceived, totalNeeded })
    this.logAndBroadcast(`${seat.displayName} dropped a card`)

    if (allHaveDropped(this.state)) {
      this.startBrewReveal()
    } else {
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

    if (this.state.phase.startsWith('betting') && this.state.activeSeatIndex === seat.seatIndex) {
      this.clearTimer()
      const validActions = getValidActions(this.state, seat.seatIndex)
      const autoAction = validActions.includes('check') ? 'check' : 'fold'
      this.processAction(seat.seatIndex, { type: autoAction as 'check' | 'fold' })
    }

    if (this.state.phase === 'drop' && !seat.hasDropped && !seat.folded) {
      this.clearTimer()
      const cardIndex = autoDropChoice(seat)
      this.processDrop(seat.seatIndex, cardIndex)
    }

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
