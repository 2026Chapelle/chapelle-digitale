'use client'
import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

export interface AudioTrack {
  id: string
  titre: string
  auteur?: string
  serie?: string
  duree: string
  dureeSecondes?: number
  emoji: string
  couleur: string
  audioUrl?: string
}

interface AudioPlayerState {
  track: AudioTrack | null
  playing: boolean
  progress: number
  volume: number
  muted: boolean
  elapsed: number
}

interface AudioPlayerContext extends AudioPlayerState {
  play: (track: AudioTrack) => void
  pause: () => void
  resume: () => void
  toggle: (track: AudioTrack) => void
  stop: () => void
  seek: (pct: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  isPlaying: (id: string) => boolean
}

const Ctx = createContext<AudioPlayerContext | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>({
    track: null,
    playing: false,
    progress: 0,
    volume: 0.8,
    elapsed: 0,
    muted: false,
  })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const tick = useCallback(() => {
    setState(s => {
      if (!s.playing || !s.track) return s
      const dur = s.track.dureeSecondes ?? 2880
      const newElapsed = Math.min(s.elapsed + 1, dur)
      return { ...s, elapsed: newElapsed, progress: newElapsed / dur }
    })
  }, [])

  useEffect(() => {
    if (state.playing) {
      timerRef.current = setInterval(tick, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state.playing, tick])

  const play = useCallback((track: AudioTrack) => {
    setState(s => ({ ...s, track, playing: true, progress: 0, elapsed: 0 }))
  }, [])

  const pause = useCallback(() => setState(s => ({ ...s, playing: false })), [])
  const resume = useCallback(() => setState(s => ({ ...s, playing: true })), [])

  const toggle = useCallback((track: AudioTrack) => {
    setState(s => {
      if (s.track?.id === track.id) return { ...s, playing: !s.playing }
      return { ...s, track, playing: true, progress: 0, elapsed: 0 }
    })
  }, [])

  const stop = useCallback(() => setState(s => ({ ...s, track: null, playing: false, progress: 0, elapsed: 0 })), [])

  const seek = useCallback((pct: number) => {
    setState(s => {
      const dur = s.track?.dureeSecondes ?? 2880
      return { ...s, progress: pct, elapsed: Math.floor(pct * dur) }
    })
  }, [])

  const setVolume = useCallback((v: number) => setState(s => ({ ...s, volume: v, muted: false })), [])
  const toggleMute = useCallback(() => setState(s => ({ ...s, muted: !s.muted })), [])
  const isPlaying = useCallback((id: string) => stateRef.current.track?.id === id && stateRef.current.playing, [])

  return (
    <Ctx.Provider value={{ ...state, play, pause, resume, toggle, stop, seek, setVolume, toggleMute, isPlaying }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAudioPlayer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAudioPlayer must be used inside AudioPlayerProvider')
  return ctx
}
