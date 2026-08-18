/**
 * PODCAST-SPINE — helpers PURS (aucune I/O, aucun client Supabase) → importables
 * côté client ET serveur, et testables unitairement. Les fonctions de LECTURE
 * serveur (avec clients service_role) vivent dans `spine-public.ts` (server-only).
 */
import { normalizeAccessLevel, normalizeDestinations, type PodcastAccessLevel } from './editorial'

// ── Entités ──────────────────────────────────────────────────────────────────
export interface PublicShow {
  id: string; slug: string; title: string
  short_description?: string | null; description?: string | null; cover_url?: string | null
  sort_order?: number; status?: string
}
export interface PublicSeries {
  id: string; show_id: string; slug: string; title: string
  short_description?: string | null; description?: string | null; cover_url?: string | null
  editorial_period?: string | null; sort_order?: number; status?: string
}
export interface PublicSeason {
  id: string; series_id: string; season_number: number; title?: string | null
  short_description?: string | null; description?: string | null; cover_url?: string | null
  sort_order?: number; status?: string
}

export type SpineEpisodeType = 'standard' | 'special'

/** Épisode SÛR pour le client (jamais d'URL média). */
export interface SpineEpisode {
  id: string
  title: string
  description?: string
  cover?: string | null
  duration?: string
  publishedAt?: string | null
  serie?: string | null
  saison?: number | null
  episode?: number | null
  accessLevel: PodcastAccessLevel
  destinations: string[]
  isFeatured: boolean
  hasAudio: boolean
  showId: string | null
  seriesId: string | null
  seasonId: string | null
  episodeType: SpineEpisodeType
  aRetenir?: string | null
  prayerText?: string | null
  declarationText?: string | null
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Normalise une ligne brute cms_podcasts en épisode SÛR. */
export function toSpineEpisode(row: Record<string, unknown>): SpineEpisode {
  const type = row.episode_type === 'special' ? 'special' : 'standard'
  return {
    id: String(row.id),
    title: (str(row.title) ?? 'Épisode'),
    description: str(row.description) ?? undefined,
    cover: str(row.cover_url),
    duration: str(row.duration) ?? undefined,
    publishedAt: str(row.published_at),
    serie: str(row.serie),
    saison: num(row.saison),
    episode: num(row.episode),
    accessLevel: normalizeAccessLevel(row.access_level),
    destinations: normalizeDestinations(row.destinations),
    isFeatured: row.is_featured === true,
    hasAudio: row.has_audio !== false,
    showId: str(row.show_id),
    seriesId: str(row.series_id),
    seasonId: str(row.season_id),
    episodeType: type,
    aRetenir: str(row.a_retenir),
    prayerText: str(row.prayer_text),
    declarationText: str(row.declaration_text),
  }
}

/** Ordre éditorial STABLE : episode (nº) asc, puis published_at asc, puis titre. Jamais aléatoire. */
export function sortSpineEpisodes(eps: SpineEpisode[]): SpineEpisode[] {
  return [...eps].sort((a, b) => {
    const ea = a.episode ?? Number.MAX_SAFE_INTEGER
    const eb = b.episode ?? Number.MAX_SAFE_INTEGER
    if (ea !== eb) return ea - eb
    const pa = a.publishedAt ?? ''
    const pb = b.publishedAt ?? ''
    if (pa !== pb) return pa < pb ? -1 : 1
    return a.title.localeCompare(b.title)
  })
}

/** Regroupe les épisodes par saison (seasonId non nul), chaque groupe trié. */
export function groupEpisodesBySeason(eps: SpineEpisode[]): Map<string, SpineEpisode[]> {
  const out = new Map<string, SpineEpisode[]>()
  for (const e of eps) {
    if (!e.seasonId) continue // legacy / non rattaché → ignoré ici (reste au catalogue)
    const arr = out.get(e.seasonId) ?? []
    arr.push(e)
    out.set(e.seasonId, arr)
  }
  out.forEach((v, k) => out.set(k, sortSpineEpisodes(v)))
  return out
}

/** Compte les épisodes rattachés à une série (via seriesId). */
export function countEpisodesForSeries(eps: SpineEpisode[], seriesId: string): number {
  return eps.filter((e) => e.seriesId === seriesId).length
}

/** Fallback de couverture : saison → série → émission → null. */
export function resolveCover(
  season: { cover_url?: string | null } | null,
  series: { cover_url?: string | null } | null,
  show: { cover_url?: string | null } | null,
): string | null {
  return str(season?.cover_url) ?? str(series?.cover_url) ?? str(show?.cover_url) ?? null
}

/** Titre public d'une saison : thème CMS si présent, sinon « Saison N ». */
export function seasonDisplayTitle(season: PublicSeason): string {
  return str(season.title) ?? `Saison ${season.season_number}`
}

/**
 * Premier épisode réellement JOUABLE par l'utilisateur (pour « Commencer la série »).
 * public = toujours ; member = si connecté membre ; premium = si droit premium.
 * Ne contourne aucun gate : sert seulement à choisir la cible du CTA.
 */
export function pickFirstPlayable(
  eps: SpineEpisode[],
  ctx: { isMember: boolean; hasPremium: boolean },
): SpineEpisode | null {
  const ordered = sortSpineEpisodes(eps)
  const playable = (e: SpineEpisode): boolean => {
    if (!e.hasAudio) return false
    if (e.accessLevel === 'public') return true
    if (e.accessLevel === 'member') return ctx.isMember
    if (e.accessLevel === 'premium') return ctx.hasPremium
    return false
  }
  return ordered.find(playable) ?? null
}

/** Vrai si au moins un épisode « édition spéciale » (pour n'afficher la section que si réelle). */
export function hasSpecialEdition(eps: SpineEpisode[]): boolean {
  return eps.some((e) => e.episodeType === 'special')
}

/**
 * Résout le numéro de saison actif depuis le paramètre d'URL `?saison=N`.
 * URL = source de vérité navigable (back/forward). Valeur invalide / absente /
 * saison draft (hors `available`) → repli sur `fallback` (déjà validé serveur),
 * sinon première saison disponible. N'INVENTE jamais de saison.
 */
export function resolveActiveSeasonNumber(
  raw: string | number | null | undefined,
  available: number[],
  fallback: number,
): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
  if (Number.isInteger(n) && available.includes(n)) return n
  if (available.includes(fallback)) return fallback
  return available[0] ?? fallback
}

// ── Shapes d'affichage dérivées ──────────────────────────────────────────────
export interface SeriesCardData {
  slug: string; title: string; shortDescription?: string | null; cover?: string | null
  showTitle?: string | null; seasonsCount: number; episodesCount: number
}

/** Construit les données d'une carte Série (counts calculés, jamais codés en dur). */
export function buildSeriesCard(
  series: PublicSeries,
  seasons: PublicSeason[],
  episodes: SpineEpisode[],
  showTitle?: string | null,
): SeriesCardData {
  return {
    slug: series.slug,
    title: series.title,
    shortDescription: series.short_description ?? null,
    cover: series.cover_url ?? null,
    showTitle: showTitle ?? null,
    seasonsCount: seasons.length,
    episodesCount: countEpisodesForSeries(episodes, series.id),
  }
}
