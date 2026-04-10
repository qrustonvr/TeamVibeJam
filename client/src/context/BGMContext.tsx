import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

interface BGMContextValue {
  volume: number
  setVolume: (v: number) => void
  muted: boolean
  toggleMute: () => void
}

const BGMContext = createContext<BGMContextValue>({
  volume: 0.4, setVolume: () => undefined,
  muted: false, toggleMute: () => undefined,
})

export function useBGM() { return useContext(BGMContext) }

export function BGMProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [volume, setVolumeState] = useState(0.4)
  const [muted, setMuted] = useState(false)
  const startedRef = useRef(false)

  // Create the audio element once
  useEffect(() => {
    const audio = new Audio('/TeamVibeJam/audio/BGM.mp3')
    audio.loop = true
    audio.volume = 0.4
    audioRef.current = audio

    // Start on first user gesture (browser autoplay policy)
    const start = () => {
      if (startedRef.current) return
      startedRef.current = true
      audio.play().catch(() => undefined)
    }
    document.addEventListener('mousedown', start, { once: true })
    document.addEventListener('keydown', start, { once: true })

    return () => {
      audio.pause()
      document.removeEventListener('mousedown', start)
      document.removeEventListener('keydown', start)
    }
  }, [])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    if (audioRef.current) {
      audioRef.current.volume = clamped
      if (clamped > 0 && audioRef.current.muted) {
        audioRef.current.muted = false
        setMuted(false)
      }
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return
    const next = !audioRef.current.muted
    audioRef.current.muted = next
    setMuted(next)
  }, [])

  return (
    <BGMContext.Provider value={{ volume, setVolume, muted, toggleMute }}>
      {children}
    </BGMContext.Provider>
  )
}
