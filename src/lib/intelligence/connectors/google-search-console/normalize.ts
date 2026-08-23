/**
 * CITADELLE INTELLIGENCE HUB — SEO · Search Console · Normalisation (PURE)
 *
 * Fonctions 100 % pures (aucun I/O, aucun secret) : elles transforment les
 * réponses REST brutes de Search Console en contrats de domaine partagés, et
 * calculent la comparaison période / période précédente (tendance + delta).
 *
 * Règles :
 *  - `ctr` reste toujours 0..1 (jamais 0..100).
 *  - Aucune donnée inventée : ce qui n'est pas fourni reste absent/`unknown`.
 */

import type {
  GscQueryRow,
  GscPageRow,
  GscTotals,
  UrlInspectionResult,
  SitemapInfo,
  IndexVerdict,
  SeoTrend,
} from '../../seo/types'
import { classifyUrl, extractHost, type SeoScope } from '../../seo/scope'

/* ------------------------------------------------------------------ */
/* Vérité d'HÔTE & de PORTÉE (5A)                                      */
/* ------------------------------------------------------------------ */

/**
 * Ligne « page » enrichie de sa vérité d'hôte/portée (5A). La portée n'est
 * JAMAIS supposée « citadelle » depuis la propriété de domaine : elle est
 * classée depuis l'hôte réel de l'URL de la page. `host` = null si l'URL n'est
 * pas déterminable (ex. chemin relatif) → portée `external_or_unknown`.
 * Extension additive : reste assignable à `GscPageRow` (contrat gelé).
 */
export interface ScopedGscPageRow extends GscPageRow {
  host: string | null
  scope: SeoScope
}

/** Résultat d'inspection enrichi de la vérité d'hôte/portée (5A). Additif. */
export interface ScopedUrlInspectionResult extends UrlInspectionResult {
  host: string | null
  scope: SeoScope
}

/* ------------------------------------------------------------------ */
/* Types bruts (sous-ensemble utilisé) des réponses REST GSC           */
/* ------------------------------------------------------------------ */

export interface RawSite {
  siteUrl?: string
  permissionLevel?: string
}
export interface RawSitesList {
  siteEntry?: RawSite[]
}

export interface RawSearchAnalyticsRow {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}
export interface RawSearchAnalyticsResponse {
  rows?: RawSearchAnalyticsRow[]
}

export interface RawInspectionResponse {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string
      coverageState?: string
      robotsTxtState?: string
      indexingState?: string
      pageFetchState?: string
      lastCrawlTime?: string
      googleCanonical?: string
      userCanonical?: string
    }
    richResultsResult?: { verdict?: string }
  }
}

export interface RawSitemap {
  path?: string
  lastSubmitted?: string
  lastDownloaded?: string
  isPending?: boolean
  isSitemapsIndex?: boolean
  contents?: Array<{ type?: string }>
  errors?: string | number
  warnings?: string | number
}
export interface RawSitemapsList {
  sitemap?: RawSitemap[]
}

/* ------------------------------------------------------------------ */
/* Résolution de la propriété                                          */
/* ------------------------------------------------------------------ */

/** Vrai si l'identifiant est une propriété de domaine (`sc-domain:...`). */
export function isDomainProperty(siteUrl: string): boolean {
  return siteUrl.startsWith('sc-domain:')
}

/** Hôte porté par un identifiant de propriété (domaine ou URL). */
export function hostOfProperty(siteUrl: string): string {
  if (isDomainProperty(siteUrl)) return siteUrl.slice('sc-domain:'.length).toLowerCase()
  try {
    return new URL(siteUrl).host.toLowerCase()
  } catch {
    return siteUrl.toLowerCase()
  }
}

/** Niveaux de permission qui autorisent la lecture des données. */
function canRead(level: string | undefined): boolean {
  return level === 'siteOwner' || level === 'siteFullUser' || level === 'siteRestrictedUser'
}

/**
 * Résout la propriété exploitable parmi celles accessibles.
 *  1. Si `configured` est fourni ET accessible → on l'utilise.
 *  2. Sinon on cherche la meilleure correspondance pour l'hôte Citadelle :
 *     préférence à une URL-property exacte, puis une propriété de domaine
 *     couvrant l'hôte, puis toute propriété lisible dont l'hôte matche.
 * Renvoie null si rien d'exploitable (→ statut ERROR honnête, pas d'invention).
 */
