import {
  IS_DEMO_MODE,
  supabaseCmsRead,
} from '@/lib/supabase'

import {
  listPublishedTeachingCatalog,
} from './teaching-access-server'

import type {
  TeachingCatalogItem,
} from './teaching-access'

export interface PublishedTeachingSeason {
  id: string
  series_id: string
  season_number: number
  title?: string | null
  short_description?: string | null
  cover_url?: string | null
  sort_order: number
  teachings: TeachingCatalogItem[]
}

export interface PublishedTeachingSeries {
  id: string
  slug: string
  title: string
  short_description?: string | null
  cover_url?: string | null
  sort_order: number
  seasons: PublishedTeachingSeason[]
  teachingsWithoutSeason: TeachingCatalogItem[]
  teachingCount: number
}

export interface PublishedTeachingLibrary {
  series: PublishedTeachingSeries[]
  standalone: TeachingCatalogItem[]
}

export async function listPublishedTeachingLibrary():
Promise<PublishedTeachingLibrary> {
  if (IS_DEMO_MODE) {
    return { series: [], standalone: [] }
  }

  try {
    const [catalog, seriesResult, seasonsResult] = await Promise.all([
      listPublishedTeachingCatalog(),

      supabaseCmsRead
        .from('cms_teaching_series')
        .select('id, slug, title, short_description, cover_url, sort_order')
        .eq('status', 'published')
        .order('sort_order', { ascending: true }),

      supabaseCmsRead
        .from('cms_teaching_seasons')
        .select('id, series_id, season_number, title, short_description, cover_url, sort_order')
        .eq('status', 'published')
        .order('sort_order', { ascending: true }),
    ])

    const seriesRows =
      !seriesResult.error && Array.isArray(seriesResult.data)
        ? seriesResult.data
        : []

    const seasonRows =
      !seasonsResult.error && Array.isArray(seasonsResult.data)
        ? seasonsResult.data
        : []

    const seasonsBySeries =
      new Map<string, PublishedTeachingSeason[]>()

    for (const row of seasonRows) {
      if (!row.series_id) continue

      const season: PublishedTeachingSeason = {
        id: row.id,
        series_id: row.series_id,
        season_number: Number(row.season_number || 0),
        title: row.title ?? null,
        short_description: row.short_description ?? null,
        cover_url: row.cover_url ?? null,
        sort_order: Number(row.sort_order || 0),
        teachings: catalog.filter((item) => item.season_id === row.id),
      }

      const current = seasonsBySeries.get(row.series_id) || []
      current.push(season)
      seasonsBySeries.set(row.series_id, current)
    }

    const series: PublishedTeachingSeries[] =
      seriesRows
        .filter(
          (row) =>
            typeof row.slug === 'string' &&
            row.slug.trim() &&
            typeof row.title === 'string' &&
            row.title.trim(),
        )
        .map((row) => {
          const seasons = seasonsBySeries.get(row.id) || []

          const teachingsWithoutSeason =
            catalog.filter(
              (item) =>
                item.series_id === row.id &&
                !item.season_id,
            )

          const teachingCount =
            seasons.reduce(
              (total, season) => total + season.teachings.length,
              teachingsWithoutSeason.length,
            )

          return {
            id: row.id,
            slug: row.slug.trim(),
            title: row.title.trim(),
            short_description: row.short_description ?? null,
            cover_url: row.cover_url ?? null,
            sort_order: Number(row.sort_order || 0),
            seasons,
            teachingsWithoutSeason,
            teachingCount,
          }
        })

    return {
      series,
      standalone: catalog.filter((item) => !item.series_id),
    }
  } catch {
    return { series: [], standalone: [] }
  }
}
