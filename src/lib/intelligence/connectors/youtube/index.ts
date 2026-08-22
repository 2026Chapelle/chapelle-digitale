/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Connecteur YouTube (SERVER-ONLY)
 *
 * ⚠️ STUB DE COORDINATION (chantier 2 remplit l'implémentation).
 * Signatures stables importées par la route statut (chantier 1), la route
 * /api/intelligence/youtube et l'onglet YouTube. Le chantier 2 remplace les corps
 * (OAuth 2.0 READ-ONLY utilisateur + YouTube Data/Analytics API) sans changer les
 * signatures. YouTube Analytics exige un consentement OAuth du propriétaire de la
 * chaîne : tant qu'il manque, l'état reste AUTH_REQUIRED (jamais de faux réel).
 */

import type { ChannelStatus } from '../../channels/types'
import type { SeoPeriod } from '../../seo/types'

export interface YouTubeQueryOptions {
  period: SeoPeriod
  nowIso: string
}

/** Métrique YouTube normalisée (vues, watch time…). Détail rempli au chantier 2. */
export interface YouTubeData {
  status: ChannelStatus
  totals: {
    views: number
    watchTimeMinutes: number
    averageViewDurationSec: number
    subscribersGained: number
    subscribersLost: number
  } | null
  topVideos: ReadonlyArray<{ title: string; views: number; watchTimeMinutes: number }>
}

function stubStatus(nowIso: string): ChannelStatus {
  return {
    channel: 'youtube',
    displayName: 'YouTube',
    state: 'NOT_CONFIGURED',
    freshness: 'SEO_DELAYED',
    lastSync: null,
    reason: 'Connecteur YouTube non encore implémenté (stub).',
    setupRequired: true,
    checkedAt: nowIso,
  }
}

/** Statut du connecteur YouTube. STUB : NOT_CONFIGURED. */
export async function getYouTubeStatus(nowIso: string): Promise<ChannelStatus> {
  return stubStatus(nowIso)
}

/** Données YouTube normalisées. STUB : NOT_CONFIGURED / vide. */
export async function getYouTubeData(opts: YouTubeQueryOptions): Promise<YouTubeData> {
  return { status: stubStatus(opts.nowIso), totals: null, topVideos: [] }
}
