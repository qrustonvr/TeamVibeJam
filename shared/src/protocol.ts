import type { DropPhase, PublicSeat, RoomSnapshot, HandWinner, Card, BrewResult, BrewModifier, ShowdownPlayerInfo } from './gameTypes.js'

// ─── CLIENT → SERVER ─────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'JOIN_ROOM';  roomCode: string; displayName: string; maxPlayers?: number; sessionToken?: string }
  | { type: 'CREATE_ROOM'; displayName: string; maxPlayers: number }
  | { type: 'REJOIN';     roomCode: string; sessionToken: string }
  | { type: 'START_GAME' }
  | { type: 'DROP_CARD';  cardIndex: 0 | 1 | 2 }
  | { type: 'ACTION';     action: 'fold' | 'check' | 'call' | 'raise' | 'all-in'; amount?: number }
  | { type: 'CHAT';       message: string }

// ─── SERVER → CLIENT ─────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: 'SESSION_ASSIGNED';   sessionToken: string; seatIndex: number; roomCode: string }
  | { type: 'ROOM_STATE';         state: RoomSnapshot }
  | { type: 'PLAYER_JOINED';      seatIndex: number; displayName: string; seats: PublicSeat[] }
  | { type: 'PLAYER_AWAY';        seatIndex: number; displayName: string }
  | { type: 'PLAYER_LEFT';        seatIndex: number; seats: PublicSeat[] }
  | { type: 'GAME_STARTING';      countdown: number }
  | { type: 'PHASE_CHANGE';       phase: DropPhase }
  | { type: 'HOLE_CARDS';         seatIndex: number; cards: Card[] }
  | { type: 'HOLE_CARDS_DEALT';   seatIndex: number }
  | { type: 'TURN_START';         seatIndex: number; deadline: number; toCall: number; minRaise: number; pot: number; validActions: string[] }
  | { type: 'DROP_PROMPT';        deadline: number }
  | { type: 'DROP_ACK';           seatIndex: number; dropsReceived: number; totalNeeded: number }
  | { type: 'DROP_REVEALED';      dropZone: Card[] }
  | { type: 'BREW_REVEAL';        brew: BrewResult; dropZone: Card[] }
  | { type: 'CARD_EXPOSED';       seatIndex: number; card: Card }
  | { type: 'ACTION_ACK';         seatIndex: number; action: string; amount: number; pot: number; currentBetLevel: number; stack: number }
  | { type: 'COMMUNITY_CARDS';    cards: Card[] }
  | { type: 'HOLE_CARDS_REVEAL';  reveals: Array<{ seatIndex: number; cards: Card[] }> }
  | { type: 'HAND_RESULT';        winners: HandWinner[]; allSeats: PublicSeat[]; showdownPlayers?: ShowdownPlayerInfo[] }
  | { type: 'OMENS_REVEALED';     omens: BrewModifier[] }
  | { type: 'OMEN_MAPPINGS';      mappings: BrewModifier[] }
  | { type: 'STACKS_UPDATE';      seats: PublicSeat[] }
  | { type: 'REJOIN_ACK';         state: RoomSnapshot }
  | { type: 'REJOIN_REJECTED';    reason: string }
  | { type: 'ERROR';              code: ErrorCode; message: string }
  | { type: 'GAME_LOG';           message: string }
  | { type: 'CHAT';               seatIndex: number; displayName: string; message: string }

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'NOT_YOUR_TURN'
  | 'INVALID_ACTION'
  | 'INVALID_PHASE'
  | 'INVALID_AMOUNT'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'MAX_ROOMS_REACHED'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN'
