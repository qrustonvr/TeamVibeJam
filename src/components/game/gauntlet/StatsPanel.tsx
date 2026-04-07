import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PlayerStats } from '@/types/gauntlet'
import { GAME_CONFIG } from '@/utils/constants'

interface StatsPanelProps {
  open: boolean
  onClose: () => void
  stats: PlayerStats
  balance: number
  sessionStart: number   // balance at start of session
  onReset: () => void
}

export function StatsPanel({ open, onClose, stats, balance, sessionStart, onReset }: StatsPanelProps) {
  const [confirmReset, setConfirmReset] = useState(false)

  const winRate = stats.totalHands > 0
    ? Math.round((stats.totalWins / stats.totalHands) * 100)
    : 0

  const sessionPnL = balance - sessionStart

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    onReset()
    setConfirmReset(false)
    onClose()
  }

  function handleClose() {
    setConfirmReset(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="STATISTICS">
      <div className="flex flex-col gap-5">
        {/* Session */}
        <section>
          <h3
            className="font-body text-xs tracking-[0.2em] uppercase mb-2"
            style={{ color: 'rgba(212,175,55,0.5)' }}
          >
            This Session
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <StatRow label="Balance" value={`${GAME_CONFIG.CURRENCY_SYMBOL} ${balance.toLocaleString()}`} />
            <StatRow
              label="Profit / Loss"
              value={`${sessionPnL >= 0 ? '+' : ''}${GAME_CONFIG.CURRENCY_SYMBOL} ${Math.abs(sessionPnL).toLocaleString()}`}
              valueColor={sessionPnL >= 0 ? '#4ade80' : '#f87171'}
            />
          </div>
        </section>

        {/* All-time */}
        <section>
          <h3
            className="font-body text-xs tracking-[0.2em] uppercase mb-2"
            style={{ color: 'rgba(212,175,55,0.5)' }}
          >
            All-Time
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <StatRow label="Hands Played" value={String(stats.totalHands)} />
            <StatRow label="Win Rate" value={`${winRate}%`} />
            <StatRow label="Best Payout" value={`${GAME_CONFIG.CURRENCY_SYMBOL} ${stats.biggestWin.toLocaleString()}`} />
            <StatRow label="Peak Balance" value={`${GAME_CONFIG.CURRENCY_SYMBOL} ${stats.peakBalance.toLocaleString()}`} />
            <StatRow
              label="Gauntlet Masters"
              value={`${stats.gauntletMasters} 👑`}
              valueColor={stats.gauntletMasters > 0 ? 'var(--gold)' : undefined}
            />
            <StatRow label="Longest Streak" value={String(stats.longestStreak)} />
          </div>
        </section>

        {/* Round history */}
        {stats.roundHistory.length > 0 && (
          <section>
            <h3
              className="font-body text-xs tracking-[0.2em] uppercase mb-2"
              style={{ color: 'rgba(212,175,55,0.5)' }}
            >
              Recent Rounds
            </h3>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {stats.roundHistory.slice(0, 10).map((r, i) => {
                const isLoss = r.outcome === 'loss'
                const isMaster = r.outcome === 'gauntlet-master'
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between font-body text-xs px-2 py-1 rounded"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {GAME_CONFIG.CURRENCY_SYMBOL}{r.bet} bet
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {r.cardsBeaten} of 5
                      {isMaster ? ' 👑' : ''}
                    </span>
                    <span
                      style={{
                        color: isLoss ? '#f87171' : isMaster ? 'var(--gold)' : '#4ade80',
                        fontWeight: 600,
                      }}
                    >
                      {isLoss ? '−' : '+'}
                      {GAME_CONFIG.CURRENCY_SYMBOL}
                      {Math.abs(isLoss ? r.bet : r.payout).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Reset */}
        <div className="pt-1 border-t" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
          {confirmReset ? (
            <div className="flex flex-col gap-2">
              <p className="font-body text-xs text-center" style={{ color: '#f87171' }}>
                This will erase all stats and reset your balance. Are you sure?
              </p>
              <div className="flex gap-2">
                <Button variant="danger" fullWidth onClick={handleReset}>
                  YES, RESET
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>
                  CANCEL
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" fullWidth onClick={handleReset}>
              RESET STATS
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      className="flex flex-col gap-0.5 px-2 py-1.5 rounded"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <span className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </span>
      <span
        className="font-body text-sm font-bold"
        style={{ color: valueColor ?? 'rgba(255,255,255,0.85)' }}
      >
        {value}
      </span>
    </div>
  )
}
