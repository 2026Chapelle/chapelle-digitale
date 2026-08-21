/**
 * CITADELLE INTELLIGENCE HUB — SEO · Connecteur Google Search Console (SERVER-ONLY)
 *
 * ⚠️ STUB DE COORDINATION (chantier 2 remplit l'implémentation).
 * La SIGNATURE exportée `getSearchConsoleSeo` est stable : l'agrégateur du
 * cockpit (chantier 4) l'importe dès maintenant. Le chantier 2 remplace le corps
 * (auth service-account server-only + REST fetch + normalisation) SANS changer la
 * signature. Tant que les credentials sont absents, l'état reste NOT_CONFIGURED.
 *
 * Interdits : aucun secret exposé, aucun NEXT_PUBLIC, aucune donnée inventée.
 */

import type { SeoPeriod, SearchConsoleData } from '../../seo/types'

export interface SearchConsoleQueryOptions {
  period: SeoPeriod
  nowIso: string
}

/**
 * Renvoie les données Search Console normalisées. STUB : NOT_CONFIGURED tant que
 * le chantier 2 n'a pas implémenté l'auth + les appels REST read-only.
 */
export async function getSearchConsoleSeo(
  opts: SearchConsoleQueryOptions,
): Promise<SearchConsoleData> {
  return {
    status: {
      connector: 'google_search_console',
      state: 'NOT_CONFIGURED',
      configured: false,
      reason: 'Connecteur Search Console non encore implémenté (stub).',
      checkedAt: opts.nowIso,
    },
    totals: null,
    queries: [],
    pages: [],
    indexation: [],
    sitemaps: [],
  }
}
