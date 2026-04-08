import { useState, useCallback, useRef } from 'react'

interface AnimationHandle {
  isAnimating: boolean
  trigger: (onComplete?: () => void) => void
  cancel: () => void
}

export function useAnimation(durationMs = 600): AnimationHandle {
  const [isAnimating, setIsAnimating] = useState(false)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setIsAnimating(false)
  }, [])

  const trigger = useCallback(
    (onComplete?: () => void) => {
      cancel()
      rafRef.current = requestAnimationFrame(() => {
        setIsAnimating(true)
        timerRef.current = setTimeout(() => {
          setIsAnimating(false)
          onComplete?.()
        }, durationMs)
      })
    },
    [cancel, durationMs],
  )

  return { isAnimating, trigger, cancel }
}
