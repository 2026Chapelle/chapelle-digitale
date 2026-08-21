/**
 * CITADELLE INTELLIGENCE HUB — SEO · Connecteur Google Search Console (SERVER-ONLY)
 *
 * Connecteur RÉEL lecture seule : auth service-account (JWT RS256 → OAuth2), puis
 * appels REST Search Console (sites.list, searchAnalytics.query, urlInspection,
 * sitemaps.list), normalisés vers le contrat partagé `SearchConsoleData`.
 *
 * Honnêteté (règle Doxa) :
 *  - credentials absents → statut NOT_CONFIGURED (état de première classe, PAS une erreur) ;
 *  - erreur réseau/HTTP → statut ERROR avec raison NON sensible (`gsc_http_403`…),
 *    données partielles autorisées ; JAMAIS de nombre inventé ;
 *  - toute métrique GSC est `SEO_DELAYED` (jamais « temps réel »).
 *
 * SÉCURITÉ : `import 'server-only'`, aucun secret/token journalisé ni renvoyé,
 * aucun `NEXT_PUBLIC`. Accès Google strictement `webmasters.readonly`.
 */

import 'server-only'
import type {
  SeoPeriod,
  SearchConsoleData,
  SeoConnectorStatus,
  UrlInspectionResult,
  SitemapInfo,
} from '../../seo/types'
import { getAccessToken, type FetchImpl } from '../google-auth'
import { primaryRoutes, absoluteUrl, PUBLIC_BASE_URL } from '../../seo/important-routes'
import { cached } from '../../../cache'
import {
  loadGscServiceAccount,
  configuredSiteUrl,
  citadelleHost,
  GSC_READONLY_SCOPE,
  type EnvLike,
} from './config'
import { SearchConsoleClient, GscHttpError } from './client'
import {
  resolveSiteUrl,
  isDomainProperty,
  toTotals,
  toQueryRows,
  toPageRows,
  countActive,
  toInspection,
  toSitemaps,
  type RawSearchAnalyticsRow,
} from './normalize'

/** Options d'appel. `fetchImpl`/`env` sont des points d'injection de TEST
 *  (jamais fournis en production) ; la signature publique reste stable. */
export interface SearchConsoleQueryOptions {
  period: SeoPeriod
  nowIso: string
  /** Transport réseau injectable pour tests hors-ligne (défaut : fetch global). */
  fetchImpl?: FetchImpl
  /** Environnement injectable pour tests (défaut : process.env). */
  env?: EnvLike
}

/** Nombre de lignes récupérées pour le comptage + top affiché. */
const ANALYTICS_ROW_LIMIT = 100
const TOP_ROWS = 25
/** Bornage strict de l'URL Inspection (quota) : pages piliers uniquement, ≤ 8. */
const MAX_INSPECTIONS = 8
/** Cache court : données GSC déjà différées de J-2/J-3, TTL 10 min suffit. */
const CACHE_TTL_MS = 10 * 60 * 1000

function notConfigured(nowIso: string, reason: string): SearchConsoleData {
  return {
    status: {
      connector: 'google_search_console',
      state: 'NOT_CONFIGURED',
      configured: false,
      reason,
      checkedAt: nowIso,
    },
    totals: null,
    queries: [],
    pages: [],
    indexation: [],
    sitemaps: [],
  }
}

function errored(
  nowIso: string,
  reason: string,
  property: string | undefined,
  partial: Partial<Omit<SearchConsoleData, 'status'>> = {},
): SearchConsoleData {
  const status: SeoConnectorStatus = {
    connector: 'google_search_console',
    state: 'ERROR',
    configured: true,
    reason,
    checkedAt: nowIso,
  }
  if (property) status.property = property
  return {
    status,
    totals: partial.totals ?? null,
    queries: partial.queries ?? [],
    pages: partial.pages ?? [],
    indexation: partial.indexation ?? [],
    sitemaps: partial.sitemaps ?? [],
  }
}

/** Raison non sensible extraite d'une erreur (jamais de secret). */
function reasonOf(err: unknown): string {
  if (err instanceof GscHttpError) return err.message // `gsc_http_<code>`
  if (err instanceof Error && /^[a-z0-9_]+$/i.test(err.message)) return err.message
  return 'gsc_request_failed'
}

