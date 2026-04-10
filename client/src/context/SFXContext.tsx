import { createContext, useContext, useState, useCallback } from 'react'

interface SFXContextValue {
  sfxVolume: number
  setSfxVolume: (v: number) => void
  sfxMuted: boolean
  toggleSfxMute: () => void
}

const SFXContext = createContext<SFXContextValue>({
  sfxVolume: 0.8, setSfxVolume: () => undefined,
  sfxMuted: false, toggleSfxMute: () => undefined,
})

export function useSFX() { return useContext(SFXContext) }

export function SFXProvider({ children }: { children: React.ReactNode }) {
  const [sfxVolume, setSfxVolumeState] = useState(0.8)
  const [sfxMuted, setSfxMuted] = useState(false)

  const setSfxVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setSfxVolumeState(clamped)
    if (clamped > 0) setSfxMuted(false)
  }, [])

  const toggleSfxMute = useCallback(() => {
    setSfxMuted(m => !m)
  }, [])

  return (
    <SFXContext.Provider value={{ sfxVolume, setSfxVolume, sfxMuted, toggleSfxMute }}>
      {children}
    </SFXContext.Provider>
  )
}
