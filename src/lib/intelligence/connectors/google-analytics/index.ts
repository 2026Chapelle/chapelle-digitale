/**
 * CITADELLE INTELLIGENCE HUB — SEO · Connecteur GA4 organique (SERVER-ONLY)
 *
 * Implémentation RÉELLE (lecture seule) de la performance organique GA4 via la
 * Google Analytics Data API (`runReport`), filtrée sur le canal « Organic
 * Search ». Auth par service-account (JWT RS256 → OAuth2), transport injectable
 * pour des tests 100 % hors-ligne. La SIGNATURE `getGa4OrganicSeo` est stable :
 * l'agrégateur du cockpit (chantier 4) l'importe déjà.
 *
 * SÉCURITÉ / HONNÊTETÉ ABSOLUES :
 *  - `import 'server-only'` : jamais côté client, jamais de NEXT_PUBLIC.
 *  - Aucun secret/token journalisé, renvoyé ni exposé. `property` est un
 *    identifiant PUBLIC (non secret) exposé seulement en cas de succès/erreur.
 *  - JAMAIS de donnée inventée : sans credentials ou sans GA4_PROPERTY_ID →
 *    NOT_CONFIGURED ; erreur API → ERROR (raison non sensible), organic = null.
 *  - GA4 et l'analytics first-party Citadelle sont DEUX sources DISTINCTES
 *    (source `google_analytics`) : ne jamais fusionner leurs métriques.
 *  - Fraîcheur GA4 = SYNCED (rapports standard par lots) — JAMAIS « temps réel ».
 */

import 'server-only'
import type { Ga4Data, Ga4OrganicSummary, SeoPeriod } from '../../seo/types'
import type { FetchImpl } from '../google-auth'
import { getAccessToken } from '../google-auth'
import { GA4_READONLY_SCOPE, hasGa4Credentials, loadGa4Config } from './config'
import { runReport } from './client'
import { buildOrganicRequest, normalizeReport } from './normalize'

/**
 * Options de requête GA4. `period` + `nowIso` sont la surface stable importée par
 * l'agrégateur ; les autres champs sont des injections OPTIONNELLES (tests
 * hors-ligne) et ne sont jamais requises en production.
 */
export interface Ga4QueryOptions {
  period: SeoPeriod
  nowIso: string
  /** Transport injectable (défaut : fetch global). */
  fetchImpl?: FetchImpl
  /** Environnement injectable (défaut : process.env). */
  env?: NodeJS.ProcessEnv
  /** Instant epoch injecté pour l'auth (défaut : dérivé de nowIso). */
  nowMs?: number
  /** Nombre max de pages d'atterrissage renvoyées. */
  landingPageLimit?: number
}

/** Raisons non sensibles autorisées dans un statut public. */
function nonSensitiveReason(err: unknown): string {
  const msg = err instanceof Error ? err.message : ''
  // Ces codes ne contiennent que des statuts HTTP / états techniques, jamais de
  // secret ni de corps de réponse.
  if (/^ga4_http_\d+$/.test(msg)) return msg
  if (/^oauth_token_http_\d+$/.test(msg)) return msg
  if (msg === 'ga4_bad_json' || msg === 'oauth_token_missing') return msg
  if (msg === 'ga4_timeout' || (err instanceof Error && err.name === 'AbortError')) {
    return 'ga4_timeout'
  }
  return 'ga4_error'
}

/**
 * Récupère et normalise la fenêtre courante. Dégrade proprement si la métrique
 * `conversions` est refusée par le compte (HTTP 400) : un seul retry sans elle,
 * sans faire échouer tout le rapport.
 */
async function fetchOrganic(
  property: string,
  accessToken: string,
  opts: Ga4QueryOptions,
): Promise<Ga4OrganicSummary> {
  const clientOpts = { accessToken, property, fetchImpl: opts.fetchImpl }
  const range = { from: opts.period.from, to: opts.period.to }
  try {
    const resp = await runReport(
      buildOrganicRequest(range, {
        includeConversions: true,
        limit: opts.landingPageLimit,
      }),
      clientOpts,
    )
    return normalizeReport(resp)
  } catch (err) {
    if (err instanceof Error && err.message === 'ga4_http_400') {
      // La métrique `conversions` peut être indisponible : on réessaie sans elle.
      const resp = await runReport(
        buildOrganicRequest(range, {
          includeConversions: false,
          limit: opts.landingPageLimit,
        }),
        clientOpts,
      )
      return normalizeReport(resp)
    }
    throw err
  }
}

/**
 * Renvoie la performance organique GA4 normalisée (lecture seule).
 * État honnête : NOT_CONFIGURED (credentials/property absents), PASS (données),
 * ERROR (échec API, raison non sensible, organic = null).
 */
export async function getGa4OrganicSeo(opts: Ga4QueryOptions): Promise<Ga4Data> {
  const env = opts.env ?? process.env
  const checkedAt = opts.nowIso
  const config = loadGa4Config(env)

  if (!config) {
    const configured = hasGa4Credentials(env)
    return {
      status: {
        connector: 'google_analytics',
        state: 'NOT_CONFIGURED',
        configured,
        reason: configured
          ? 'GA4_PROPERTY_ID absent ou invalide.'
          : 'Credentials service-account GA4 absents.',
        checkedAt,
      },
      organic: null,
    }
  }

  const parsedNow = Date.parse(opts.nowIso)
  const nowMs = opts.nowMs ?? (Number.isFinite(parsedNow) ? parsedNow : Date.now())

  try {
    const { accessToken } = await getAccessToken(
      config.serviceAccount,
      [GA4_READONLY_SCOPE],
      { nowMs, fetchImpl: opts.fetchImpl },
    )
    const organic = await fetchOrganic(config.property, accessToken, opts)
    return {
      status: {
        connector: 'google_analytics',
        state: 'PASS',
        configured: true,
        property: config.property,
        checkedAt,
      },
      organic,
    }
  } catch (err) {
    return {
      status: {
        connector: 'google_analytics',
        state: 'ERROR',
        configured: true,
        property: config.property,
        reason: nonSensitiveReason(err),
        checkedAt,
      },
      organic: null,
    }
  }
}
