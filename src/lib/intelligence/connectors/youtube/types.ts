/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · YouTube · Types du module (PUR)
 *
 * Formes normalisées propres au connecteur YouTube. Ces types ÉTENDENT le contrat
 * de coordination (status/totals/topVideos) sans jamais changer les signatures
 * importées ailleurs. Aucun secret ne transite par ces structures.
 */

import type { ChannelStatus } from '../../channels/types'
import type { SeoPeriod, SeoTrend } from '../../seo/types'

/** Infos PUBLIQUES de la chaîne résolue (jamais de secret). */
export interface YouTubeChannelInfo {
  /** Identifiant de chaîne (UC…), public. */
  channelId: string
  /** Handle canonique résolu (public), ex. « @ChapelleRoyaleTV ». */
  handle: string
  title: string | null
  /** Stats « à vie » publiques (peuvent être masquées par la chaîne → null). */
  subscriberCount: number | null
  viewCount: number | null
  videoCount: number | null
  /** true si le nombre d'abonnés est masqué publiquement. */
  subscribersHidden: boolean
}

/** Totaux Analytics d'une fenêtre (compatibles avec le contrat de coordination). */
export interface YouTubeTotals {
  views: number
  watchTimeMinutes: number
  averageViewDurationSec: number
  subscribersGained: number
  subscribersLost: number
}

/** Une top vidéo (analytics par vidéo + titre résolu si dispo). */
export interface YouTubeTopVideo {
  videoId: string
  title: string
  views: number
  watchTimeMinutes: number
  averageViewDurationSec: number
}

/** Source de trafic (acquisition), avec libellé FR. */
export interface YouTubeTrafficSource {
  /** Valeur brute `insightTrafficSourceType` (ex. YT_SEARCH). */
  source: string
  /** Libellé FR pour l'UI. */
  label: string
  views: number
}

/** Tendance d'une métrique période/période (delta signé). */
export interface YouTubeMetricTrend {
  current: number
  previous: number | null
  trend: SeoTrend
  /** Delta relatif signé (ratio) quand calculable. */
  delta?: number
}

/** Bloc de tendances (Vue d'ensemble / Tendances). */
export interface YouTubeTrends {
  views: YouTubeMetricTrend
  watchTimeMinutes: YouTubeMetricTrend
  subscribersNet: YouTubeMetricTrend
  averageViewDurationSec: YouTubeMetricTrend
}

/**
 * Sortie normalisée du connecteur YouTube. Superset du stub de coordination :
 * `status`, `totals`, `topVideos` restent compatibles ; les autres champs sont des
 * enrichissements (canal, tendances, sources de trafic, fenêtre).
 */
export interface YouTubeData {
  status: ChannelStatus
  period: SeoPeriod | null
  channel: YouTubeChannelInfo | null
  totals: YouTubeTotals | null
  /** Totaux de la fenêtre précédente (pour la tendance) — null si indispo. */
  previousTotals: YouTubeTotals | null
  trends: YouTubeTrends | null
  topVideos: ReadonlyArray<YouTubeTopVideo>
  trafficSources: ReadonlyArray<YouTubeTrafficSource>
}
