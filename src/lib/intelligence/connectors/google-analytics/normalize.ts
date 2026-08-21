/**
 * CITADELLE INTELLIGENCE HUB — SEO · Connecteur GA4 · Normalisation (PUR)
 *
 * Construction de la requête `runReport` (filtrée Organic Search) et
 * normalisation de la réponse vers `Ga4OrganicSummary`. AUCUN I/O, aucun secret :
 * ce module est pur et testable hors-ligne.
 *
 * Robustesse : les métriques sont lues PAR NOM d'en-tête (jamais par position),
 * afin de dégrader proprement si une métrique (ex. `conversions`) est absente
 * de la réponse — on ne fait jamais échouer tout le rapport pour autant.
 */

import type { Ga4OrganicRow, Ga4OrganicSummary } from '../../seo/types'
import type {
  Ga4RunReportRequest,
  Ga4RunReportResponse,
} from './client'

/* ------------------------------------------------------------------ */
/* Dimensions / métriques GA4 utilisées                                */
/* ------------------------------------------------------------------ */

/** Page d'atterrissage (+ query string) : dimension de granularité SEO. */
export const ORGANIC_DIMENSION = 'landingPagePlusQueryString'
/** Canal par défaut de session — sert au filtre « Organic Search ». */
export const CHANNEL_DIMENSION = 'sessionDefaultChannelGroup'
/** Valeur canonique GA4 du trafic de recherche organique. */
export const ORGANIC_CHANNEL_VALUE = 'Organic Search'

/** Métriques toujours demandées (stables dans l'API Data v1beta). */
export const CORE_METRICS = [
  'sessions',
  'totalUsers',
  'engagedSessions',
  'engagementRate',
] as const

/** Métrique best-effort : peut manquer selon la config du compte. */
export const CONVERSION_METRIC = 'conversions'

export interface BuildRequestOptions {
  /** Inclure la métrique `conversions` (best-effort ; désactivable au retry). */
  includeConversions?: boolean
  /** Nombre max de pages d'atterrissage renvoyées. */
  limit?: number
}

/**
 * Construit une requête `runReport` filtrée sur le trafic Organic Search pour une
 * fenêtre `[from, to]` (dates YYYY-MM-DD). Lecture seule.
 */
export function buildOrganicRequest(
  range: { from: string; to: string },
  opts: BuildRequestOptions = {},
): Ga4RunReportRequest {
  const metrics = [
    ...CORE_METRICS.map((name) => ({ name })),
    ...(opts.includeConversions === false ? [] : [{ name: CONVERSION_METRIC }]),
  ]
  return {
    dimensions: [{ name: ORGANIC_DIMENSION }],
    metrics,
    dateRanges: [{ startDate: range.from, endDate: range.to }],
    dimensionFilter: {
      filter: {
        fieldName: CHANNEL_DIMENSION,
        stringFilter: { matchType: 'EXACT', value: ORGANIC_CHANNEL_VALUE },
      },
    },
    limit: opts.limit ?? 50,
  }
}

/* ------------------------------------------------------------------ */
/* Parsing tolérant                                                    */
/* ------------------------------------------------------------------ */

function parseNumber(raw: string | undefined): number {
  if (raw == null || raw === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

/** Borne un taux d'engagement dans [0, 1] (défensif). */
function clampRate(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/** Indexe les en-têtes de métriques par nom (position-indépendant). */
function metricIndexByName(resp: Ga4RunReportResponse): Map<string, number> {
  const map = new Map<string, number>()
  const headers = resp.metricHeaders ?? []
  headers.forEach((h, i) => {
    if (h && typeof h.name === 'string') map.set(h.name, i)
  })
  return map
}

function readMetric(
  values: { value?: string }[] | undefined,
  index: Map<string, number>,
  name: string,
): number | undefined {
  const i = index.get(name)
  if (i == null) return undefined
  return parseNumber(values?.[i]?.value)
}

/**
 * Normalise une réponse `runReport` (une fenêtre) en `Ga4OrganicSummary`.
 * - Les lignes sont triées par sessions décroissantes.
 * - Les totaux sont sommés depuis les lignes (aucune valeur inventée).
 * - `conversions` vaut 0 si la métrique est absente (dégradation propre).
 */
export function normalizeReport(resp: Ga4RunReportResponse): Ga4OrganicSummary {
  const index = metricIndexByName(resp)
  const hasConversions = index.has(CONVERSION_METRIC)
  const rows = resp.rows ?? []

  const landingPages: Ga4OrganicRow[] = []
  let sessions = 0
  let users = 0
  let engagedSessions = 0
  let conversions = 0

  for (const row of rows) {
    const dimension = row.dimensionValues?.[0]?.value ?? '(not set)'
    const mv = row.metricValues

    const rowSessions = readMetric(mv, index, 'sessions') ?? 0
    const rowUsers = readMetric(mv, index, 'totalUsers') ?? 0
    const rowEngaged = readMetric(mv, index, 'engagedSessions')
    const rowRate = readMetric(mv, index, 'engagementRate')
    const rowConv = hasConversions
      ? readMetric(mv, index, CONVERSION_METRIC)
      : undefined

    const entry: Ga4OrganicRow = {
      dimension,
      sessions: rowSessions,
      users: rowUsers,
    }
    if (rowEngaged != null) entry.engagedSessions = rowEngaged
    if (rowRate != null) entry.engagementRate = clampRate(rowRate)
    if (rowConv != null) entry.conversions = rowConv
    landingPages.push(entry)

    sessions += rowSessions
    users += rowUsers
    engagedSessions += rowEngaged ?? 0
    conversions += rowConv ?? 0
  }

  landingPages.sort((a, b) => b.sessions - a.sessions)

  return {
    sessions,
    users,
    engagedSessions,
    conversions,
    landingPages,
  }
}
