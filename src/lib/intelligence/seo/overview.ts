/**
 * CITADELLE INTELLIGENCE HUB — SEO · Cartes de synthèse (PUR)
 *
 * `buildSeoOverview` transforme les sorties normalisées des connecteurs Google
 * (Search Console + GA4) en cartes de VUE D'ENSEMBLE. Fonction PURE : aucune
 * I/O, entièrement testable, déterministe.
 *
 * Honnêteté absolue :
 *  - Une carte n'affiche une valeur RÉELLE (`availability:'real'`) que si le
 *    connecteur est en état `PASS` ET fournit la donnée. Sinon `availability:
 *    'unavailable'` avec `value:null` — JAMAIS un 0 déguisé en réel.
 *  - NO_DATA (5A) : quand le connecteur est CONNECTÉ (PASS) mais que la période
 *    ne renvoie aucun dénominateur (impressions = 0), la POSITION MOYENNE et le
 *    CTR n'ont pas de sens → `availability:'no_data'`, `value:null` (jamais
 *    0,0 / 0,00 %). Les clics/impressions à 0 restent RÉELS (la source prouve
 *    réellement 0). Un 0 réel n'est donc jamais confondu avec « aucune donnée ».
 *  - Fraîcheur : Search Console = `SEO_DELAYED` (« Différé (SEO) »), GA4 =
 *    `SYNCED`. Aucune donnée Google n'est présentée comme « temps réel ».
 *  - Le CTR reste en ratio 0..1 dans la donnée (le formatage % est côté UI).
 *  - La tendance/delta n'est calculée que si l'entrée fournit la fenêtre
 *    précédente ET que celle-ci est exploitable (prev ≠ 0). Sinon `trend:
 *    'unknown'`, pas de `delta`.
 */

import type {
  SearchConsoleData,
  Ga4Data,
  Ga4OrganicSummary,
  GscTotals,
  SeoOverviewCard,
  SeoTrend,
} from './types'

/** Seuil (ratio) en-deçà duquel une variation est considérée « stable ». */
const FLAT_THRESHOLD = 0.005 // ±0,5 %

export interface SeoOverviewInput {
  gsc: SearchConsoleData
  ga4: Ga4Data
  nowIso: string
  /** Totaux Search Console de la fenêtre PRÉCÉDENTE (comparaison), si disponibles. */
  prevTotals?: GscTotals | null
  /** Synthèse organique GA4 de la fenêtre PRÉCÉDENTE, si disponible. */
  prevOrganic?: Ga4OrganicSummary | null
}

/** Delta relatif signé (cur-prev)/prev, ou `undefined` si incalculable. */
function relDelta(cur: number, prev: number | undefined | null): number | undefined {
  if (prev === undefined || prev === null) return undefined
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return undefined
  return (cur - prev) / prev
}

/** Tendance à partir du delta (direction de la valeur, pas « bon/mauvais »). */
function trendFromDelta(delta: number | undefined): SeoTrend {
  if (delta === undefined) return 'unknown'
  if (delta > FLAT_THRESHOLD) return 'up'
  if (delta < -FLAT_THRESHOLD) return 'down'
  return 'flat'
}

export function buildSeoOverview(input: SeoOverviewInput): SeoOverviewCard[] {
  const gscReal = input.gsc.status.state === 'PASS' && input.gsc.totals !== null
  const t: GscTotals | null = gscReal ? input.gsc.totals : null
  const prev = input.prevTotals ?? null
  // 5A : « a un dénominateur » = connecté ET impressions réellement > 0.
  // Sans dénominateur, CTR et position moyenne sont NO_DATA (pas un 0 trompeur).
  const hasDenominator = gscReal && t !== null && t.impressions > 0

  /**
   * Fabrique une carte Search Console.
   * - `isDenominatorMetric` (CTR, position) : sans dénominateur → NO_DATA/null.
   * - sinon : réel (0 réel inclus) quand connecté, indisponible sinon.
   */
  const gscCard = (
    key: string,
    label: string,
    unit: SeoOverviewCard['unit'],
    curVal: number | undefined,
    prevVal: number | undefined,
    isDenominatorMetric = false,
  ): SeoOverviewCard => {
    if (!gscReal || curVal === undefined) {
      return {
        key,
        label,
        value: null,
        unit,
        availability: 'unavailable',
        source: 'google_search_console',
        freshness: 'SEO_DELAYED',
        trend: 'unknown',
      }
    }
    if (isDenominatorMetric && !hasDenominator) {
      // Connecté, mais aucune observation exploitable sur la période : NO_DATA.
      return {
        key,
        label,
        value: null,
        unit,
        availability: 'no_data',
        source: 'google_search_console',
        freshness: 'SEO_DELAYED',
        trend: 'unknown',
      }
    }
    const delta = relDelta(curVal, prevVal)
    const card: SeoOverviewCard = {
      key,
      label,
      value: curVal,
      unit,
      availability: 'real',
      source: 'google_search_console',
      freshness: 'SEO_DELAYED',
      trend: trendFromDelta(delta),
    }
    if (delta !== undefined) card.delta = delta
    return card
  }

  const cards: SeoOverviewCard[] = [
    gscCard('clicks', 'Clics Google', 'count', t?.clicks, prev?.clicks),
    gscCard('impressions', 'Impressions', 'count', t?.impressions, prev?.impressions),
    // CTR & position : métriques à DÉNOMINATEUR → NO_DATA si impressions = 0.
    gscCard('ctr', 'CTR', 'ratio', t?.ctr, prev?.ctr, true),
    // Position : valeur décimale (>=1). Plus BAS = meilleur (documenté côté UI).
    gscCard('position', 'Position moyenne', 'count', t?.position, prev?.position, true),
    gscCard('visible_pages', 'Pages visibles', 'count', t?.visiblePages, prev?.visiblePages),
    gscCard('active_queries', 'Requêtes actives', 'count', t?.activeQueries, prev?.activeQueries),
  ]

  // GA4 — trafic organique. Source distincte, fraîcheur SYNCED.
  const ga4Real = input.ga4.status.state === 'PASS' && input.ga4.organic !== null
  if (!ga4Real || !input.ga4.organic) {
    cards.push({
      key: 'ga4_organic',
      label: 'Trafic organique (GA4)',
      value: null,
      unit: 'count',
      availability: 'unavailable',
      source: 'google_analytics',
      freshness: 'SYNCED',
      trend: 'unknown',
    })
  } else {
    const sessions = input.ga4.organic.sessions
    const delta = relDelta(sessions, input.prevOrganic?.sessions)
    const card: SeoOverviewCard = {
      key: 'ga4_organic',
      label: 'Trafic organique (GA4)',
      value: sessions,
      unit: 'count',
      availability: 'real',
      source: 'google_analytics',
      freshness: 'SYNCED',
      trend: trendFromDelta(delta),
    }
    if (delta !== undefined) card.delta = delta
    cards.push(card)
  }

  return cards
}