/** Cœur de l'appel réel (sans cache) — isolé pour testabilité. */
async function runSearchConsole(opts: SearchConsoleQueryOptions): Promise<SearchConsoleData> {
  const env = opts.env ?? process.env
  const nowIso = opts.nowIso
  const nowMs = Number.isFinite(Date.parse(nowIso)) ? Date.parse(nowIso) : Date.now()

  const sa = loadGscServiceAccount(env)
  if (!sa) {
    return notConfigured(
      nowIso,
      'Credentials Search Console absents (GSC_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT_JSON).',
    )
  }

  let property: string | undefined
  try {
    // 1) Auth service-account → access token read-only.
    const { accessToken } = await getAccessToken(sa, [GSC_READONLY_SCOPE], {
      nowMs,
      fetchImpl: opts.fetchImpl,
    })
    const client = new SearchConsoleClient({ accessToken, fetchImpl: opts.fetchImpl })

    // 2) A. Résolution de la propriété (discovery, jamais supposée).
    const sites = await client.listSites()
    const host = citadelleHost()
    const resolved = resolveSiteUrl(sites, configuredSiteUrl(env), host)
    if (!resolved) {
      return errored(nowIso, 'gsc_no_accessible_property', undefined)
    }
    property = resolved
    // Propriété de domaine → borner l'analytics à l'hôte Citadelle.
    const hostFilter = isDomainProperty(resolved) ? host : undefined

    // 3) B. searchAnalytics : totaux + top requêtes + top pages, période courante ET précédente.
    const period: SeoPeriod = opts.period
    const [curQueries, prevQueries, curPages, prevPages] = await Promise.all([
      client.searchAnalytics(resolved, {
        startDate: period.from,
        endDate: period.to,
        dimensions: ['query'],
        rowLimit: ANALYTICS_ROW_LIMIT,
        pageHostFilter: hostFilter,
      }),
      client.searchAnalytics(resolved, {
        startDate: period.prevFrom,
        endDate: period.prevTo,
        dimensions: ['query'],
        rowLimit: ANALYTICS_ROW_LIMIT,
        pageHostFilter: hostFilter,
      }),
      client.searchAnalytics(resolved, {
        startDate: period.from,
        endDate: period.to,
        dimensions: ['page'],
        rowLimit: ANALYTICS_ROW_LIMIT,
        pageHostFilter: hostFilter,
      }),
      client.searchAnalytics(resolved, {
        startDate: period.prevFrom,
        endDate: period.prevTo,
        dimensions: ['page'],
        rowLimit: ANALYTICS_ROW_LIMIT,
        pageHostFilter: hostFilter,
      }),
    ])

    const queries = toQueryRows(curQueries, prevQueries, TOP_ROWS)
    const pages = toPageRows(curPages, prevPages, TOP_ROWS)
    // Totaux calculés depuis les pages (somme = trafic total de la propriété/hôte),
    // avec comptages distincts honnêtes (bornés par ANALYTICS_ROW_LIMIT).
    const totals = toTotals(
      curPages as ReadonlyArray<RawSearchAnalyticsRow>,
      countActive(curQueries),
      countActive(curPages),
    )

    // 4) C. URL Inspection — best-effort, borné aux pages piliers (≤ 8).
    const indexation = await inspectPrimary(client, resolved)

    // 5) D. sitemaps.list — best-effort, lecture seule.
    const sitemaps = await listSitemapsSafe(client, resolved)

    const status: SeoConnectorStatus = {
      connector: 'google_search_console',
      state: 'PASS',
      configured: true,
      property: resolved,
      checkedAt: nowIso,
    }
    return { status, totals, queries, pages, indexation, sitemaps }
  } catch (err) {
    // Échec d'un appel critique (auth / sites.list / searchAnalytics) → ERROR honnête.
    return errored(nowIso, reasonOf(err), property)
  }
}

/** URL Inspection bornée aux routes piliers ; échecs individuels ignorés (partiel OK). */
async function inspectPrimary(
  client: SearchConsoleClient,
  siteUrl: string,
): Promise<UrlInspectionResult[]> {
  const urls = primaryRoutes()
    .slice(0, MAX_INSPECTIONS)
    .map((r) => absoluteUrl(r.path, PUBLIC_BASE_URL))
  const settled = await Promise.allSettled(
    urls.map(async (u) => toInspection(u, await client.inspectUrl(siteUrl, u))),
  )
  const out: UrlInspectionResult[] = []
  for (const s of settled) if (s.status === 'fulfilled') out.push(s.value)
  return out
}

/** sitemaps.list best-effort ; en cas d'échec on renvoie [] (jamais d'invention). */
async function listSitemapsSafe(
  client: SearchConsoleClient,
  siteUrl: string,
): Promise<SitemapInfo[]> {
  try {
    return toSitemaps(await client.listSitemaps(siteUrl))
  } catch {
    return []
  }
}

/**
 * Renvoie les données Search Console normalisées (lecture seule). Signature stable
 * pour l'agrégateur du cockpit. En production `fetchImpl`/`env` ne sont pas fournis :
 * un cache court mutualise les rechargements rapprochés. En test (fetchImpl injecté)
 * le cache est court-circuité pour rester déterministe.
 */
export async function getSearchConsoleSeo(
  opts: SearchConsoleQueryOptions,
): Promise<SearchConsoleData> {
  // Injection de test → pas de cache (déterminisme, isolation entre cas).
  if (opts.fetchImpl || opts.env) return runSearchConsole(opts)
  const key = `seo:gsc:${opts.period.key}:${opts.period.to}`
  return cached(key, CACHE_TTL_MS, () => runSearchConsole(opts))
}
