import { useState, useRef, useEffect } from 'react'
import { useGame } from '@/context/GameContext'
import { useBGM } from '@/context/BGMContext'
import { useSFX } from '@/context/SFXContext'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { RulesModal } from '@/components/ui/RulesModal'
import { GAME_CONFIG } from '@/utils/constants'

export function Header() {
  const { state } = useGame()
  const { volume, setVolume, muted, toggleMute } = useBGM()
  const { sfxVolume, setSfxVolume, sfxMuted, toggleSfxMute } = useSFX()
  const [rulesOpen, setRulesOpen] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const volumePanelRef = useRef<HTMLDivElement>(null)

  // Close volume panel on outside click
  useEffect(() => {
    if (!volumeOpen) return
    const handler = (e: MouseEvent) => {
      if (volumePanelRef.current && !volumePanelRef.current.contains(e.target as Node))
        setVolumeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [volumeOpen])

  return (
    <>
      <header
        className="w-full px-6 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 100%)',
          borderBottom: '1px solid var(--gold-dim)',
          boxShadow: '0 2px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-display text-xl tracking-[0.25em] uppercase"
            style={{ color: 'var(--gold)' }}
          >
            {GAME_CONFIG.GAME_NAME}
          </span>

          <button
            onClick={() => setRulesOpen(true)}
            aria-label="How to play"
            title="How to play"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1px solid var(--gold-dim)',
              background: 'transparent',
              color: 'var(--gold)',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.background = 'var(--gold)'
              el.style.color = '#1a0808'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.background = 'transparent'
              el.style.color = 'var(--gold)'
            }}
          >
            i
          </button>
        </div>

        <div className="flex items-center gap-4 font-body text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 tracking-widest uppercase text-xs">Balance</span>
            <AnimatedNumber
              value={state.balance}
              prefix={`${GAME_CONFIG.CURRENCY_SYMBOL} `}
              className="text-white font-semibold tracking-wider tabular-nums"
              duration={400}
            />
          </div>

          {/* Volume control */}
          <div ref={volumePanelRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setVolumeOpen(o => !o)}
              title="Music volume"
              aria-label="Music volume"
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '1px solid var(--gold-dim)',
                background: volumeOpen ? 'var(--gold-dim)' : 'transparent',
                color: 'var(--gold)',
                fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
            >
              {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>

            {volumeOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'rgba(10,4,4,0.97)',
                border: '1px solid var(--gold-dim)',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
                minWidth: 180,
                boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
                zIndex: 200,
              }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 9,
                  letterSpacing: 2, color: 'var(--gold-dim)',
                  textTransform: 'uppercase',
                }}>
                  Music Volume
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={toggleMute}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--gold)', cursor: 'pointer',
                      fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0,
                    }}
                  >
                    {muted || volume === 0 ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min={0} max={1} step={0.01}
                    value={muted ? 0 : volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--gold)', cursor: 'pointer' }}
                  />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 10,
                    color: 'var(--gold-dim)', minWidth: 28, textAlign: 'right',
                  }}>
                    {Math.round((muted ? 0 : volume) * 100)}%
                  </span>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(212,175,55,0.15)', margin: '2px 0' }} />

                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 9,
                  letterSpacing: 2, color: 'var(--gold-dim)',
                  textTransform: 'uppercase',
                }}>
                  SFX Volume
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={toggleSfxMute}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--gold)', cursor: 'pointer',
                      fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0,
                    }}
                  >
                    {sfxMuted || sfxVolume === 0 ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min={0} max={1} step={0.01}
                    value={sfxMuted ? 0 : sfxVolume}
                    onChange={e => setSfxVolume(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--gold)', cursor: 'pointer' }}
                  />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 10,
                    color: 'var(--gold-dim)', minWidth: 28, textAlign: 'right',
                  }}>
                    {Math.round((sfxMuted ? 0 : sfxVolume) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  )
}
