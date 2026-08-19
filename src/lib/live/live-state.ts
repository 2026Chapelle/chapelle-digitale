/**
 * RÉSOLUTION D'ÉTAT LIVE — règle déterministe et pure.
 *
 * Aucune dépendance réseau : `now` est injectable pour des tests
 * déterministes (par défaut `new Date()`).
 */
import { resolveVideoSource } from '@/lib/video'
import type { LiveState, RawCmsLive } from './types'

/** Vrai si la ligne possède une vidéo effectivement lisible (youtube ou fichier). */
function hasPlayableVideo(row: RawCmsLive): boolean {
  return resolveVideoSource({ youtube_url: row.youtube_url, video_url: row.video_url }).kind !== 'none'
}

/**
 * Détermine l'état d'un live à partir des colonnes `cms_lives`.
 *
 * Ordre de priorité (première règle qui matche gagne) :
 *  1. `is_live === true`                                          -> 'live'
 *  2. `status === 'live'`                                         -> 'live'
 *  3. `scheduled_at` existe et est dans le futur                  -> 'upcoming'
 *  4. (`status === 'ended' || status === 'published'`) + vidéo    -> 'replay'
 *  5. `status === 'ended'`                                        -> 'ended'
 *  6. `scheduled_at` dans le passé + vidéo jouable                -> 'replay'
 *  7. défaut                                                       -> 'upcoming'
 */
export function resolveLiveState(row: RawCmsLive, now: Date = new Date()): LiveState {
  if (row.is_live === true) return 'live'
  if (row.status === 'live') return 'live'

  const scheduledAtMs = row.scheduled_at ? Date.parse(row.scheduled_at) : NaN
  const hasValidSchedule = !Number.isNaN(scheduledAtMs)
  const isFuture = hasValidSchedule && scheduledAtMs > now.getTime()
  const isPast = hasValidSchedule && scheduledAtMs <= now.getTime()

  if (isFuture) return 'upcoming'

  const playable = hasPlayableVideo(row)

  if ((row.status === 'ended' || row.status === 'published') && playable) return 'replay'
  if (row.status === 'ended') return 'ended'
  if (isPast && playable) return 'replay'

  return 'upcoming'
}
