/**
 * CITADELLE INTELLIGENCE HUB — SEO
 * Contrats de domaine PARTAGÉS pour le hub SEO / Google Intelligence.
 *
 * Ce fichier est le SEUL point de couplage entre les quatre chantiers SEO
 * (technique on-page, connecteur Search Console, connecteur GA4, cockpit UX).
 * Chaque chantier n'importe QUE ce contrat ; il n'édite jamais les fichiers d'un
 * autre chantier. Tout est pur (aucun I/O, aucun secret) et sérialisable.
 *
 * Règles absolues (cf. runbook Doxa) :
 *  - JAMAIS de donnée inventée. Une source non configurée reste `NOT_CONFIGURED`.
 *  - Une donnée Search Console est toujours `SEO_DELAYED` (jamais « temps réel »).
 *  - Aucun secret, aucun token, aucune PII brute ne transite par ce contrat.
 */

import type { Freshness } from '../types/freshness'
import type { MetricSource, MetricUnit } from '../types/metrics'
import type { SeoScope } from './scope'

/* ------------------------------------------------------------------ */
/* Statut de connecteur (honnêteté des connexions réelles)            */
/* ------------------------------------------------------------------ */

/** État d'un connecteur Google vis-à-vis d'une connexion réelle. */
export type SeoConnectorState = 'PASS' | 'NOT_CONFIGURED' | 'ERROR'

/**
 * Statut public (non sensible) d'un connecteur. Ne contient JAMAIS de secret :
 * `property` est un identifiant public (siteUrl GSC / property id GA4), `reason`
 * est un message humain sans jeton ni credential.
 */
export interface SeoConnectorStatus {
  connector: 'google_search_console' | 'google_analytics'
  state: SeoConnectorState
  /** Des credentials sont présents côté serveur (jamais leur contenu). */
  configured: boolean
  /** Message humain non sensible (ex. « credentials absents », « 403 access »). */
  reason?: string
  /** Propriété/site réellement résolu (public), ex. `sc-domain:example.org`. */
  property?: string
  /** Instant de vérification (ISO 8601). */
  checkedAt: string
}

/* ------------------------------------------------------------------ */
/* Périodes                                                            */
/* ------------------------------------------------------------------ */

export type SeoPeriodKey = '7d' | '28d' | '90d'

