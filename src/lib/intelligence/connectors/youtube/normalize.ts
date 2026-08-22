/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · YouTube · Normalisation (PUR)
 *
 * Traduit les réponses brutes (Data API + Analytics API) en structures normalisées.
 * AUCUN I/O, aucun secret : module pur et testable hors-ligne. Les valeurs sont
 * lues PAR NOM de colonne (jamais par position brute) pour dégrader proprement si
 * une métrique/dimension manque.
 */

import type { SeoTrend } from '../../seo/types'
import { normalizeHandle } from './config'
import type {
  AnalyticsReport,
  RawChannel,
} from './client'
import type {
  YouTubeChannelInfo,
  YouTubeMetricTrend,
  YouTubeTopVideo,
  YouTubeTotals,
  YouTubeTrafficSource,
  YouTubeTrends,
} from './types'

/* ------------------------------------------------------------------ */
/* Parsing tolérant                                                    */
/* ------------------------------------------------------------------ */

function parseNum(raw: string | number | undefined | null): number {
  if (raw == null || raw === '') return 0
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : 0
}

/** Parse un compteur public optionnel ; null si absent (jamais inventé). */
function parseOptionalCount(raw: string | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Indexe les en-têtes Analytics par nom (position-indépendant). */
function columnIndex(report: AnalyticsReport): Map<string, number> {
  const map = new Map<string, number>()
  ;(report.columnHeaders ?? []).forEach((h, i) => {
    if (h && typeof h.name === 'string') map.set(h.name, i)
  })
  return map
}

function readCell(
  row: ReadonlyArray<string | number> | undefined,
  index: Map<string, number>,
  name: string,
): string | number | undefined {
  const i = index.get(name)
  if (i == null) return undefined
  return row?.[i]
}

/* ------------------------------------------------------------------ */
/* Résolution de la chaîne canonique                                   */
/* ------------------------------------------------------------------ */

export interface ChannelResolution {
  /** Chaîne résolue et vérifiée canonique — null si aucune correspondance sûre. */
  channel: YouTubeChannelInfo | null
  /** true si l'actif correspond bien à la chaîne canonique attendue. */
  matched: boolean
  /** Nombre d'items renvoyés par l'API (pour la garde d'ambiguïté). */
  itemCount: number
}

/**
 * Normalise + VÉRIFIE la correspondance canonique. On refuse de connecter le
 * mauvais actif : si l'API renvoie 0 item, ou un item dont le handle (customUrl)
 * ne correspond pas au handle canonique attendu, `matched=false`.
 *
 * `expectedHandle` = handle canonique (« @ChapelleRoyaleTV »).
 * `resolvedById` = true si la résolution s'est faite par YOUTUBE_CHANNEL_ID
 * explicite (on fait alors confiance à l'id fourni, mais on renseigne quand même
 * le handle réel s'il est présent).
 */
export function resolveCanonicalChannel(
  items: ReadonlyArray<RawChannel>,
  expectedHandle: string,
  resolvedById = false,
): ChannelResolution {
  const itemCount = items.length
  if (itemCount === 0) return { channel: null, matched: false, itemCount }

  const wanted = normalizeHandle(expectedHandle)

  // Résolution par handle : on exige une correspondance stricte du customUrl.
  // Résolution par id explicite : on accepte l'unique item, mais on vérifie le
  // handle s'il est disponible (mismatch ⇒ refus).
  let picked: RawChannel | undefined
  for (const it of items) {
    const custom = normalizeHandle(it.snippet?.customUrl)
    if (custom && custom === wanted) {
      picked = it
      break
    }
  }

  if (!picked) {
    if (resolvedById && itemCount === 1) {
      const only = items[0]
      const custom = normalizeHandle(only.snippet?.customUrl)
      // id explicite mais handle présent et divergent ⇒ mauvais actif : refus.
      if (custom && custom !== wanted) {
        return { channel: null, matched: false, itemCount }
      }
      picked = only
    } else {
      // Aucune correspondance de handle (ou ambiguïté multi-items) ⇒ refus.
      return { channel: null, matched: false, itemCount }
    }
  }

  const stats = picked.statistics ?? {}
  const channel: YouTubeChannelInfo = {
    channelId: picked.id ?? '',
    handle: picked.snippet?.customUrl
      ? `@${normalizeHandle(picked.snippet.customUrl)}`
      : expectedHandle,
    title: picked.snippet?.title ?? null,
    subscriberCount: stats.hiddenSubscriberCount
      ? null
      : parseOptionalCount(stats.subscriberCount),
    viewCount: parseOptionalCount(stats.viewCount),
    videoCount: parseOptionalCount(stats.videoCount),
    subscribersHidden: Boolean(stats.hiddenSubscriberCount),
  }

  if (!channel.channelId) return { channel: null, matched: false, itemCount }
  return { channel, matched: true, itemCount }
}

/* ------------------------------------------------------------------ */
/* Totaux Analytics (fenêtre sans dimension → une seule ligne)         */
/* ------------------------------------------------------------------ */

export const TOTALS_METRICS = [
  'views',
  'estimatedMinutesWatched',
  'averageViewDuration',
  'subscribersGained',
  'subscribersLost',
] as const

/**
 * Normalise un rapport « totaux » (aucune dimension). Si aucune ligne (0 activité),
 * renvoie des totaux à zéro — jamais null, jamais inventé.
 */
export function normalizeTotals(report: AnalyticsReport): YouTubeTotals {
  const index = columnIndex(report)
  const row = (report.rows ?? [])[0]
  return {
    views: parseNum(readCell(row, index, 'views')),
    watchTimeMinutes: parseNum(readCell(row, index, 'estimatedMinutesWatched')),
    averageViewDurationSec: parseNum(readCell(row, index, 'averageViewDuration')),
    subscribersGained: parseNum(readCell(row, index, 'subscribersGained')),
    subscribersLost: parseNum(readCell(row, index, 'subscribersLost')),
  }
}

/* ------------------------------------------------------------------ */
/* Top vidéos (dimension=video)                                        */
/* ------------------------------------------------------------------ */

export const TOP_VIDEO_METRICS = [
  'views',
  'estimatedMinutesWatched',
  'averageViewDuration',
] as const

/**
 * Normalise un rapport « top vidéos » (dimension `video`). `titles` mappe videoId →
 * titre (best-effort via Data API) ; à défaut on retombe sur le videoId comme
 * libellé (jamais de titre inventé).
 */
export function normalizeTopVideos(
  report: AnalyticsReport,
  titles: ReadonlyMap<string, string>,
): YouTubeTopVideo[] {
  const index = columnIndex(report)
  const out: YouTubeTopVideo[] = []
  for (const row of report.rows ?? []) {
    const videoId = String(readCell(row, index, 'video') ?? '')
    if (!videoId) continue
    out.push({
      videoId,
      title: titles.get(videoId) ?? videoId,
      views: parseNum(readCell(row, index, 'views')),
      watchTimeMinutes: parseNum(readCell(row, index, 'estimatedMinutesWatched')),
      averageViewDurationSec: parseNum(readCell(row, index, 'averageViewDuration')),
    })
  }
  return out
}

/** Extrait les identifiants de vidéo d'un rapport top-vidéos (pour videos.list). */
export function extractVideoIds(report: AnalyticsReport): string[] {
  const index = columnIndex(report)
  const ids: string[] = []
  for (const row of report.rows ?? []) {
    const v = String(readCell(row, index, 'video') ?? '')
    if (v) ids.push(v)
  }
  return ids
}

/* ------------------------------------------------------------------ */
/* Sources de trafic (dimension=insightTrafficSourceType)              */
/* ------------------------------------------------------------------ */

/** Libellés FR des sources de trafic YouTube (Acquisition). */
export const TRAFFIC_SOURCE_LABELS_FR: Record<string, string> = {
  YT_SEARCH: 'Recherche YouTube',
  RELATED_VIDEO: 'Vidéos suggérées',
  SUBSCRIBER: 'Abonnés / flux',
  EXT_URL: 'Sites externes',
  PLAYLIST: 'Playlists',
  YT_PLAYLIST_PAGE: 'Pages de playlist',
  YT_CHANNEL: 'Page de la chaîne',
  YT_OTHER_PAGE: 'Autres pages YouTube',
  NOTIFICATION: 'Notifications',
  NO_LINK_OTHER: 'Direct / autre',
  NO_LINK_EMBEDDED: 'Lecteurs intégrés',
  SHORTS: 'Shorts',
  END_SCREEN: 'Écrans de fin',
  ANNOTATION: 'Fiches / annotations',
  CAMPAIGN_CARD: 'Fiches de campagne',
  ADVERTISING: 'Publicité',
  PROMOTED: 'Contenu sponsorisé',
  HASHTAGS: 'Hashtags',
  SOUND_PAGE: 'Page de son',
}

export function trafficSourceLabelFr(source: string): string {
  return TRAFFIC_SOURCE_LABELS_FR[source] ?? source
}

/** Normalise un rapport « sources de trafic » (dimension insightTrafficSourceType). */
export function normalizeTrafficSources(
  report: AnalyticsReport,
): YouTubeTrafficSource[] {
  const index = columnIndex(report)
  const out: YouTubeTrafficSource[] = []
  for (const row of report.rows ?? []) {
    const source = String(readCell(row, index, 'insightTrafficSourceType') ?? '')
    if (!source) continue
    out.push({
      source,
      label: trafficSourceLabelFr(source),
      views: parseNum(readCell(row, index, 'views')),
    })
  }
  out.sort((a, b) => b.views - a.views)
  return out
}

/* ------------------------------------------------------------------ */
/* Tendances période/période                                           */
/* ------------------------------------------------------------------ */

/** Seuil de « flat » : variation relative sous 5 % ⇒ stable. */
const FLAT_THRESHOLD = 0.05

export function computeMetricTrend(
  current: number,
  previous: number | null,
): YouTubeMetricTrend {
  if (previous == null) return { current, previous: null, trend: 'unknown' }
  if (previous === 0) {
    if (current === 0) return { current, previous, trend: 'flat', delta: 0 }
    return { current, previous, trend: 'new' }
  }
  const delta = (current - previous) / Math.abs(previous)
  let trend: SeoTrend = 'flat'
  if (delta > FLAT_THRESHOLD) trend = 'up'
  else if (delta < -FLAT_THRESHOLD) trend = 'down'
  return { current, previous, trend, delta }
}

/** Construit le bloc de tendances (abonnés = solde net gagnés − perdus). */
export function buildTrends(
  totals: YouTubeTotals,
  previous: YouTubeTotals | null,
): YouTubeTrends {
  const netNow = totals.subscribersGained - totals.subscribersLost
  const netPrev =
    previous == null ? null : previous.subscribersGained - previous.subscribersLost
  return {
    views: computeMetricTrend(totals.views, previous?.views ?? null),
    watchTimeMinutes: computeMetricTrend(
      totals.watchTimeMinutes,
      previous?.watchTimeMinutes ?? null,
    ),
    subscribersNet: computeMetricTrend(netNow, netPrev),
    averageViewDurationSec: computeMetricTrend(
      totals.averageViewDurationSec,
      previous?.averageViewDurationSec ?? null,
    ),
  }
}
