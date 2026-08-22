/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 (Conversions + Guide)
 * Contrats de domaine PURS pour les conversions, le tunnel (funnel) et
 * l'attribution par source.
 *
 * Règles absolues (runbook Doxa) :
 *  - JAMAIS de donnée inventée. Une source non prouvée reste `UNAVAILABLE`.
 *  - « 0 réel » n'est PAS « indisponible » : un compte réel de 0 reste REAL.
 *  - Aucun taux entre cohortes incompatibles : RATE=UNAVAILABLE + raison explicite.
 *  - Aucune PII : uniquement des comptes agrégés.
 */

import type { Freshness } from '../types/freshness'

/** Disponibilité d'une mesure de conversion. */
export type ConversionAvailability = 'REAL' | 'DEMO' | 'UNAVAILABLE'

/** Disponibilité d'un taux (jamais « DEMO » : un taux est réel ou indisponible). */
export type RateAvailability = 'REAL' | 'UNAVAILABLE'

/**
 * Unité de cohorte d'une étape : ce que le compte représente RÉELLEMENT.
 * Deux étapes ne sont comparables (taux calculable) que si elles partagent
 * exactement la même unité de cohorte — sinon le taux n'a aucun sens.
 */
export type CohortUnit =
  | 'pageviews' // pages vues (événements), PAS visiteurs uniques
  | 'new_persons' // personnes nouvellement inscrites (profiles créés)
  | 'plays' // écoutes (lectures), PAS auditeurs uniques
  | 'module_completions' // complétions de module (immuables)
  | 'composite' // agrégat hétérogène non sommable
  | 'unavailable' // aucune cohorte fiable

/** Sept catégories canoniques de conversion (parcours spirituel Citadelle). */
export type ConversionCategoryKey =
  | 'ACQUISITION'
  | 'ENGAGEMENT'
  | 'DISCIPULAT'
  | 'ACCOMPLISSEMENT'
  | 'COMMUNAUTE'
  | 'CONTACT'
  | 'GENEROSITE'

/** Une métrique de conversion : compte + provenance + fraîcheur + disponibilité. */
export interface ConversionCategory {
  key: ConversionCategoryKey
  label: string
  /** Clé du dictionnaire (pour InfoTip / guide). */
  metricKey: string
  /** Source humaine (table réelle), jamais un secret. */
  source: string
  /** Fenêtre couverte (ex. « Aujourd'hui (UTC) »). */
  period: string
  freshness: Freshness
  availability: ConversionAvailability
  /** Valeur réelle/démo ; null si UNAVAILABLE. */
  value: number | null
  /** Raison OBLIGATOIRE quand availability === 'UNAVAILABLE'. */
  reason?: string
}

/** Une étape du tunnel. */
export interface FunnelStage {
  key: string
  label: string
  metricKey: string
  value: number | null
  availability: ConversionAvailability
  cohort: CohortUnit
  source: string
  freshness: Freshness
  reason?: string
}

/** Un taux entre deux étapes consécutives (jamais entre cohortes incompatibles). */
export interface FunnelRate {
  fromKey: string
  toKey: string
  /** Ratio 0..1 quand calculable ; null sinon. */
  rate: number | null
  availability: RateAvailability
  /** Raison OBLIGATOIRE quand availability === 'UNAVAILABLE'. */
  reason?: string
}

export interface Funnel {
  stages: FunnelStage[]
  rates: FunnelRate[]
}

/** Une ligne d'attribution par source. */
export interface SourceAttributionRow {
  source: string
  label: string
  visits: number
  signups: number
  progressions: number
  /** Taux de conversion par source : ratio 0..1 ou null. */
  conversionRate: number | null
  conversionAvailability: RateAvailability
  conversionReason?: string
}

export interface SourceAttributionResult {
  availability: ConversionAvailability
  rows: SourceAttributionRow[]
  /** Conversions non rattachées à une source (transparence du partiel). */
  unattributed: { signups: number; progressions: number }
  internalVisitsExcluded: number
  /** Raison globale si UNAVAILABLE/DEMO. */
  reason?: string
}

/** Payload complet servi par /api/intelligence/conversions. */
export interface ConversionsPayload {
  generatedAt: string
  demoMode: boolean
  period: string
  funnel: Funnel
  categories: ConversionCategory[]
  sourceAttribution: SourceAttributionResult
  error?: string
}
