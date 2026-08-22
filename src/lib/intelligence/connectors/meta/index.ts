/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Connecteur Meta (Facebook/Instagram) SERVER-ONLY
 *
 * ⚠️ STUB DE COORDINATION (chantier 3 remplit l'implémentation).
 * Signatures stables importées par la route statut (chantier 1), la route
 * /api/intelligence/meta et l'onglet Meta. Le chantier 3 remplace les corps
 * (Meta Graph API READ-ONLY : Page/IG insights) sans changer les signatures.
 * L'accès Meta exige une app + consentement Business owner : tant qu'il manque,
 * l'état reste NOT_CONFIGURED / AUTH_REQUIRED (jamais de faux réel).
 */

import type { ChannelStatus } from '../../channels/types'
import type { SeoPeriod } from '../../seo/types'

export interface MetaQueryOptions {
  period: SeoPeriod
  nowIso: string
}

export interface MetaPlatformMetrics {
  reach: number
  impressions: number
  interactions: number
  clicks: number
  followers: number
}

export interface MetaData {
  facebookStatus: ChannelStatus
  instagramStatus: ChannelStatus
  facebook: MetaPlatformMetrics | null
  instagram: MetaPlatformMetrics | null
}

function stubStatus(
  channel: 'meta_facebook' | 'meta_instagram',
  displayName: string,
  nowIso: string,
): ChannelStatus {
  return {
    channel,
    displayName,
    state: 'NOT_CONFIGURED',
    freshness: 'SYNCED',
    lastSync: null,
    reason: 'Connecteur Meta non encore implémenté (stub).',
    setupRequired: true,
    checkedAt: nowIso,
  }
}

/** Statut Facebook. STUB : NOT_CONFIGURED. */
export async function getMetaFacebookStatus(nowIso: string): Promise<ChannelStatus> {
  return stubStatus('meta_facebook', 'Facebook', nowIso)
}

/** Statut Instagram. STUB : NOT_CONFIGURED. */
export async function getMetaInstagramStatus(nowIso: string): Promise<ChannelStatus> {
  return stubStatus('meta_instagram', 'Instagram', nowIso)
}

/** Données Meta normalisées. STUB : NOT_CONFIGURED / vide. */
export async function getMetaData(opts: MetaQueryOptions): Promise<MetaData> {
  return {
    facebookStatus: stubStatus('meta_facebook', 'Facebook', opts.nowIso),
    instagramStatus: stubStatus('meta_instagram', 'Instagram', opts.nowIso),
    facebook: null,
    instagram: null,
  }
}
