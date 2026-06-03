'use client'
/**
 * useAcademyProgress — couche de PERSISTANCE de la progression de l'Académie.
 *
 * S'appuie sur le moteur PUR (src/lib/parcours/progress.ts) pour toute la
 * logique (déblocage, statut, %, validation). Le stockage est localStorage
 * pour l'instant ; c'est le SEAM : remplacer le backend par les RPC du schéma
 * `academy` ne changera AUCUN composant UI (même API de hook).
 *
 * Événements réels tracés (aucune donnée fictive) : module ouvert, PDF
 * téléchargé, module terminé, badge obtenu — + temps d'étude mesuré.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { PARCOURS_ACADEMIE } from '@/lib/parcours/registry'
import {
  type ProgrammeProgress, type StepProgress, type StepStatus,
  startProgramme, stepStatus, isStepCompleted, programmeProgressPct, completedCount,
  markStepComplete,
} from '@/lib/parcours/progress'

const KEY = 'cier_academy_progress_v1'

export type HistoryEvent = { stepId: string; type: 'opened' | 'pdf' | 'video' | 'completed' | 'badge'; at: string; label?: string }

interface Store extends ProgrammeProgress {
  history: HistoryEvent[]
  studyMs: number
}

function freshStore(): Store {
  return { ...startProgramme(PARCOURS_ACADEMIE.slug, new Date()), history: [], studyMs: 0 }
}

function load(): Store {
  if (typeof window === 'undefined') return freshStore()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshStore()
    const s = JSON.parse(raw) as Store
    return { slug: PARCOURS_ACADEMIE.slug, startedAt: s.startedAt || new Date().toISOString(), steps: s.steps || {}, history: s.history || [], studyMs: s.studyMs || 0 }
  } catch { return freshStore() }
}

export function useAcademyProgress() {
  const [store, setStore] = useState<Store>(freshStore)
  const [ready, setReady] = useState(false)
  const ref = useRef<Store>(store)
  ref.current = store

  useEffect(() => { setStore(load()); setReady(true) }, [])

  const persist = useCallback((next: Store) => {
    ref.current = next
    setStore(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota */ }
  }, [])

  const statusOf = useCallback((stepId: string): StepStatus => {
    const base = stepStatus(PARCOURS_ACADEMIE, ref.current, stepId, new Date())
    if (base === 'available' && ref.current.history.some((h) => h.stepId === stepId)) return 'in_progress'
    return base
  }, [store])

  const isCompleted = useCallback((stepId: string) => isStepCompleted(ref.current, stepId), [store])

  const logEvent = useCallback((stepId: string, type: HistoryEvent['type'], label?: string) => {
    const ev: HistoryEvent = { stepId, type, at: new Date().toISOString(), label }
    persist({ ...ref.current, history: [...ref.current.history, ev] })
  }, [persist])

  const completeModule = useCallback((stepId: string, badgeLabel?: string) => {
    let next = markStepComplete(ref.current, stepId, new Date()) as Store
    next = { ...next, history: ref.current.history, studyMs: ref.current.studyMs }
    next.history = [...next.history, { stepId, type: 'completed', at: new Date().toISOString() }]
    if (badgeLabel) next.history = [...next.history, { stepId, type: 'badge', at: new Date().toISOString(), label: badgeLabel }]
    persist(next)
  }, [persist])

  const addStudyTime = useCallback((ms: number) => {
    if (ms <= 0) return
    persist({ ...ref.current, studyMs: ref.current.studyMs + ms })
  }, [persist])

  const reset = useCallback(() => persist(freshStore()), [persist])

  return {
    ready,
    progress: store,
    statusOf,
    isCompleted,
    logEvent,
    completeModule,
    addStudyTime,
    reset,
    pct: programmeProgressPct(PARCOURS_ACADEMIE, store),
    completed: completedCount(PARCOURS_ACADEMIE, store),
    history: [...store.history].reverse(),
    studyMinutes: Math.round(store.studyMs / 60000),
    badges: store.history.filter((h) => h.type === 'badge'),
  }
}

export type { StepProgress, ProgrammeProgress }
