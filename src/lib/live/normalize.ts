/**
 * NORMALISATION LIVE — transforme une ligne brute `cms_lives` en modèle
 * d'affichage stable (`NormalizedLive`).
 *
 * Module PUR : aucune I/O, `now` injectable pour des tests déterministes.
 */
import { resolveVideoSource } from '@/lib/video'
import { resolveLiveState } from './live-state'
import type { NormalizedLive, RawCmsLive } from './types'

/** Parse `scheduled_at` en `Date`, ou `null` si absent/invalide. */
function parseScheduledAt(value: string | null | undefined): Date | null {
  if (!value) return null
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) return null
  return new Date(ms)
}

/** Trim une description ; chaîne vide après trim -> `null`. */
function normalizeDescription(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Normalise une ligne `cms_lives` brute en `NormalizedLive` prêt à l'affichage. */
export function normalizeLive(row: RawCmsLive, now: Date = new Date()): NormalizedLive {
  const source = resolveVideoSource({ youtube_url: row.youtube_url, video_url: row.video_url })
  const scheduledAt = parseScheduledAt(row.scheduled_at)

  return {
    id: row.id ?? null,
    title: row.title,
    description: normalizeDescription(row.description),
    state: resolveLiveState(row, now),
    scheduledAt,
    isLive: row.is_live === true,
    platform: row.platform ?? null,
    source,
    thumbnailUrl: source.thumbnailUrl ?? row.cover_url ?? null,
    hasPlayableVideo: source.kind !== 'none',
    raw: row,
  }
}

/** Normalise un lot de lignes `cms_lives`. */
export function normalizeLives(rows: RawCmsLive[], now: Date = new Date()): NormalizedLive[] {
  return rows.map((row) => normalizeLive(row, now))
}