/** Fenêtre courante + fenêtre précédente (comparaison), bornes ISO (date only). */
export interface SeoPeriod {
  key: SeoPeriodKey
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

/* ------------------------------------------------------------------ */
/* Tendance                                                            */
/* ------------------------------------------------------------------ */

export type SeoTrend = 'up' | 'down' | 'flat' | 'new' | 'unknown'

export interface WithTrend {
  trend?: SeoTrend
  /** Delta relatif période/période précédente (ratio signé), quand calculable. */
  delta?: number
}

/* ------------------------------------------------------------------ */
/* Search Console — Search Analytics                                   */
/* ------------------------------------------------------------------ */

export type GscDimension = 'date' | 'query' | 'page' | 'country' | 'device'

/** Ligne brute normalisée de searchAnalytics.query. */
export interface GscRow {
  /** Valeurs des dimensions demandées (ex. { query: '…', page: '…' }). */
  keys: Readonly<Partial<Record<GscDimension, string>>>
  clicks: number
  impressions: number
  /** Taux de clic 0..1 (jamais 0..100 ici). */
  ctr: number
  /** Position moyenne (>= 1). */
  position: number
}

export interface GscQueryRow extends WithTrend {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscPageRow extends WithTrend {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/** Totaux agrégés d'une fenêtre GSC. */
export interface GscTotals {
  clicks: number
  impressions: number
  ctr: number
  position: number
  /** Nombre de requêtes distinctes ayant généré des impressions. */
  activeQueries: number
  /** Nombre de pages distinctes visibles. */
  visiblePages: number
}

/* ------------------------------------------------------------------ */
/* Search Console — URL Inspection                                     */
/* ------------------------------------------------------------------ */

export type IndexVerdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'UNKNOWN'

/** Synthèse de l'état d'indexation connu de Google pour une URL. */
export interface UrlInspectionResult {
  url: string
  verdict: IndexVerdict
  /** ex. « Submitted and indexed », « Crawled - currently not indexed ». */
  coverageState?: string
  robotsTxtState?: string
  indexingState?: string
  pageFetchState?: string
  lastCrawlTime?: string
  /** Canonique choisie par Google. */
  googleCanonical?: string
  /** Canonique déclarée par la page. */
  userCanonical?: string
  richResultsVerdict?: string
}

/* ------------------------------------------------------------------ */
/* Search Console — Sitemaps                                           */
/* ------------------------------------------------------------------ */

export interface SitemapInfo {
  path: string
  lastSubmitted?: string
  lastDownloaded?: string
  isPending?: boolean
  isSitemapsIndex?: boolean
  errors?: number
  warnings?: number
  /** Hôte du sitemap (5A) — ex. citadelle.chapelleduroyaume.org vs chapelleduroyaume.org. */
  host?: string
  /** Portée classée (5A) — citadelle | institutional | global | external_or_unknown. */
  scope?: SeoScope
}

/* ------------------------------------------------------------------ */
/* GA4 — performance organique                                         */
/* ------------------------------------------------------------------ */

export interface Ga4OrganicRow {
  /** Dimension (landing page ou canal), publique et non identifiante. */
  dimension: string
  sessions: number
  users: number
  engagedSessions?: number
  /** Taux d'engagement 0..1. */
  engagementRate?: number
  conversions?: number
}

export interface Ga4OrganicSummary {
  sessions: number
  users: number
  engagedSessions: number
  conversions: number
  landingPages: ReadonlyArray<Ga4OrganicRow>
}

/* ------------------------------------------------------------------ */
/* Audit technique on-page (chantier 1)                                */
/* ------------------------------------------------------------------ */

export type SeoSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type SeoCheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'NA'
export type RobotsPosture = 'ALLOW' | 'DISALLOW' | 'NOINDEX'

/** Une ligne de la TECHNICAL_SEO_MATRIX. */
export interface SeoRouteAudit {
  route: string
  indexable: boolean
  title: SeoCheckStatus
  description: SeoCheckStatus
  canonical: SeoCheckStatus
  structuredData: SeoCheckStatus
  inSitemap: boolean
  robots: RobotsPosture
  issues: ReadonlyArray<string>
  severity: SeoSeverity
  action?: string
}

export interface TechnicalSeoMatrix {
  generatedAt: string
  routes: ReadonlyArray<SeoRouteAudit>
  summary: {
    total: number
    indexable: number
    withIssues: number
    critical: number
    high: number
  }
  checks: {
    metadata: SeoCheckStatus
    canonicals: SeoCheckStatus
    robots: SeoCheckStatus
    sitemap: SeoCheckStatus
    jsonLd: SeoCheckStatus
    privateRoutesNoindex: SeoCheckStatus
  }
}

/* ------------------------------------------------------------------ */
/* Opportunités (déterministes — chantier 4)                           */
/* ------------------------------------------------------------------ */

export type SeoOpportunityKind =
  | 'HIGH_IMPRESSIONS_LOW_CTR'
  | 'POSITION_4_TO_15'
  | 'DECLINING_PAGE'
  | 'RISING_QUERY'
  | 'UNINDEXED_IMPORTANT_PAGE'
  | 'CANONICAL_MISMATCH'
  | 'SITEMAP_ISSUE'
  | 'MISSING_METADATA'
  | 'MISSING_STRUCTURED_DATA'

/**
 * Opportunité SEO déterministe. Aucune boîte noire : chaque item explicite
 * POURQUOI (`why`), la PREUVE chiffrée (`evidence`) et l'ACTION (`action`).
 */
export interface SeoOpportunity {
  kind: SeoOpportunityKind
  severity: SeoSeverity
  /** Sujet concret : une requête, une page ou une route. (contrat: WHAT) */
  subject: string
  /** Source réelle ayant détecté le fait (ex. 'google_search_console'). */
  source?: string
  /** Hôte concerné le cas échéant (ex. chapelleduroyaume.org). */
  host?: string
  /** Portée : citadelle | institutional | global | external_or_unknown. */
  scope?: SeoScope
  /** Ce que la preuve suggère raisonnablement. (contrat: INTERPRETATION) */
  why: string
  /** Fait mesurable chiffré qui soutient. (contrat: EVIDENCE) */
  evidence: string
  /** Ce qui peut être investigué/fait. (contrat: ACTION) */
  action: string
}

/* ------------------------------------------------------------------ */
/* Cartes de synthèse + payload agrégé (chantier 4)                    */
/* ------------------------------------------------------------------ */

// 5A : vocabulaire enrichi — no_data (connecté sans observation) et not_applicable
// (métrique sans sens ici) sont distincts d'un 0 réel et d'« indisponible ».
export type SeoAvailability = 'real' | 'no_data' | 'unavailable' | 'not_applicable' | 'demo'

export interface SeoOverviewCard {
  key: string
  label: string
  value: number | null
  unit: MetricUnit
  availability: SeoAvailability
  source: MetricSource
  freshness: Freshness
  trend?: SeoTrend
  delta?: number
}

/* ------------------------------------------------------------------ */
/* Résultats composites de connecteurs (seams d'intégration)           */
/* ------------------------------------------------------------------ */

/** Sortie normalisée du connecteur Search Console (chantier 2). */
export interface SearchConsoleData {
  status: SeoConnectorStatus
  totals: GscTotals | null
  queries: ReadonlyArray<GscQueryRow>
  pages: ReadonlyArray<GscPageRow>
  indexation: ReadonlyArray<UrlInspectionResult>
  sitemaps: ReadonlyArray<SitemapInfo>
}

/** Sortie normalisée du connecteur GA4 organique (chantier 3). */
export interface Ga4Data {
  status: SeoConnectorStatus
  organic: Ga4OrganicSummary | null
}

/** Payload agrégé complet servi par /api/intelligence/seo (admin-only). */
export interface SeoIntelligencePayload {
  generatedAt: string
  period: SeoPeriod
  gsc: SeoConnectorStatus
  ga4: SeoConnectorStatus
  overview: ReadonlyArray<SeoOverviewCard>
  queries: ReadonlyArray<GscQueryRow>
  pages: ReadonlyArray<GscPageRow>
  indexation: ReadonlyArray<UrlInspectionResult>
  sitemaps: ReadonlyArray<SitemapInfo>
  technical: TechnicalSeoMatrix | null
  organic: Ga4OrganicSummary | null
  opportunities: ReadonlyArray<SeoOpportunity>
}
