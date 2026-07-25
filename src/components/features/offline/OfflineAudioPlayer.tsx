'use client'
/**
 * Lecteur audio LOCAL (Blob hors-ligne) avec reprise persistée.
 *
 * Lit une ObjectURL construite depuis le Blob IndexedDB (pas d'URL distante).
 * Sauvegarde la position toutes ~8 s + à la pause / fin / démontage (throttle via
 * `shouldPersistPosition`, logique pure testée). Gère l'absence de blob local.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, RotateCcw, RotateCw, AlertCircle } from 'lucide-react'
import { openLocalObjectUrl, savePlaybackPosition } from '@/lib/offline/manager'
import {
  shouldPersistPosition,
  resumePosition,
  formatBytes,
  type OfflineItem,
} from '@/lib/offline/policy'

interface Props {
  userId: string
  item: OfflineItem
}

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function OfflineAudioPlayer({ userId, item }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const lastSavedMsRef = useRef<number>(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(item.durationSeconds || 0)

  const persist = useCallback(
    (pos: number, force = false) => {
      const now = Date.now()
      if (!shouldPersistPosition(lastSavedMsRef.current, now, force)) return
      lastSavedMsRef.current = now
      void savePlaybackPosition(userId, item.contentId, pos, audioRef.current?.duration)
    },
    [userId, item.contentId],
  )

  useEffect(() => {
    // Le nœud <audio> est stable sur la vie du composant : on le capture ici pour
    // un cleanup correct (sauvegarde de la position au démontage).
    const audioEl = audioRef.current
    let cancelled = false
    ;(async () => {
      try {
        const url = await openLocalObjectUrl(userId, item.contentId)
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setError('Fichier local manquant. Reconnecte-toi pour le retélécharger.')
          return
        }
        urlRef.current = url
        if (audioEl) audioEl.src = url
        setReady(true)
      } catch {
        setError('Lecture impossible : fichier local illisible.')
      }
    })()
    return () => {
      cancelled = true
      // Sauvegarde finale + révocation de l'ObjectURL.
      if (audioEl && Number.isFinite(audioEl.currentTime)) persist(audioEl.currentTime, true)
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, item.contentId])

  const onLoaded = () => {
    const a = audioRef.current
    if (!a) return
    setDuration(a.duration || 0)
    const resume = resumePosition(item.playbackPositionSeconds, a.duration)
    if (resume > 0) a.currentTime = resume
  }

  const onTimeUpdate = () => {
    const a = audioRef.current
    if (!a) return
    setCurrent(a.currentTime)
    persist(a.currentTime)
  }

  const toggle = () => {
    const a = audioRef.current
    if (!a || !ready) return
    if (a.paused) {
      void a.play()
    } else {
      a.pause()
    }
  }

  const skip = (delta: number) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta))
    persist(a.currentTime, true)
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current
    if (!a) return
    const pct = Number(e.target.value) / 100
    a.currentTime = pct * (a.duration || 0)
    setCurrent(a.currentTime)
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300" role="alert">
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        {error}
      </div>
    )
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false)
          const a = audioRef.current
          if (a) persist(a.currentTime, true)
        }}
        onEnded={() => {
          setPlaying(false)
          const a = audioRef.current
          if (a) persist(a.duration || 0, true)
        }}
        onError={() => setError('Fichier audio local illisible ou corrompu.')}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => skip(-10)}
          className="rounded-lg p-2 text-pearl/60 transition-colors hover:bg-white/[0.06] hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          aria-label="Reculer de 10 secondes"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={!ready}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-abyss transition-transform hover:scale-105 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          aria-label={playing ? 'Pause' : 'Lecture'}
        >
          {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          className="rounded-lg p-2 text-pearl/60 transition-colors hover:bg-white/[0.06] hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          aria-label="Avancer de 10 secondes"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={100}
            value={Number.isFinite(pct) ? pct : 0}
            onChange={seek}
            className="w-full accent-gold"
            aria-label="Position de lecture"
            aria-valuetext={`${fmtTime(current)} sur ${fmtTime(duration)}`}
          />
          <div className="mt-1 flex justify-between text-[11px] text-pearl/40">
            <span>{fmtTime(current)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-pearl/30">
        Source locale · {formatBytes(item.sizeBytes)} · reprise mémorisée
      </p>
    </div>
  )
}
