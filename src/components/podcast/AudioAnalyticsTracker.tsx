'use client'
/**
 * PODCAST-4 — Observateur analytics d'écoute audio.
 *
 * Monté globalement (layout), OBSERVE le player unique (AudioPlayerProvider) — aucun
 * 2e moteur audio, aucun store concurrent, aucune interception de la sécurité média
 * (la piste ne devient active QUE si PODCAST-SEC a résolu une URL). Distinct de
 * AudioProgressSync (reprise perso) : ici on émet des ÉVÉNEMENTS immuables agrégés.
 *
 * Économe (≤ 6 écritures / écoute complète) :
 *   • play_start / play_resume : UNE fois, après un minimum de lecture réelle
 *     (MIN_PLAY_SECONDS) → un clic qui échoue (refus PODCAST-SEC, autoplay bloqué)
 *     ne produit JAMAIS de faux play ;
 *   • progress_checkpoint : aux seuils 25/50/75/95 %, une fois chacun ;
 *   • completed : une fois, à la fin réelle (ended).
 *
 * Anonyme : clé de session (sessionStorage, même clé que le tracker global) — aucune
 * PII, aucun fingerprint. L'identité membre et l'access_level sont dérivés SERVEUR.
 */
import { useEffect, useRef } from 'react'
import { useAudioPlayer } from '@/components/providers/AudioPlayerProvider'
import { IS_DEMO_MODE } from '@/lib/supabase'
import type { AudioEventType } from '@/lib/podcast/audio-analytics'
import { reduceTracker, type TrackerState } from '@/lib/podcast/audio-tracking'

const SID_KEY = 'cier_track_sid' // aligné sur AnalyticsTracker (1 clé de session par onglet)

function sessionKey(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try { return sessionStorage.getItem(SID_KEY) || undefined } catch { return undefined }
}

/** N'émet pas depuis le back-office (le player global existe mais l'admin ne se compte pas). */
function trackingDisabledHere(): boolean {
  if (typeof window === 'undefined') return true
  const p = window.location.pathname
  return p.startsWith('/admin') || p.startsWith('/preview')
}

interface EmitPayload {
  podcastId: string
  eventType: AudioEventType
  position?: number
  duration?: number | null
  percent?: number
  playlistId?: string
  sourceContext?: string
}

function emit(p: EmitPayload) {
  if (IS_DEMO_MODE || trackingDisabledHere()) return
  try {
    const body = JSON.stringify({
      session: sessionKey(),
      podcastId: p.podcastId,
      eventType: p.eventType,
      position: p.position,
      duration: p.duration ?? undefined,
      percent: p.percent,
      playlistId: p.playlistId,
      sourceContext: p.sourceContext,
    })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/podcast/analytics', new Blob([body], { type: 'application/json' }))
    } else {
      void fetch('/api/podcast/analytics', { method: 'POST', body, keepalive: true })
    }
  } catch { /* non bloquant */ }
}

export function AudioAnalyticsTracker() {
  const { track, playing, elapsed, progress } = useAudioPlayer()
  const st = useRef<TrackerState | null>(null)

  useEffect(() => {
    const id = track?.id
    if (!id) { st.current = null; return }
    const duration = track?.dureeSecondes ?? null

    // Décision déterministe déléguée au réducteur pur (anti double-comptage, testé).
    const { state, events } = reduceTracker(st.current, {
      id,
      playing,
      positionSeconds: elapsed,
      percent: (Number.isFinite(progress) ? progress : 0) * 100,
      startAt: track?.startAt ?? 0,
      ended: progress >= 1,
    })
    st.current = state

    for (const e of events) {
      emit({
        podcastId: id,
        eventType: e.eventType,
        position: e.eventType === 'completed' ? (duration ?? e.position) : e.position,
        duration,
        percent: e.percent,
        playlistId: track?.playlistId,
        sourceContext: track?.sourceContext,
      })
    }
  }, [track?.id, track?.startAt, track?.dureeSecondes, track?.playlistId, track?.sourceContext, playing, elapsed, progress])

  return null
}
