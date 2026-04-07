import { useReducer } from 'react'
import { GamePhase, GameState, GameAction, Round } from '@/types/game'
import { GAME_CONFIG, MAX_ROUND_HISTORY } from '@/utils/constants'
import { loadBalance } from '@/utils/storage'

const initialState: GameState = {
  balance: loadBalance(),
  currentBet: 0,
  phase: GamePhase.BETTING,
  roundHistory: [],
  totalWins: 0,
  totalLosses: 0,
  totalPushes: 0,
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_BET': {
      const newBet = state.currentBet + action.amount
      const affordable = Math.min(newBet, state.balance, GAME_CONFIG.MAX_BET)
      return {
        ...state,
        currentBet: affordable,
      }
    }
    case 'CLEAR_BET':
      return { ...state, currentBet: 0 }

    case 'WIN': {
      const round: Round = {
        id: `${Date.now()}-${Math.random()}`,
        bet: state.currentBet,
        payout: action.payout,
        result: 'win',
        timestamp: Date.now(),
      }
      return {
        ...state,
        balance: state.balance + action.payout,
        currentBet: 0,
        phase: GamePhase.BETTING,
        totalWins: state.totalWins + 1,
        roundHistory: [round, ...state.roundHistory].slice(0, MAX_ROUND_HISTORY),
      }
    }
    case 'LOSE': {
      const round: Round = {
        id: `${Date.now()}-${Math.random()}`,
        bet: state.currentBet,
        payout: -state.currentBet,
        result: 'lose',
        timestamp: Date.now(),
      }
      const newBalance = state.balance - state.currentBet
      return {
        ...state,
        balance: newBalance,
        currentBet: 0,
        phase: newBalance <= 0 ? GamePhase.GAME_OVER : GamePhase.BETTING,
        totalLosses: state.totalLosses + 1,
        roundHistory: [round, ...state.roundHistory].slice(0, MAX_ROUND_HISTORY),
      }
    }
    case 'PUSH': {
      const round: Round = {
        id: `${Date.now()}-${Math.random()}`,
        bet: state.currentBet,
        payout: 0,
        result: 'push',
        timestamp: Date.now(),
      }
      return {
        ...state,
        currentBet: 0,
        phase: GamePhase.BETTING,
        totalPushes: state.totalPushes + 1,
        roundHistory: [round, ...state.roundHistory].slice(0, MAX_ROUND_HISTORY),
      }
    }
    case 'SET_PHASE':
      return { ...state, phase: action.phase }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  return { state, dispatch }
}
