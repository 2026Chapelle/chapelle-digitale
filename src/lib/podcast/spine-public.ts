/**
 * PODCAST-SPINE (public) — LECTURE SERVEUR du modèle éditorial hiérarchique
 * Émission → Série → Saison → Épisode. Ce module utilise des clients Supabase
 * service_role → SERVER-ONLY (garde `import 'server-only'` : toute import depuis
 * un composant client casse le build). Les helpers PURS vivent dans `spine-helpers`.
 *
 * SÉCURITÉ : lecture PUBLIÉE uniquement (status='published' explicite — le client
 * no-store est en service_role et bypass RLS). Les épisodes sont lus via une LISTE
 * EXPLICITE de colonnes SÛRES : `audio_url` / `youtube_url` ne sont JAMAIS
 * sélectionnés. La lecture réelle passe par /api/podcast/[id]/play.
 */
import 'server-only'
import { supabaseCmsRead, IS_DEMO_MODE } from '@/lib/supabase'
import { cmsList } from '@/lib/cms'
import { toSpineEpisode, type SpineEpisode, type PublicShow, type PublicSeries, type PublicSeason } from './spine-helpers'

// Re-export des helpers/​types purs pour les appelants serveur (pages).
export * from './spine-helpers'

// Colonnes SÛRES (jamais audio_url / youtube_url).
export const SPINE_EPISODE_COLUMNS =
  'id, title, description, cover_url, duration, published_at, serie, saison, episode, ' +
  'access_level, destinations, is_featured, has_audio, show_id, series_id, season_id, ' +
  'episode_type, a_retenir, prayer_text, declaration_text'

// ── Lecture serveur (thin) ───────────────────────────────────────────────────
export async function listPublishedShows(): Promise<PublicShow[]> {
  return (await cmsList<PublicShow>('cms_podcast_shows', { publicOnly: true, noStore: true })) ?? []
}

export async function getShowBySlug(slug: string): Promise<PublicShow | null> {
  const rows = await cmsList<PublicShow>('cms_podcast_shows', { publicOnly: true, noStore: true, filter: { slug } })
  return rows?.[0] ?? null
}

export async function getShowById(id: string): Promise<PublicShow | null> {
  const rows = await cmsList<PublicShow>('cms_podcast_shows', { publicOnly: true, noStore: true, filter: { id } })
  return rows?.[0] ?? null
}

/** Compte les saisons publiées par série, en UNE requête (évite le N+1). */
export async function countPublishedSeasonsBySeriesIds(seriesIds: string[]): Promise<Record<string, number>> {
  if (IS_DEMO_MODE || seriesIds.length === 0) return {}
  try {
    const { data, error } = await supabaseCmsRead
      .from('cms_podcast_seasons')
      .select('series_id')
      .eq('status', 'published')
      .in('series_id', seriesIds)
    if (error || !Array.isArray(data)) return {}
    const out: Record<string, number> = {}
    for (const r of data as Array<{ series_id?: string }>) if (r.series_id) out[r.series_id] = (out[r.series_id] ?? 0) + 1
    return out
  } catch {
    return {}
  }
}

export async function listPublishedSeries(): Promise<PublicSeries[]> {
  return (await cmsList<PublicSeries>('cms_podcast_series', { publicOnly: true, noStore: true })) ?? []
}

export async function getPublishedSeriesForShow(showId: string): Promise<PublicSeries[]> {
  return (await cmsList<PublicSeries>('cms_podcast_series', { publicOnly: true, noStore: true, filter: { show_id: showId } })) ?? []
}

export async function getSeriesBySlug(slug: string): Promise<PublicSeries | null> {
  const rows = await cmsList<PublicSeries>('cms_podcast_series', { publicOnly: true, noStore: true, filter: { slug } })
  return rows?.[0] ?? null
}

export async function getPublishedSeasonsForSeries(seriesId: string): Promise<PublicSeason[]> {
  const rows = await cmsList<PublicSeason>('cms_podcast_seasons', {
    publicOnly: true, noStore: true, filter: { series_id: seriesId }, orderBy: 'season_number',
  })
  return rows ?? []
}

/** Épisodes publiés d'une série (une requête, colonnes sûres). */
export async function getPublishedEpisodesForSeries(seriesId: string): Promise<SpineEpisode[]> {
  if (IS_DEMO_MODE) return []
  try {
    const { data, error } = await supabaseCmsRead
      .from('cms_podcasts')
      .select(SPINE_EPISODE_COLUMNS)
      .eq('status', 'published')
      .eq('series_id', seriesId)
    if (error || !Array.isArray(data)) return []
    return (data as unknown as Record<string, unknown>[]).map(toSpineEpisode)
  } catch {
    return []
  }
}

/** Épisodes publiés d'une émission (pour compter/regrouper par série). */
export async function getPublishedEpisodesForShow(showId: string): Promise<SpineEpisode[]> {
  if (IS_DEMO_MODE) return []
  try {
    const { data, error } = await supabaseCmsRead
      .from('cms_podcasts')
      .select(SPINE_EPISODE_COLUMNS)
      .eq('status', 'published')
      .eq('show_id', showId)
    if (error || !Array.isArray(data)) return []
    return (data as unknown as Record<string, unknown>[]).map(toSpineEpisode)
  } catch {
    return []
  }
}
