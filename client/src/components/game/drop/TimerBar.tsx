import { useState, useEffect, useRef } from 'react'

interface TimerBarProps {
  deadline: number | null
  totalMs?: number
}

export function TimerBar({ deadline, totalMs = 30_000 }: TimerBarProps) {
  const [pct, setPct] = useState(100)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!deadline) { setPct(100); return }

    const tick = () => {
      const remaining = deadline - Date.now()
      const fraction = Math.max(0, Math.min(1, remaining / totalMs))
      setPct(fraction * 100)
      if (fraction > 0) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [deadline, totalMs])

  const color = pct > 50 ? 'var(--gold)' : pct > 20 ? '#f59e0b' : '#ef4444'

  if (!deadline) return null

  return (
    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'background-color 0.5s',
          borderRadius: 2,
        }}
      />
    </div>
  )
}
