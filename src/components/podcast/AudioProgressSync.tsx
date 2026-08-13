'use client'
/**
 * PODCAST-2 — Synchronisation de la progression audio (membre) vers le serveur.
 * Monté globalement (layout), OBSERVE le player unique (AudioPlayerProvider) — aucun 2e
 * moteur audio, aucun store concurrent. localStorage n'est PAS utilisé (source de vérité
 * = table serveur `audio_progress`, multi-appareils). Visiteurs (pas d'user) = aucun write.
 *
 * Stratégie d'écriture (throttlée, jamais chaque seconde) :
 *   • périodique toutes les 15 s pendant la lecture ;
 *   • à la pause ;
 *   • à la fin (ended → progress = 1, marque completed) ;
 *   • au changement d'épisode (sauvegarde l'épisode quitté) ;
 *   • au unmount / beforeunload (best-effort).
 */
import { useCallback, useEffect, useRef } from 'react'
import { useAudioPlayer } from '@/components/providers/AudioPlayerProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { computeCompleted, shouldPersist, upsertProgress } from '@/lib/podcast/progress'

const PERSIST_INTERVAL_MS = 15_000

type Snap = { id: string; position: number; duration: number | null; completed: boolean }

export function AudioProgressSync() {
  const { track, playing, elapsed, progress } = useAudioPlayer()
  const { user } = useAuth()
  const userId = user?.id ?? null

  // Miroir « live » de l'épisode courant (position réelle), mis à jour à chaque tick.
  const liveRef = useRef<Snap | null>(null)
  // Dernière valeur réellement écrite (pour le throttling par (id)).
  const lastSavedRef = useRef<{ id: string; position: number; completed: boolean } | null>(null)
  const userIdRef = useRef<string | null>(userId)
  userIdRef.current = userId

  useEffect(() => {
    liveRef.current = track?.id
      ? {
          id: track.id,
          position: Math.floor(elapsed),
          duration: track.dureeSecondes ?? null,
          completed: computeCompleted(elapsed, track.dureeSecondes ?? null, progress >= 1),
        }
      : null
  }, [track?.id, track?.dureeSecondes, elapsed, progress])

  // Écrit un snapshot si le throttling l'autorise (ou force).
  const persistSnap = useCallback((snap: Snap | null, force: boolean) => {
    const uid = userIdRef.current
    if (!uid || !snap || !snap.id) return
    // Rien à écrire pour un simple démarrage à 0 non terminé.
    if (snap.position <= 0 && !snap.completed) return
    const prev = lastSavedRef.current && lastSavedRef.current.id === snap.id
      ? { position: lastSavedRef.current.position, completed: lastSavedRef.current.completed }
      : null
    const next = { position: snap.position, completed: snap.completed }
    if (!shouldPersist(prev, next, force)) return
    lastSavedRef.current = { id: snap.id, position: next.position, completed: next.completed }
    void upsertProgress(supabase, {
      userId: uid, podcastId: snap.id, position: snap.position, duration: snap.duration, completed: snap.completed,
    })
  }, [])

  // Périodique pendant la lecture.
  useEffect(() => {
    if (!playing || !track?.id || !userId) return
    const iv = setInterval(() => persistSnap(liveRef.current, false), PERSIST_INTERVAL_MS)
    return () => clearInterval(iv)
  }, [playing, track?.id, userId, persistSnap])

  // À la pause (transition lecture → pause, épisode présent).
  useEffect(() => {
    if (!playing && track?.id && userId) persistSnap(liveRef.current, true)
  }, [playing, track?.id, userId, persistSnap])

  // À la fin (ended).
  useEffect(() => {
    if (progress >= 1 && track?.id && userId) persistSnap(liveRef.current, true)
  }, [progress, track?.id, userId, persistSnap])

  // Au CHANGEMENT d'épisode (ou unmount) : le cleanup s'exécute AVANT que le nouvel épisode
  // ne mette à jour liveRef → liveRef.current = l'épisode QUITTÉ (dernière position). On le sauve.
  useEffect(() => {
    return () => { persistSnap(liveRef.current, true) }
  }, [track?.id, persistSnap])

  // beforeunload (best-effort).
  useEffect(() => {
    const h = () => persistSnap(liveRef.current, true)
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [persistSnap])

  return null
}