export function resolveSiteUrl(
  sites: ReadonlyArray<RawSite>,
  configured: string | null,
  host: string,
): string | null {
  const readable = sites.filter((s) => s.siteUrl && canRead(s.permissionLevel))
  const urls = readable.map((s) => s.siteUrl as string)

  if (configured) {
    // Correspondance exacte tolérante au slash final.
    const norm = (u: string) => u.replace(/\/+$/, '')
    const hit = urls.find((u) => norm(u) === norm(configured))
    if (hit) return hit
    // Configuré mais non listé : on le tente quand même (permission peut différer).
    return configured
  }

  const h = host.toLowerCase()
  // URL-property exacte sur l'hôte Citadelle.
  const urlExact = urls.find((u) => !isDomainProperty(u) && hostOfProperty(u) === h)
  if (urlExact) return urlExact
  // Propriété de domaine couvrant l'hôte (h === domaine ou sous-domaine de domaine).
  const domainCover = urls.find((u) => {
    if (!isDomainProperty(u)) return false
    const d = hostOfProperty(u)
    return h === d || h.endsWith(`.${d}`)
  })
  if (domainCover) return domainCover
  // Repli : n'importe quelle propriété lisible dont l'hôte matche partiellement.
  const partial = urls.find((u) => hostOfProperty(u).includes(h) || h.includes(hostOfProperty(u)))
  return partial ?? urls[0] ?? null
}

/* ------------------------------------------------------------------ */
/* Totaux + normalisation des lignes                                   */
/* ------------------------------------------------------------------ */

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)
const num = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

/** Agrège une liste de lignes brutes en totaux honnêtes (ctr recalculé). */
export function toTotals(
  rows: ReadonlyArray<RawSearchAnalyticsRow>,
  activeQueries: number,
  visiblePages: number,
): GscTotals {
  let clicks = 0
  let impressions = 0
  let weightedPos = 0
  for (const r of rows) {
    const imp = num(r.impressions)
    clicks += num(r.clicks)
    impressions += imp
    // Position moyenne pondérée par les impressions (honnête vs simple moyenne).
    weightedPos += num(r.position) * imp
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clamp01(clicks / impressions) : 0,
    position: impressions > 0 ? weightedPos / impressions : 0,
    activeQueries,
    visiblePages,
  }
}

/** Extrait la valeur de dimension d'une ligne (position `keyIndex`). */
function keyAt(row: RawSearchAnalyticsRow, keyIndex: number): string | null {
  const v = row.keys?.[keyIndex]
  return typeof v === 'string' && v.length > 0 ? v : null
}

/* ------------------------------------------------------------------ */
/* Comparaison période / période précédente                            */
/* ------------------------------------------------------------------ */

const FLAT_THRESHOLD = 0.05

/**
 * Tendance + delta relatif à partir des clics courant / précédent.
 *  - `prev` absent → `new` (pas de base de comparaison, delta indéfini).
 *  - `prev === 0` et `cur > 0` → `up` (delta non calculable → indéfini).
 *  - sinon delta = (cur - prev) / prev, seuil ±5 % pour `flat`.
 */
export function computeTrend(
  cur: number,
  prev: number | undefined,
): { trend: SeoTrend; delta?: number } {
  if (prev === undefined) return { trend: 'new' }
  if (prev === 0) return cur > 0 ? { trend: 'up' } : { trend: 'flat' }
  const delta = (cur - prev) / prev
  if (Math.abs(delta) < FLAT_THRESHOLD) return { trend: 'flat', delta }
  return { trend: delta > 0 ? 'up' : 'down', delta }
}

/** Map clé de dimension → clics de la période précédente. */
function prevClicksIndex(
  prevRows: ReadonlyArray<RawSearchAnalyticsRow>,
): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of prevRows) {
    const k = keyAt(r, 0)
    if (k !== null) m.set(k, num(r.clicks))
  }
  return m
}

/**
 * Normalise les lignes « query » en `GscQueryRow[]` (triées clics desc, top N),
 * avec tendance calculée face à la période précédente.
 */
export function toQueryRows(
  cur: ReadonlyArray<RawSearchAnalyticsRow>,
  prev: ReadonlyArray<RawSearchAnalyticsRow>,
  topN: number,
): GscQueryRow[] {
  const prevMap = prevClicksIndex(prev)
  return cur
    .map((r) => ({ r, query: keyAt(r, 0) }))
    .filter((x): x is { r: RawSearchAnalyticsRow; query: string } => x.query !== null)
    .map(({ r, query }) => {
      const clicks = num(r.clicks)
      const { trend, delta } = computeTrend(clicks, prevMap.get(query))
      return {
        query,
        clicks,
        impressions: num(r.impressions),
        ctr: clamp01(num(r.ctr)),
        position: num(r.position),
        trend,
        ...(delta === undefined ? {} : { delta }),
      }
    })
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, topN)
}

/**
 * Normalise les lignes « page » en `GscPageRow[]` (triées clics desc, top N),
 * avec tendance calculée face à la période précédente.
 */
