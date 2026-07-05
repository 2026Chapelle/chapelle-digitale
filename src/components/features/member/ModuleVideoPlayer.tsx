'use client'
import { useCallback, useEffect, useRef } from 'react'
import { computePercentWatched } from '@/lib/formations/video-validation'

/**
 * Lecteur de module (Lot B) — suit le visionnage RÉEL et le persiste.
 *  - YouTube : API IFrame (getCurrentTime/getDuration) → % vu réel.
 *  - Vidéo interne : <video> + timeupdate.
 * Sauvegarde automatique throttlée (toutes ~8 s + à la pause/fin/démontage) via
 * /api/member/formations/video-progress. Reprise au dernier point (last_position).
 * Remonte le % vu au parent (onPercent) pour piloter le bouton « Marquer terminé ».
 */

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let ytApiPromise: Promise<void> | null = null
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT && window.YT.Player) return Promise.resolve()
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { try { prev && prev() } catch { /* noop */ } ; resolve() }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

interface Props {
  moduleId: string
  formationId: string
  youtubeId?: string | null
  videoUrl?: string | null
  initialPosition?: number
  initialPercent?: number
  completed?: boolean
  onPercent: (pct: number) => void
}

export function ModuleVideoPlayer({
  moduleId, formationId, youtubeId, videoUrl, initialPosition = 0, initialPercent = 0, completed, onPercent,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const maxWatched = useRef(0)
  const durationRef = useRef(0)
  const lastSaved = useRef(0)
  const pctRef = useRef(0)

  const save = useCallback((position: number, force = false) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (!force && now - lastSaved.current < 8000) return
    lastSaved.current = now
    fetch('/api/member/formations/video-progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({
        module_id: moduleId, formation_id: formationId,
        watched_seconds: Math.round(maxWatched.current),
        video_duration: Math.round(durationRef.current),
        last_position: Math.round(position),
      }),
    }).catch(() => { /* best-effort */ })
  }, [moduleId, formationId])

  const report = useCallback((current: number, duration: number) => {
    if (duration > 0) {
      durationRef.current = duration
      if (current > maxWatched.current) maxWatched.current = current
      const pct = computePercentWatched(maxWatched.current, duration)
      if (pct > pctRef.current) { pctRef.current = pct; onPercent(pct) }
    }
  }, [onPercent])

  // Initialise le % au montage : module validé → 100, sinon % déjà visionné (reprise).
  useEffect(() => {
    const start = completed ? 100 : Math.max(0, Math.min(100, initialPercent))
    pctRef.current = start
    onPercent(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId])

  // ── Lecteur YouTube (API IFrame) ──
  useEffect(() => {
    if (!youtubeId || !hostRef.current) return
    let interval: any
    let destroyed = false
    loadYouTubeApi().then(() => {
      if (destroyed || !hostRef.current || !window.YT) return
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId: youtubeId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: (e: any) => {
            if (initialPosition > 0 && !completed) { try { e.target.seekTo(initialPosition, true) } catch { /* noop */ } }
          },
          onStateChange: (e: any) => {
            clearInterval(interval)
            if (e.data === 1) { // playing
              interval = setInterval(() => {
                try {
                  const cur = playerRef.current.getCurrentTime()
                  const dur = playerRef.current.getDuration()
                  report(cur, dur); save(cur)
                } catch { /* noop */ }
              }, 3000)
            } else {
              try { const cur = playerRef.current.getCurrentTime(); save(cur, true) } catch { /* noop */ }
              if (e.data === 0) report(durationRef.current, durationRef.current) // ended → complet
            }
          },
        },
      })
    })
    return () => {
      destroyed = true
      clearInterval(interval)
      try { save(playerRef.current?.getCurrentTime?.() ?? 0, true) } catch { /* noop */ }
      try { playerRef.current?.destroy?.() } catch { /* noop */ }
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId, moduleId])

  if (youtubeId) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-white/10" style={{ aspectRatio: '16/9' }}>
        <div ref={hostRef} className="absolute inset-0 w-full h-full" />
      </div>
    )
  }

  if (videoUrl) {
    return (
      <video
        controls src={videoUrl} className="w-full rounded-2xl border border-white/10"
        onLoadedMetadata={(e) => { const v = e.currentTarget; durationRef.current = v.duration || 0; if (initialPosition > 0 && !completed) { try { v.currentTime = initialPosition } catch { /* noop */ } } }}
        onTimeUpdate={(e) => { const v = e.currentTarget; report(v.currentTime, v.duration || 0); save(v.currentTime) }}
        onPause={(e) => save(e.currentTarget.currentTime, true)}
        onEnded={(e) => { const v = e.currentTarget; report(v.duration || 0, v.duration || 0); save(v.duration || 0, true) }}
      />
    )
  }

  return null
}
