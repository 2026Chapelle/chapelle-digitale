/**
 * Sélection des directs « à venir » à partir de lignes cms_lives.
 * Garde uniquement les lignes `scheduled` dont `scheduled_at` est une date
 * valide strictement dans le futur, triées par date croissante
 * (même règle que le filtre `futureLives` de /live).
 */
export type ScheduledLiveLike = { status?: unknown; scheduled_at?: unknown }

export function selectUpcomingLives<T extends ScheduledLiveLike>(
  rows: readonly T[] | null | undefined,
  now: number = Date.now(),
): T[] {
  return (rows ?? [])
    .flatMap((row) => {
      if (row?.status !== 'scheduled') return []
      if (typeof row.scheduled_at !== 'string' || !row.scheduled_at.trim()) return []
      const time = new Date(row.scheduled_at).getTime()
      return Number.isFinite(time) && time > now ? [{ row, time }] : []
    })
    .sort((a, b) => a.time - b.time)
    .map(({ row }) => row)
}