export function toPageRows(
  cur: ReadonlyArray<RawSearchAnalyticsRow>,
  prev: ReadonlyArray<RawSearchAnalyticsRow>,
  topN: number,
): ScopedGscPageRow[] {
  const prevMap = prevClicksIndex(prev)
  return cur
    .map((r) => ({ r, page: keyAt(r, 0) }))
    .filter((x): x is { r: RawSearchAnalyticsRow; page: string } => x.page !== null)
    .map(({ r, page }) => {
      const clicks = num(r.clicks)
      const { trend, delta } = computeTrend(clicks, prevMap.get(page))
      // 5A : portée classée depuis l'HÔTE RÉEL de la page (jamais depuis la
      // propriété de domaine) ; hôte inconnu ⇒ external_or_unknown.
      return {
        page,
        clicks,
        impressions: num(r.impressions),
        ctr: clamp01(num(r.ctr)),
        position: num(r.position),
        trend,
        host: extractHost(page),
        scope: classifyUrl(page),
        ...(delta === undefined ? {} : { delta }),
      }
    })
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, topN)
}

/** Nombre de lignes ayant réellement généré des impressions (borne basse honnête). */
export function countActive(rows: ReadonlyArray<RawSearchAnalyticsRow>): number {
  let n = 0
  for (const r of rows) if (num(r.impressions) > 0) n++
  return n
}

/* ------------------------------------------------------------------ */
/* URL Inspection                                                       */
/* ------------------------------------------------------------------ */

/** Traduit un verdict brut GSC en `IndexVerdict` du contrat. */
export function mapVerdict(raw: string | undefined): IndexVerdict {
  switch (raw) {
    case 'PASS':
      return 'PASS'
    case 'PARTIAL':
      return 'PARTIAL'
    case 'FAIL':
      return 'FAIL'
    case 'NEUTRAL':
      return 'NEUTRAL'
    default:
      return 'UNKNOWN'
  }
}

/** Normalise une réponse index:inspect en `UrlInspectionResult` scopé (5A). */
export function toInspection(url: string, raw: RawInspectionResponse): ScopedUrlInspectionResult {
  const idx = raw.inspectionResult?.indexStatusResult
  const rich = raw.inspectionResult?.richResultsResult
  // 5A : hôte/portée classés depuis l'URL inspectée (jamais depuis la propriété).
  const out: ScopedUrlInspectionResult = {
    url,
    verdict: mapVerdict(idx?.verdict),
    host: extractHost(url),
    scope: classifyUrl(url),
  }
  if (idx?.coverageState) out.coverageState = idx.coverageState
  if (idx?.robotsTxtState) out.robotsTxtState = idx.robotsTxtState
  if (idx?.indexingState) out.indexingState = idx.indexingState
  if (idx?.pageFetchState) out.pageFetchState = idx.pageFetchState
  if (idx?.lastCrawlTime) out.lastCrawlTime = idx.lastCrawlTime
  if (idx?.googleCanonical) out.googleCanonical = idx.googleCanonical
  if (idx?.userCanonical) out.userCanonical = idx.userCanonical
  if (rich?.verdict) out.richResultsVerdict = rich.verdict
  return out
}

/* ------------------------------------------------------------------ */
/* Sitemaps                                                             */
/* ------------------------------------------------------------------ */

const toCount = (v: string | number | undefined): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/** Normalise la liste des sitemaps (lecture seule). */
export function toSitemaps(raw: RawSitemapsList): SitemapInfo[] {
  const list = raw.sitemap ?? []
  return list
    .filter((s): s is RawSitemap & { path: string } => typeof s.path === 'string')
    .map((s) => {
      // 5A : portée classée depuis l'hôte RÉEL du sitemap. Le sitemap
      // institutionnel (chapelleduroyaume.org) reste `institutional` — jamais
      // rangé sous « citadelle ». Hôte non déterminable ⇒ external_or_unknown.
      const info: SitemapInfo = { path: s.path, scope: classifyUrl(s.path) }
      const host = extractHost(s.path)
      if (host) info.host = host
      if (s.lastSubmitted) info.lastSubmitted = s.lastSubmitted
      if (s.lastDownloaded) info.lastDownloaded = s.lastDownloaded
      if (typeof s.isPending === 'boolean') info.isPending = s.isPending
      if (typeof s.isSitemapsIndex === 'boolean') info.isSitemapsIndex = s.isSitemapsIndex
      const errors = toCount(s.errors)
      const warnings = toCount(s.warnings)
      if (errors !== undefined) info.errors = errors
      if (warnings !== undefined) info.warnings = warnings
      return info
    })
}
