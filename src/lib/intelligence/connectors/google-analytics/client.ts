/**
 * CITADELLE INTELLIGENCE HUB — SEO · Connecteur GA4 · Client HTTP (SERVER-ONLY)
 *
 * Client typé minimal de la Google Analytics Data API (v1beta) `runReport`,
 * LECTURE SEULE. Le transport (`fetchImpl`) est injectable pour des tests
 * 100 % hors-ligne (aucun accès réseau). Aucune dépendance npm ajoutée.
 *
 * SÉCURITÉ : le bearer token n'est JAMAIS journalisé ; en cas d'erreur HTTP on
 * lève une raison non sensible (`ga4_http_<status>`), sans corps ni secret.
 */

import 'server-only'
import type { FetchImpl } from '../google-auth'

const GA4_DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

/* ------------------------------------------------------------------ */
/* Types de requête / réponse `runReport` (sous-ensemble utilisé)      */
/* ------------------------------------------------------------------ */

export interface Ga4DateRange {
  startDate: string
  endDate: string
  name?: string
}

export interface Ga4Dimension {
  name: string
}

export interface Ga4Metric {
  name: string
}

export interface Ga4RunReportRequest {
  dimensions: Ga4Dimension[]
  metrics: Ga4Metric[]
  dateRanges: Ga4DateRange[]
  dimensionFilter?: unknown
  limit?: number
  metricAggregations?: string[]
}

export interface Ga4HeaderName {
  name: string
}

export interface Ga4Value {
  value?: string
}

export interface Ga4ReportRow {
  dimensionValues?: Ga4Value[]
  metricValues?: Ga4Value[]
}

export interface Ga4RunReportResponse {
  dimensionHeaders?: Ga4HeaderName[]
  metricHeaders?: Ga4HeaderName[]
  rows?: Ga4ReportRow[]
  rowCount?: number
}

export interface Ga4ClientOptions {
  accessToken: string
  /** Forme canonique `properties/<numeric>`. */
  property: string
  fetchImpl?: FetchImpl
  /** Délai d'expiration réseau (ms). */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 12_000

/**
 * Exécute un `runReport` GA4 (lecture seule). Lève une erreur à raison non
 * sensible si le HTTP échoue ou si le JSON est illisible. L'appelant traduit en
 * statut ERROR/NOT_CONFIGURED — jamais en donnée fabriquée.
 */
export async function runReport(
  request: Ga4RunReportRequest,
  opts: Ga4ClientOptions,
): Promise<Ga4RunReportResponse> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const url = `${GA4_DATA_API_BASE}/${opts.property}:runReport`

  const controller = new AbortController()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Awaited<ReturnType<FetchImpl>>
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${opts.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    // Raison non sensible : uniquement le code HTTP, jamais le corps (peut
    // contenir des détails de credential/projet).
    throw new Error(`ga4_http_${res.status}`)
  }

  try {
    return (await res.json()) as Ga4RunReportResponse
  } catch {
    throw new Error('ga4_bad_json')
  }
}
