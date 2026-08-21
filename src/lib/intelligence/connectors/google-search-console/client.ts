/**
 * CITADELLE INTELLIGENCE HUB — SEO · Search Console · Client REST (SERVER-ONLY)
 *
 * Petit client typé LECTURE SEULE de l'API Search Console. Le transport `fetch`
 * est INJECTABLE (`fetchImpl`) pour des tests 100 % hors-ligne. Toutes les
 * erreurs réseau/HTTP sont traduites en messages NON sensibles (`gsc_http_<code>`)
 * — jamais de token, de credential ni de corps de réponse brut journalisé.
 *
 * Endpoints utilisés (tous read-only) :
 *  - GET  webmasters/v3/sites                                   (sites.list)
 *  - POST webmasters/v3/sites/{site}/searchAnalytics/query      (searchAnalytics.query)
 *  - POST searchconsole.googleapis.com/v1/urlInspection/index:inspect
 *  - GET  webmasters/v3/sites/{site}/sitemaps                   (sitemaps.list)
 */

import 'server-only'
import type { FetchImpl } from '../google-auth'
import type {
  RawSitesList,
  RawSite,
  RawSearchAnalyticsResponse,
  RawSearchAnalyticsRow,
  RawInspectionResponse,
  RawSitemapsList,
} from './normalize'

const WMX = 'https://www.googleapis.com/webmasters/v3'
const INSPECT_URL =
  'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

export interface GscClientOptions {
  accessToken: string
  fetchImpl?: FetchImpl
}

/** Erreur porteuse d'un code NON sensible (jamais de secret). */
export class GscHttpError extends Error {
  constructor(public readonly status: number) {
    super(`gsc_http_${status}`)
    this.name = 'GscHttpError'
  }
}

export interface SearchAnalyticsQuery {
  startDate: string
  endDate: string
  dimensions?: string[]
  rowLimit?: number
  /** Filtre optionnel sur l'hôte (propriété de domaine → borner à Citadelle). */
  pageHostFilter?: string
}

/**
 * Client Search Console read-only. Le token n'est JAMAIS renvoyé ni journalisé ;
 * il n'existe que le temps de la requête via l'en-tête Authorization.
 */
export class SearchConsoleClient {
  private readonly token: string
  private readonly fetchImpl: FetchImpl

  constructor(opts: GscClientOptions) {
    this.token = opts.accessToken
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  private authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = { authorization: `Bearer ${this.token}` }
    if (json) h['content-type'] = 'application/json'
    return h
  }

  private async getJson<T>(url: string): Promise<T> {
    const res = await this.fetchImpl(url, { method: 'GET', headers: this.authHeaders() })
    if (!res.ok) throw new GscHttpError(res.status)
    return (await res.json()) as T
  }

  private async postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new GscHttpError(res.status)
    return (await res.json()) as T
  }

  /** A. sites.list → propriétés accessibles. */
  async listSites(): Promise<RawSite[]> {
    const data = await this.getJson<RawSitesList>(`${WMX}/sites`)
    return data.siteEntry ?? []
  }

  /** B. searchAnalytics.query → lignes brutes (dimensions demandées). */
  async searchAnalytics(
    siteUrl: string,
    q: SearchAnalyticsQuery,
  ): Promise<RawSearchAnalyticsRow[]> {
    const body: Record<string, unknown> = {
      startDate: q.startDate,
      endDate: q.endDate,
      dimensions: q.dimensions ?? [],
      rowLimit: q.rowLimit ?? 1000,
      dataState: 'final',
    }
    if (q.pageHostFilter) {
      body.dimensionFilterGroups = [
        {
          groupType: 'and',
          filters: [
            { dimension: 'page', operator: 'contains', expression: q.pageHostFilter },
          ],
        },
      ]
    }
    const data = await this.postJson<RawSearchAnalyticsResponse>(
      `${WMX}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      body,
    )
    return data.rows ?? []
  }

  /** C. urlInspection.index.inspect → état d'index CONNU de Google pour une URL. */
  async inspectUrl(siteUrl: string, inspectionUrl: string): Promise<RawInspectionResponse> {
    return this.postJson<RawInspectionResponse>(INSPECT_URL, {
      inspectionUrl,
      siteUrl,
    })
  }

  /** D. sitemaps.list → sitemaps soumis (lecture seule). */
  async listSitemaps(siteUrl: string): Promise<RawSitemapsList> {
    return this.getJson<RawSitemapsList>(
      `${WMX}/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
    )
  }
}
