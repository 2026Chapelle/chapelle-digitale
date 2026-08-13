/**
 * PODCAST-2 — Progression audio personnelle. Helpers PURS (testables) + I/O thin.
 *
 * Source de vérité = table serveur `audio_progress` (multi-appareils ; PAS localStorage).
 * La progression est PERSONNELLE et isolée par RLS ; distincte des analytics globales (PODCAST-4).
 */

/** % de complétion au-delà duquel un épisode est considéré terminé (si `ended` indisponible). */
export const COMPLETION_RATIO = 0.95
/** Throttle : n'écrit que si la position a bougé d'au moins ce nombre de secondes. */
export const PERSIST_MIN_DELTA_SECONDS = 15
/** Ne PAS reprendre dans les toutes dernières secondes (évite reprendre à 99,9 %). */
export const RESUME_END_GUARD_SECONDS = 5

export interface AudioProgressRow {
  podcast_id: string
  position_seconds: number
  duration_seconds: number | null
  completed: boolean
  last_played_at: string
}

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/**
 * Règle de complétion. Priorité à l'événement `ended` du player (fiable) ; sinon seuil 95 %.
 */
export function computeCompleted(positionSeconds: number, durationSeconds: number | null | undefined, ended = false): boolean {
  if (ended) return true
  const dur = n(durationSeconds)
  if (dur <= 0) return false
  return n(positionSeconds) >= COMPLETION_RATIO * dur
}

/**
 * Position de REPRISE (secondes) à partir d'une ligne de progression. 0 si :
 * absente, terminée, position ≤ 0, position corrompue (> durée), ou trop proche de la fin.
 */
export function resumePositionSeconds(row: AudioProgressRow | null | undefined): number {
  if (!row || row.completed) return 0
  const pos = n(row.position_seconds)
  const dur = n(row.duration_seconds)
  if (pos <= 0) return 0
  if (dur > 0 && pos > dur) return 0 // garde-fou données incohérentes
  if (dur > 0 && pos >= dur - RESUME_END_GUARD_SECONDS) return 0
  return Math.floor(pos)
}

/**
 * Faut-il persister maintenant ? Throttling : force (pause/seek/changement/ended/unmount),
 * OU passage à terminé, OU delta de position ≥ seuil. Évite les écritures par seconde.
 */
export function shouldPersist(
  prev: { position: number; completed: boolean } | null,
  next: { position: number; completed: boolean },
  force = false,
): boolean {
  if (force) return true
  if (next.completed && !(prev?.completed)) return true
  if (!prev) return next.position > 0
  return Math.abs(next.position - prev.position) >= PERSIST_MIN_DELTA_SECONDS
}

export interface ContinueItem<T> {
  episode: T
  positionSeconds: number
  durationSeconds: number
  percent: number
  remainingSeconds: number
}

/**
 * « Continuer l'écoute » : uniquement les épisodes COMMENCÉS, NON terminés, ACCESSIBLES
 * (présents dans `episodes` = catalogue visible au membre), triés par last_played_at DESC.
 * Aucune donnée simulée : dérivé strictement des lignes réelles.
 */
export function buildContinueListening<T extends { id: string }>(
  episodes: T[],
  progress: AudioProgressRow[],
  limit = 12,
): ContinueItem<T>[] {
  const byId = new Map<string, T>()
  for (const e of episodes) if (e && e.id) byId.set(e.id, e)
  const items: (ContinueItem<T> & { at: number })[] = []
  for (const row of (Array.isArray(progress) ? progress : [])) {
    if (!row || row.completed) continue
    const pos = n(row.position_seconds)
    if (pos <= 0) continue
    const ep = byId.get(row.podcast_id)
    if (!ep) continue // non accessible / hors catalogue visible
    const dur = n(row.duration_seconds)
    const percent = dur > 0 ? Math.min(1, pos / dur) : 0
    // Un épisode quasi-fini sans flag completed : on l'exclut aussi (cohérence UX).
    if (dur > 0 && pos >= COMPLETION_RATIO * dur) continue
    items.push({
      episode: ep,
      positionSeconds: Math.floor(pos),
      durationSeconds: Math.floor(dur),
      percent,
      remainingSeconds: dur > 0 ? Math.max(0, Math.floor(dur - pos)) : 0,
      at: Date.parse(row.last_played_at) || 0,
    })
  }
  return items.sort((a, b) => b.at - a.at).slice(0, Math.max(0, limit)).map(({ at, ...rest }) => rest)
}

// ── I/O thin (client Supabase authentifié — RLS applique l'isolation) ───────
interface ProgressClient {
  from: (table: string) => any
}

/** Charge la progression du membre courant (RLS → uniquement ses lignes). */
export async function fetchMyProgress(client: ProgressClient): Promise<AudioProgressRow[]> {
  try {
    const { data, error } = await client
      .from('audio_progress')
      .select('podcast_id, position_seconds, duration_seconds, completed, last_played_at')
    if (error) return []
    return (data as AudioProgressRow[]) ?? []
  } catch {
    return []
  }
}

/** Upsert de la progression (1 ligne par (user, podcast)). RLS impose user_id = auth.uid(). */
export async function upsertProgress(
  client: ProgressClient,
  p: { userId: string; podcastId: string; position: number; duration: number | null; completed: boolean },
): Promise<void> {
  try {
    await client.from('audio_progress').upsert(
      {
        user_id: p.userId,
        podcast_id: p.podcastId,
        position_seconds: Math.max(0, Math.floor(p.position)),
        duration_seconds: p.duration != null && p.duration > 0 ? Math.floor(p.duration) : null,
        completed: p.completed,
        last_played_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,podcast_id' },
    )
  } catch {
    /* best-effort : la progression n'est jamais bloquante pour la lecture */
  }
}
