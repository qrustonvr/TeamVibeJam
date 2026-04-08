import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface BettingControlsProps {
  isYourTurn: boolean
  pot: number
  currentBetLevel: number
  myCurrentBet: number
  myStack: number
  activeSeatName?: string
  onAction: (action: string, amount?: number) => void
}

export function BettingControls({
  isYourTurn,
  pot,
  currentBetLevel,
  myCurrentBet,
  myStack,
  activeSeatName,
  onAction,
}: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState<number | null>(null)
  const [showRaise, setShowRaise] = useState(false)

  const toCall = Math.max(0, currentBetLevel - myCurrentBet)
  const canCheck = toCall === 0
  const minRaise = currentBetLevel * 2 || 20
  const effectiveRaise = raiseAmount ?? minRaise

  if (!isYourTurn) {
    return (
      <div style={{
        padding: '12px 16px',
        textAlign: 'center',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        fontStyle: 'italic',
      }}>
        Waiting for {activeSeatName ?? 'another player'}…
      </div>
    )
  }

  const potBets = [0.5, 1, 2].map(f => ({
    label: `${f}x pot`,
    amount: Math.round(pot * f),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!showRaise ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="danger" onClick={() => onAction('fold')}>Fold</Button>

          {canCheck ? (
            <Button variant="ghost" onClick={() => onAction('check')}>Check</Button>
          ) : (
            <Button variant="ghost" onClick={() => onAction('call')}>
              Call ◆{toCall}
            </Button>
          )}

          {myStack > toCall && (
            <Button variant="primary" onClick={() => { setShowRaise(true); setRaiseAmount(minRaise) }}>
              Raise
            </Button>
          )}

          <Button variant="danger" onClick={() => onAction('all-in')}>
            All-In ◆{myStack}
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {potBets.map(pb => (
              <button
                key={pb.label}
                onClick={() => setRaiseAmount(pb.amount)}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 11,
                  fontFamily: 'var(--font-body)',
                  background: raiseAmount === pb.amount ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${raiseAmount === pb.amount ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}`,
                  color: 'var(--gold)', cursor: 'pointer',
                }}
              >
                {pb.label} (◆{pb.amount})
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              value={effectiveRaise}
              min={minRaise}
              max={myStack + myCurrentBet}
              step={10}
              onChange={e => setRaiseAmount(Number(e.target.value))}
              style={{
                width: 80, padding: '4px 8px', borderRadius: 4,
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--gold-dim)',
                color: 'var(--gold)', fontFamily: 'var(--font-body)', fontSize: 13,
              }}
            />
            <Button variant="primary" onClick={() => { onAction('raise', effectiveRaise); setShowRaise(false) }}>
              Raise to ◆{effectiveRaise}
            </Button>
            <Button variant="ghost" onClick={() => setShowRaise(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
