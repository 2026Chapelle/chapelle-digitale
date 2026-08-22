/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · YouTube · Client HTTP (SERVER-ONLY)
 *
 * Client typé minimal, LECTURE SEULE, de deux API Google :
 *  - YouTube Data API v3    (channels.list, videos.list) — résolution de la chaîne
 *    canonique + titres de vidéos + stats publiques.
 *  - YouTube Analytics API v2 (reports.query) — vues, temps de visionnage, abonnés,
 *    top vidéos, sources de trafic (propriétaire uniquement).
 *
 * Le transport (`fetchImpl`) est injectable pour des tests 100 % hors-ligne.
 * Aucune dépendance npm. Le bearer token n'est JAMAIS journalisé ; en cas d'échec
 * HTTP on lève une raison NON sensible (`youtube_data_http_<n>` /
 * `youtube_analytics_http_<n>`), sans corps ni secret.
 */

import 'server-only'
import type { FetchImpl } from '../google-auth'

const DATA_API_BASE = 'https://www.googleapis.com/youtube/v3'
const ANALYTICS_API_BASE = 'https://youtubeanalytics.googleapis.com/v2'
const DEFAULT_TIMEOUT_MS = 12_000

/* ------------------------------------------------------------------ */
/* Types de réponse (sous-ensemble utilisé)                            */
/* ------------------------------------------------------------------ */

export interface RawChannelSnippet {
  title?: string
  customUrl?: string
  publishedAt?: string
}

export interface RawChannelStatistics {
  viewCount?: string
  subscriberCount?: string
  hiddenSubscriberCount?: boolean
  videoCount?: string
}

export interface RawChannel {
  id?: string
  snippet?: RawChannelSnippet
  statistics?: RawChannelStatistics
}

export interface RawChannelsList {
  items?: RawChannel[]
}

export interface RawVideoSnippet {
  title?: string
}

export interface RawVideo {
  id?: string
  snippet?: RawVideoSnippet
}

export interface RawVideosList {
  items?: RawVideo[]
}

export interface AnalyticsColumnHeader {
  name?: string
  columnType?: string
  dataType?: string
}

/** Réponse `reports.query` : en-têtes + lignes (valeurs positionnées par en-tête). */
export interface AnalyticsReport {
  columnHeaders?: AnalyticsColumnHeader[]
  rows?: Array<Array<string | number>>
}

export interface YouTubeClientOptions {
  accessToken: string
  fetchImpl?: FetchImpl
  timeoutMs?: number
}

/** Erreur porteuse d'un code NON sensible (jamais de secret). */
export class YouTubeHttpError extends Error {
  constructor(
    public readonly kind: 'data' | 'analytics',
    public readonly status: number,
  ) {
    super(`youtube_${kind}_http_${status}`)
    this.name = 'YouTubeHttpError'
  }
}

/* ------------------------------------------------------------------ */
/* Transport commun (GET JSON, timeout, erreurs non sensibles)         */
/* ------------------------------------------------------------------ */

async function getJson<T>(
  url: string,
  kind: 'data' | 'analytics',
  opts: YouTubeClientOptions,
): Promise<T> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const controller = new AbortController()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Awaited<ReturnType<FetchImpl>>
  try {
    res = await fetchImpl(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${opts.accessToken}` },
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('youtube_timeout')
    }
    throw new Error(`youtube_${kind}_error`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    // Raison non sensible : uniquement le code HTTP, jamais le corps.
    throw new YouTubeHttpError(kind, res.status)
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new Error('youtube_bad_json')
  }
}

/* ------------------------------------------------------------------ */
/* YouTube Data API v3 (read-only)                                     */
/* ------------------------------------------------------------------ */

/** channels.list?forHandle=@… → résolution de la chaîne canonique par handle. */
export async function fetchChannelByHandle(
  handle: string,
  opts: YouTubeClientOptions,
): Promise<RawChannel[]> {
  const url =
    `${DATA_API_BASE}/channels?part=snippet,statistics` +
    `&forHandle=${encodeURIComponent(handle)}`
  const data = await getJson<RawChannelsList>(url, 'data', opts)
  return data.items ?? []
}

/** channels.list?id=UC… → résolution par identifiant de chaîne. */
export async function fetchChannelById(
  channelId: string,
  opts: YouTubeClientOptions,
): Promise<RawChannel[]> {
  const url =
    `${DATA_API_BASE}/channels?part=snippet,statistics` +
    `&id=${encodeURIComponent(channelId)}`
  const data = await getJson<RawChannelsList>(url, 'data', opts)
  return data.items ?? []
}

/** videos.list?id=…,… → titres des top vidéos (best-effort, borné). */
export async function fetchVideoTitles(
  videoIds: ReadonlyArray<string>,
  opts: YouTubeClientOptions,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const ids = videoIds.filter(Boolean).slice(0, 50)
  if (ids.length === 0) return map
  const url =
    `${DATA_API_BASE}/videos?part=snippet&id=${encodeURIComponent(ids.join(','))}`
  const data = await getJson<RawVideosList>(url, 'data', opts)
  for (const item of data.items ?? []) {
    if (item.id && item.snippet?.title) map.set(item.id, item.snippet.title)
  }
  return map
}

/* ------------------------------------------------------------------ */
/* YouTube Analytics API v2 — reports.query (read-only)                */
/* ------------------------------------------------------------------ */

export interface AnalyticsQuery {
  /** Identifiant de chaîne (UC…) — la requête cible `channel==<id>`. */
  channelId: string
  startDate: string
  endDate: string
  metrics: ReadonlyArray<string>
  dimensions?: ReadonlyArray<string>
  sort?: string
  maxResults?: number
}

/** reports.query → rapport Analytics (lecture seule). */
export async function queryAnalytics(
  q: AnalyticsQuery,
  opts: YouTubeClientOptions,
): Promise<AnalyticsReport> {
  const params = new URLSearchParams({
    ids: `channel==${q.channelId}`,
    startDate: q.startDate,
    endDate: q.endDate,
    metrics: q.metrics.join(','),
  })
  if (q.dimensions && q.dimensions.length > 0) {
    params.set('dimensions', q.dimensions.join(','))
  }
  if (q.sort) params.set('sort', q.sort)
  if (q.maxResults != null) params.set('maxResults', String(q.maxResults))
  const url = `${ANALYTICS_API_BASE}/reports?${params.toString()}`
  return getJson<AnalyticsReport>(url, 'analytics', opts)
}
