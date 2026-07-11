/**
 * VALIDATION VIDÉO — logique PURE (Lot B).
 *
 * Un module vidéo n'est validable qu'après un visionnage réel ≥ 90 %.
 * Le PDF d'un module n'est déverrouillé qu'une fois le module validé.
 * Module pur (aucune dépendance réseau/UI) → testable, réutilisé serveur+client.
 */

/** Seuil de visionnage requis pour valider un module vidéo. */
export const WATCH_THRESHOLD = 90

/** Pourcentage vu (0-100), borné, calculé côté serveur à partir de secondes. */
export function computePercentWatched(watchedSeconds: number, duration: number): number {
  if (!duration || duration <= 0) return 0
  const w = Math.max(0, Math.min(watchedSeconds, duration))
  return Math.min(100, Math.round((w / duration) * 100))
}

/** Le visionnage atteint-il le seuil de validation ? */
export function isWatchedEnough(percent: number): boolean {
  return percent >= WATCH_THRESHOLD
}

/** Pourcentage restant avant de pouvoir valider (0 si atteint). */
export function remainingToWatch(percent: number): number {
  return Math.max(0, WATCH_THRESHOLD - Math.min(100, Math.max(0, percent)))
}

/**
 * Le PDF d'un module est-il déverrouillé ?
 *  - non inscrit → non
 *  - module verrouillé → non
 *  - module non validé → non (« Complétez la vidéo pour débloquer »)
 *  - module validé → oui
 */
export function isPdfUnlocked(opts: { enrolled: boolean; locked: boolean; completed: boolean }): boolean {
  return !!opts.enrolled && !opts.locked && !!opts.completed
}

export type VideoSource = 'youtube' | 'internal' | 'none'

/**
 * Résout la source vidéo d'un module (architecture hybride Lot C).
 * Respecte `source_video` s'il est défini ; sinon déduit de l'existant
 * (rétro-compatible : un module avec youtube_id reste 'youtube').
 */
export function resolveVideoSource(m: { source_video?: string | null; youtube_id?: string | null; video_url?: string | null; video_path?: string | null }): VideoSource {
  const s = (m.source_video || '').toLowerCase()
  if (s === 'youtube' || s === 'internal' || s === 'none') return s as VideoSource
  if (m.youtube_id) return 'youtube'
  if (m.video_url || m.video_path) return 'internal'
  return 'none'
}

/**
 * Extraction robuste de l'ID YouTube (11 caractères) depuis les formats courants
 * (watch?v= / youtu.be / embed / live / shorts) ou un ID brut. null sinon.
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  const raw = url.trim()
  return /^[\w-]{11}$/.test(raw) ? raw : null
}

/**
 * ID YouTube EFFECTIF d'un module : le champ `youtube_id` s'il est renseigné,
 * sinon dérivé de `video_url` (cas fréquent : l'admin colle l'URL YouTube dans le
 * champ « URL vidéo » et laisse `youtube_id` vide). Garantit qu'une vidéo YouTube
 * saisie par URL reste jouable dans le parcours. null si non dérivable.
 */
export function resolveYouTubeId(m: { youtube_id?: string | null; video_url?: string | null }): string | null {
  const direct = (m.youtube_id || '').trim()
  if (direct) return extractYouTubeId(direct) || direct
  return extractYouTubeId(m.video_url ?? null)
}

/** Miniature YouTube publique (hqdefault) d'un module vidéo YouTube, ou null. */
export function youtubeThumbnail(m: { source_video?: string | null; youtube_id?: string | null; video_url?: string | null; video_path?: string | null }): string | null {
  if (resolveVideoSource(m) !== 'youtube') return null
  const id = resolveYouTubeId(m)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}

/** Le module a-t-il une vidéo réellement jouable pour sa source ? */
export function hasPlayableVideo(m: { source_video?: string | null; youtube_id?: string | null; video_url?: string | null; video_path?: string | null }): boolean {
  const src = resolveVideoSource(m)
  // YouTube : jouable si un ID est renseigné OU dérivable de l'URL collée dans video_url.
  if (src === 'youtube') return !!resolveYouTubeId(m)
  if (src === 'internal') return !!(m.video_path || m.video_url)
  return false
}
