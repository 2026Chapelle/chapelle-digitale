/**
 * CITADELLE INTELLIGENCE HUB — SEO · Connecteur GA4 organique (SERVER-ONLY)
 *
 * ⚠️ STUB DE COORDINATION (chantier 3 remplit l'implémentation).
 * La SIGNATURE exportée `getGa4OrganicSeo` est stable : l'agrégateur du cockpit
 * (chantier 4) l'importe dès maintenant. Le chantier 3 remplace le corps
 * (Google Analytics Data API `runReport`, filtre Organic Search, server-only)
 * SANS changer la signature. Tant que les credentials/GA_PROPERTY_ID sont absents,
 * l'état reste NOT_CONFIGURED.
 *
 * GA4 et l'analytics first-party Citadelle restent DEUX sources distinctes :
 * ne jamais fusionner leurs métriques sans libellé de source explicite.
 */

import type { SeoPeriod, Ga4Data } from '../../seo/types'

export interface Ga4QueryOptions {
  period: SeoPeriod
  nowIso: string
}

/**
 * Renvoie la performance organique GA4 normalisée. STUB : NOT_CONFIGURED tant que
 * le chantier 3 n'a pas implémenté l'auth + `runReport` read-only.
 */
export async function getGa4OrganicSeo(opts: Ga4QueryOptions): Promise<Ga4Data> {
  return {
    status: {
      connector: 'google_analytics',
      state: 'NOT_CONFIGURED',
      configured: false,
      reason: 'Connecteur GA4 non encore implémenté (stub).',
      checkedAt: opts.nowIso,
    },
    organic: null,
  }
}
