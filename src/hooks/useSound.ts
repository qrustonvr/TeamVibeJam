import { useRef, useCallback } from 'react'

type SoundName = string

interface SoundManager {
  play: (name: SoundName) => void
  stop: (name: SoundName) => void
  setVolume: (volume: number) => void
  preload: (name: SoundName, url: string) => void
}

export function useSound(): SoundManager {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Map<SoundName, AudioBuffer>>(new Map())
  const sourcesRef = useRef<Map<SoundName, AudioBufferSourceNode>>(new Map())
  const gainRef = useRef<GainNode | null>(null)

  const getContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
      gainRef.current = audioCtxRef.current.createGain()
      gainRef.current.connect(audioCtxRef.current.destination)
    }
    return audioCtxRef.current
  }, [])

  const preload = useCallback(
    (name: SoundName, url: string) => {
      const ctx = getContext()
      fetch(url)
        .then(res => res.arrayBuffer())
        .then(data => ctx.decodeAudioData(data))
        .then(buffer => {
          buffersRef.current.set(name, buffer)
        })
        .catch(() => {
          // Audio file not found — silently skip (assets added later)
        })
    },
    [getContext],
  )

  const play = useCallback(
    (name: SoundName) => {
      const ctx = getContext()
      const buffer = buffersRef.current.get(name)
      if (!buffer || !gainRef.current) return

      // Resume suspended context (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined)
      }

      try {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(gainRef.current)
        source.start()
        sourcesRef.current.set(name, source)
        source.onended = () => {
          sourcesRef.current.delete(name)
        }
      } catch {
        // NotAllowedError or similar — user gesture required, ignore
      }
    },
    [getContext],
  )

  const stop = useCallback((name: SoundName) => {
    const source = sourcesRef.current.get(name)
    if (source) {
      try {
        source.stop()
      } catch {
        // Already stopped
      }
      sourcesRef.current.delete(name)
    }
  }, [])

  const setVolume = useCallback(
    (volume: number) => {
      getContext()
      if (gainRef.current) {
        gainRef.current.gain.setValueAtTime(
          Math.max(0, Math.min(1, volume)),
          gainRef.current.context.currentTime,
        )
      }
    },
    [getContext],
  )

  return { play, stop, setVolume, preload }
}
