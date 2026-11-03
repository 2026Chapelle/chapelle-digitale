export interface HomeFeaturedPodcast {
  id: string
  title?: string | null
  status?: string | null
  published_at?: string | null
}

export function readTodayPodcastId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }

  const id = (data as Record<string, unknown>).today_podcast_id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

export function withTodayPodcastId(
  data: unknown,
  id: string | null,
): Record<string, unknown> {
  const existing =
    data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {}

  return {
    ...existing,
    today_podcast_id: id,
  }
}

export function selectTodayPodcast<T extends HomeFeaturedPodcast>(
  episodes: T[],
  selectedId: string | null,
): T | null {
  const published = episodes
    .filter((episode) =>
      episode &&
      typeof episode.id === 'string' &&
      episode.status === 'published' &&
      typeof episode.title === 'string' &&
      episode.title.trim().length > 0
    )
    .sort((a, b) => {
      const da = a.published_at || ''
      const db = b.published_at || ''

      if (da !== db) return da < db ? 1 : -1
      return a.id.localeCompare(b.id)
    })

  if (selectedId) {
    const selected = published.find((episode) => episode.id === selectedId)
    if (selected) return selected
  }

  return published[0] ?? null
}