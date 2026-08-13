/**
 * PODCAST-4 — Réducteur PUR de l'observateur d'écoute (logique anti double-comptage).
 *
 * Isolé du composant React pour être testable en isolation : à partir de l'état
 * courant et d'un échantillon du player, il décide DÉTERMINISTIQUEMENT quels
 * événements émettre (jamais deux fois), et renvoie le nouvel état.
 *
 * Garanties :
 *  • play_start / play_resume : UNE seule fois, après MIN_PLAY_SECONDS de lecture
 *    réelle (un clic qui n'aboutit jamais à la lecture ne produit aucun play) ;
 *  • progress_checkpoint : une fois par seuil franchi (25/50/75/95) ;
 *  • completed : une fois, à la fin réelle (ended) ;
 *  • aucun événement tant que le play n'est pas validé (checkpoints/completed inclus).
 */
import { CHECKPOINT_THRESHOLDS, MIN_PLAY_SECONDS, COMPLETION_PERCENT, type AudioEventType } from './audio-analytics'

export interface TrackerState {
  id: string
  resumeBase: number        // position de départ (>0 ⇒ reprise)
  started: boolean
  fired: number[]           // seuils de checkpoint déjà émis
  completed: boolean
}

export interface PlaybackSample {
  id: string
  playing: boolean
  positionSeconds: number
  percent: number           // 0..100
  startAt: number           // position de reprise appliquée par le player (0 si nouvelle écoute)
  ended: boolean            // fin réelle atteinte (progress >= 1)
}

export interface PendingEvent {
  eventType: AudioEventType
  percent: number
  position: number
}

export function initTrackerState(id: string, startAt: number): TrackerState {
  return { id, resumeBase: startAt > 0 ? startAt : 0, started: false, fired: [], completed: false }
}

const clampPct = (p: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(p) ? p : 0)))

/**
 * Fait avancer l'état d'observation d'un cran. Réinitialise si l'épisode a changé.
 * Renvoie le nouvel état + les événements à émettre pour cet échantillon.
 */
export function reduceTracker(prev: TrackerState | null, sample: PlaybackSample): { state: TrackerState; events: PendingEvent[] } {
  // Changement d'épisode (ou premier échantillon) → nouvel état propre.
  let state: TrackerState = prev && prev.id === sample.id ? { ...prev, fired: [...prev.fired] } : initTrackerState(sample.id, sample.startAt)
  const events: PendingEvent[] = []
  const pct = clampPct(sample.percent)
  const pos = Math.max(0, Math.floor(sample.positionSeconds))

  // ── play_start / play_resume : après un minimum de lecture réelle ──
  if (!state.started && sample.playing && pos >= state.resumeBase + MIN_PLAY_SECONDS) {
    state.started = true
    events.push({ eventType: state.resumeBase > 0 ? 'play_resume' : 'play_start', percent: pct, position: pos })
  }

  // ── checkpoints (seuils, une fois chacun) — uniquement après un play validé ──
  if (state.started && !state.completed) {
    for (const thr of CHECKPOINT_THRESHOLDS) {
      if (pct >= thr && !state.fired.includes(thr)) {
        state.fired.push(thr)
        events.push({ eventType: 'progress_checkpoint', percent: thr, position: pos })
      }
    }
  }

  // ── completed : fin réelle, une fois ──
  if (state.started && !state.completed && (sample.ended || pct >= 100)) {
    state.completed = true
    events.push({ eventType: 'completed', percent: 100, position: pos })
  }

  return { state, events }
}

export { COMPLETION_PERCENT }
