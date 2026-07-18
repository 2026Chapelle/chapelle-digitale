'use client'
/**
 * Lecteur audio global — lecture réelle via HTMLAudioElement.
 * Persistant (barre fixe) tant qu’une piste avec audioUrl valide est active.
 */
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
  coverUrl?: string
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

function parseDurationSeconds(d?: string, fallback?: number): number {
  if (fallback && fallback > 0) return fallback
  if (!d) return 0
  // "12:34" or "1:02:03"
  const parts = d.split(':').map((x) => Number(x))
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>({
    track: null,
    playing: false,
    progress: 0,
    volume: 0.8,
    elapsed: 0,
    muted: false,
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // Élément audio unique
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const onTime = () => {
      const a = audioRef.current
      if (!a || !a.duration || !Number.isFinite(a.duration)) return
      setState((s) => ({
        ...s,
        elapsed: a.currentTime,
        progress: a.currentTime / a.duration,
      }))
    }
    const onEnded = () => setState((s) => ({ ...s, playing: false, progress: 1 }))
    const onPlay = () => setState((s) => ({ ...s, playing: true }))
    const onPause = () => setState((s) => ({ ...s, playing: false }))
    const onMeta = () => {
      const a = audioRef.current
      if (!a || !a.duration || !Number.isFinite(a.duration)) return
      setState((s) => {
        if (!s.track) return s
        const secs = Math.floor(a.duration)
        return {
          ...s,
          track: {
            ...s.track,
            dureeSecondes: secs,
            duree: s.track.duree || `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
          },
        }
      })
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadedmetadata', onMeta)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadedmetadata', onMeta)
      audioRef.current = null
    }
  }, [])

  // Sync volume / mute
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = state.muted ? 0 : state.volume
    a.muted = state.muted
  }, [state.volume, state.muted])

  // Padding layout pour ne pas masquer le footer
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (state.track) {
      document.body.classList.add('has-audio-player')
      document.documentElement.style.setProperty('--audio-player-h', '76px')
    } else {
      document.body.classList.remove('has-audio-player')
      document.documentElement.style.removeProperty('--audio-player-h')
    }
    return () => {
      document.body.classList.remove('has-audio-player')
      document.documentElement.style.removeProperty('--audio-player-h')
    }
  }, [state.track])

  const play = useCallback((track: AudioTrack) => {
    const a = audioRef.current
    if (!track.audioUrl || !a) return // pas de faux lecteur sans URL réelle
    const same = stateRef.current.track?.id === track.id && a.src
    if (!same) {
      a.src = track.audioUrl
      a.currentTime = 0
    }
    void a.play().catch(() => {
      /* autoplay bloqué ou URL invalide — pas de faux état */
      setState((s) => ({ ...s, playing: false }))
    })
    setState((s) => ({
      ...s,
      track: {
        ...track,
        dureeSecondes: parseDurationSeconds(track.duree, track.dureeSecondes) || track.dureeSecondes,
      },
      playing: true,
      progress: same ? s.progress : 0,
      elapsed: same ? s.elapsed : 0,
    }))
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setState((s) => ({ ...s, playing: false }))
  }, [])

  const resume = useCallback(() => {
    const a = audioRef.current
    if (!a || !stateRef.current.track?.audioUrl) return
    void a.play().catch(() => setState((s) => ({ ...s, playing: false })))
    setState((s) => ({ ...s, playing: true }))
  }, [])

  const toggle = useCallback(
    (track: AudioTrack) => {
      if (!track.audioUrl) return
      const cur = stateRef.current
      if (cur.track?.id === track.id) {
        if (cur.playing) pause()
        else resume()
        return
      }
      play(track)
    },
    [play, pause, resume]
  )

  const stop = useCallback(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.removeAttribute('src')
      a.load()
    }
    setState((s) => ({ ...s, track: null, playing: false, progress: 0, elapsed: 0 }))
  }, [])

  const seek = useCallback((pct: number) => {
    const a = audioRef.current
    const p = Math.max(0, Math.min(1, pct))
    if (a && a.duration && Number.isFinite(a.duration)) {
      a.currentTime = p * a.duration
    }
    setState((s) => {
      const dur = s.track?.dureeSecondes || (a?.duration && Number.isFinite(a.duration) ? a.duration : 0)
      return { ...s, progress: p, elapsed: Math.floor(p * dur) }
    })
  }, [])

  const setVolume = useCallback((v: number) => {
    setState((s) => ({ ...s, volume: v, muted: false }))
  }, [])

  const toggleMute = useCallback(() => {
    setState((s) => ({ ...s, muted: !s.muted }))
  }, [])

  const isPlaying = useCallback(
    (id: string) => stateRef.current.track?.id === id && stateRef.current.playing,
    []
  )

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
