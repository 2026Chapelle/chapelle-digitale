/**
 * CITADELLE INTELLIGENCE — 5B · CONTRAT GELÉ de la COUCHE DÉCISION.
 *
 * Ce module transforme le hub 5A (tableau de bord VÉRIDIQUE) en une SURFACE DE
 * DÉCISION véridique. Il est GELÉ EN PREMIER par le superviseur : tous les agents
 * 5B (funnel, signaux, canaux, UX) développent EN PARALLÈLE contre ces types.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VOCABULAIRE 5A PRÉSERVÉ (aucune régression) :
 *   SCOPE        : citadelle | institutional | global | external_or_unknown
 *   AVAILABILITY : REAL | NO_DATA | UNAVAILABLE | NOT_APPLICABLE
 *
 * RÈGLES CARDINALES (héritées de 5A, non négociables) :
 *   REAL_ZERO   != NO_DATA          (un 0 réel reste REAL)
 *   REAL_ZERO   != UNAVAILABLE
 *   NO_DATA     != ZERO             (source connectée mais rien sur la période)
 *   UNAVAILABLE != ZERO             (instrumentation absente : on ne peut pas savoir)
 *   Un TAUX n'existe que si NUMÉRATEUR=REAL ET DÉNOMINATEUR=REAL ET DÉNOMINATEUR>0
 *   ET cohortes comparables. Sinon RATE=UNAVAILABLE/NO_DATA — jamais « 0 % ».
 *
 * INTERDICTIONS (Evidence First) :
 *   - fabriquer une causalité, une attribution, ou convertir NO_DATA → 0 ;
 *   - classer des canaux sur des données non comparables ;
 *   - présenter une métrique de PLATEFORME comme un résultat CITADELLE ;
 *   - générer un sujet éditorial/spirituel (→ 6A), un objectif mensuel (→ 5C),
 *     une détection d'anomalie (→ 5C), une synthèse par LLM (hors périmètre).
 *   - exposer une PII / un signal individuel (agrégat uniquement).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Freshness } from '../types/freshness'
import type { SeoScope } from '../seo/scope'
import type { CohortUnit } from '../conversions/types'

/* ══════════════════════════════════════════════════════════════════════════
 * 1) SCOPE & DISPONIBILITÉ (réexport canonique — source de vérité 5B)
 * ════════════════════════════════════════════════════════════════════════ */

/** Portée d'une donnée de décision. Identique au vocabulaire SCOPE 5A. */
export type DecisionScope = SeoScope
export { CohortUnit }

/**
 * Disponibilité canonique de la Couche Décision (MAJUSCULES).
 * - REAL           : la source établit une valeur réelle (0 réel inclus).
 * - NO_DATA        : source CONNECTÉE mais aucune observation sur la période (≠ 0).
 * - PARTIAL        : mesurable mais incomplète (ex. conversions partiellement
 *                    attribuées) — une valeur peut exister mais est sous-estimée.
 * - UNAVAILABLE    : instrumentation/connexion absente — on ne peut pas savoir.
 * - NOT_APPLICABLE : la métrique n'a pas de sens dans ce contexte.
 */
export type DecisionAvailability =
  | 'REAL'
  | 'NO_DATA'
  | 'PARTIAL'
  | 'UNAVAILABLE'
  | 'NOT_APPLICABLE'

export const DECISION_AVAILABILITIES: ReadonlyArray<DecisionAvailability> = [
  'REAL',
  'NO_DATA',
  'PARTIAL',
  'UNAVAILABLE',
  'NOT_APPLICABLE',
]

/** Un nombre réel (0 inclus) est-il affichable pour cette disponibilité ? */
export function decisionRendersNumber(a: DecisionAvailability): boolean {
  return a === 'REAL'
}

/** Placeholder canonique quand aucune valeur réelle n'est affichable. */
export const DECISION_NO_VALUE = '—'

/** Libellés FR courts (badges) par disponibilité. */
export const DECISION_AVAILABILITY_LABEL_FR: Record<DecisionAvailability, string> = {
  REAL: 'Réel',
  NO_DATA: 'Aucune donnée',
  PARTIAL: 'Partiel',
  UNAVAILABLE: 'Indisponible',
  NOT_APPLICABLE: 'Non applicable',
}

/** Couleur indicative (charte cockpit) par disponibilité. */
export const DECISION_AVAILABILITY_COLOR: Record<DecisionAvailability, string> = {
  REAL: '#4ade80',
  NO_DATA: '#9ca3af',
  PARTIAL: '#fbbf24',
  UNAVAILABLE: '#9ca3af',
  NOT_APPLICABLE: '#9ca3af',
}

/** Libellés FR des portées (aligné 5A). */
export const DECISION_SCOPE_LABEL_FR: Record<DecisionScope, string> = {
  citadelle: 'Citadelle',
  institutional: 'La Chapelle — site institutionnel',
  global: 'Domaine global',
  external_or_unknown: 'Externe / inconnu',
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2) FENÊTRE / PÉRIODE  — toute affirmation porte une période explicite
 * ════════════════════════════════════════════════════════════════════════ */

export interface DecisionPeriod {
  /** Libellé humain FR (ex. « Aujourd'hui (UTC) », « 28 derniers jours »). */
  label: string
  /** Début inclus (ISO 8601) si borné, sinon null. */
  sinceIso: string | null
  /** Fin exclue / instant de capture (ISO 8601). */
  untilIso: string
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3) VALEUR MESURÉE — toujours accompagnée de sa disponibilité
 * ════════════════════════════════════════════════════════════════════════ */

/** Une valeur mesurée honnête : nombre seulement si REAL, sinon null + raison. */
export interface MeasuredValue {
  value: number | null
  availability: DecisionAvailability
  /** OBLIGATOIRE quand availability ∈ {NO_DATA, PARTIAL, UNAVAILABLE, NOT_APPLICABLE}. */
  reason?: string
}

/** Un taux honnête : ratio 0..1 seulement si calculable, sinon null + raison. */
export interface MeasuredRate {
  rate: number | null
  availability: DecisionAvailability // REAL | NO_DATA | UNAVAILABLE | NOT_APPLICABLE
  /** OBLIGATOIRE quand rate === null. */
  reason?: string
  /** Taille de l'échantillon (dénominateur) quand connue — pour les gardes. */
  sampleSize?: number | null
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4) FUNNEL CITADELLE CANONIQUE — AGENT 1
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Étapes canoniques du tunnel de décision (haut → bas).
 * SOURCE est une DIMENSION d'entrée (contexte d'acquisition), montrée à part —
 * les 7 étapes ci-dessous sont les paliers verticaux du funnel.
 */
export type DecisionFunnelStageKey =
  | 'CITADELLE_VISIT'
  | 'SIGNUP'
  | 'ACTIVATION'
  | 'ENGAGEMENT'
  | 'PARCOURS_START'
  | 'PROGRESSION'
  | 'CONVERSION'

export const DECISION_FUNNEL_STAGE_ORDER: ReadonlyArray<DecisionFunnelStageKey> = [
  'CITADELLE_VISIT',
  'SIGNUP',
  'ACTIVATION',
  'ENGAGEMENT',
  'PARCOURS_START',
  'PROGRESSION',
  'CONVERSION',
]

/** Statut d'une étape (une étape non instrumentée ≠ 0). */
export type FunnelStageStatus = 'REAL' | 'PARTIAL' | 'UNAVAILABLE' | 'NO_DATA'

export interface DecisionFunnelStage {
  key: DecisionFunnelStageKey
  /** Libellé FR court (ex. « Visites Citadelle »). */
  label: string
  status: FunnelStageStatus
  /** Valeur réelle uniquement si status==='REAL' (0 réel inclus) ; sinon null. */
  value: number | null
  /** Définition canonique de la métrique (ce qu'elle compte VRAIMENT). */
  definition: string
  /** Source/événement réel (table.colonne), jamais un secret. */
  source: string
  /** Unité de cohorte : deux étapes ne sont comparables que si identique. */
  cohort: CohortUnit
  freshness: Freshness
  /** Clé du dictionnaire guide (InfoTip) si disponible. */
  metricKey?: string
  /** OBLIGATOIRE quand status ≠ 'REAL'. */
  reason?: string
}

/** Taux entre deux étapes consécutives (jamais entre cohortes incompatibles). */
export interface DecisionFunnelRate {
  fromKey: DecisionFunnelStageKey
  toKey: DecisionFunnelStageKey
  rate: number | null
  availability: DecisionAvailability // REAL | NO_DATA | UNAVAILABLE | NOT_APPLICABLE
  /** OBLIGATOIRE quand rate === null. */
  reason?: string
}

export interface DecisionFunnelPayload {
  generatedAt: string
  scope: DecisionScope // toujours 'citadelle' en 5B (funnel = périmètre Citadelle)
  period: DecisionPeriod
  demoMode: boolean
  stages: DecisionFunnelStage[]
  /** Taux inter-étapes consécutives (aligné sur stages[i] → stages[i+1]). */
  rates: DecisionFunnelRate[]
  /** Étape de chute principale (drop-off) si déterminable, sinon null. */
  primaryDropOffKey: DecisionFunnelStageKey | null
  error?: string
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5) SIGNAUX DE DÉCISION — AGENT 2 · « À comprendre aujourd'hui »
 * ════════════════════════════════════════════════════════════════════════ */

export type DecisionSignalCategory =
  | 'GROWTH'
  | 'DECLINE'
  | 'CONVERSION'
  | 'DROP_OFF'
  | 'CHANNEL_OPPORTUNITY'
  | 'SEO_OPPORTUNITY'
  | 'CONTENT_SIGNAL'
  | 'DATA_QUALITY'
  | 'CONNECTOR_STATUS'

export const DECISION_SIGNAL_CATEGORIES: ReadonlyArray<DecisionSignalCategory> = [
  'GROWTH',
  'DECLINE',
  'CONVERSION',
  'DROP_OFF',
  'CHANNEL_OPPORTUNITY',
  'SEO_OPPORTUNITY',
  'CONTENT_SIGNAL',
  'DATA_QUALITY',
  'CONNECTOR_STATUS',
]

/**
 * État de confiance d'un signal.
 * - HIGH/MEDIUM : actionnable et affichable comme recommandation.
 * - LOW/INSUFFICIENT_DATA : JAMAIS présenté comme recommandation confiante ;
 *   ne peut jamais devenir ACTION PRIORITAIRE.
 */
export type ConfidenceState = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA'

/** Une preuve élémentaire, traçable jusqu'à une métrique réelle. */
export interface SignalEvidenceItem {
  /** Libellé FR de la métrique (ex. « Visites Citadelle »). */
  metric: string
  /** Valeur affichable déjà formatée OU brute + availability. */
  measured: MeasuredValue | MeasuredRate
  /** Source réelle (table/connecteur), jamais un secret. */
  source: string
}

/**
 * Un signal déterministe et prouvé. AUCUN signal ne peut exister sans
 * EVIDENCE + SOURCE + PERIOD + SCOPE. COMPARISON/CONFIDENCE/ACTION sont
 * optionnels et n'apparaissent que si déterministiquement justifiés.
 */
export interface DecisionSignal {
  /** Identifiant stable de la règle qui a produit ce signal. */
  id: string
  category: DecisionSignalCategory
  /** Titre court FR. */
  title: string
  /** Le FAIT observé, sans interprétation. */
  fact: string
  /** Pourquoi cela compte (sans survendre / sans causalité inventée). */
  whyItMatters: string
  source: string
  period: DecisionPeriod
  scope: DecisionScope
  /** ≥1 preuve traçable obligatoire. */
  evidence: SignalEvidenceItem[]
  /** Comparaison déterministe (optionnelle). */
  comparison?: string
  confidence: ConfidenceState
  /** Action suggérée (optionnelle) — jamais impérative sous LOW/INSUFFICIENT. */
  action?: string | null
  /** true pour l'UNIQUE ACTION PRIORITAIRE (au plus une, confiance HIGH). */
  isActionPriority?: boolean
}

export interface DecisionSignalsPayload {
  generatedAt: string
  period: DecisionPeriod
  scope: DecisionScope
  demoMode: boolean
  /** 0 à 5 signaux, triés par priorité déterministe. */
  signals: DecisionSignal[]
  /**
   * Résumé de l'action prioritaire :
   * - hasActionPriority=false ⇒ afficher « Aucune action prioritaire déterminée
   *   avec suffisamment de données. » (état de succès valide).
   */
  actionPriority: {
    hasActionPriority: boolean
    signalId: string | null
  }
  error?: string
}

/* ══════════════════════════════════════════════════════════════════════════
 * 6) VALEUR PAR CANAL — AGENT 3
 * ════════════════════════════════════════════════════════════════════════ */

/** Colonnes CITADELLE (jamais remplies par des métriques de plateforme). */
export interface ChannelCitadelleValue {
  /** Source normalisée (whatsapp, youtube, google, direct, referral, email…). */
  source: string
  label: string
  citadelleVisits: MeasuredValue
  attributedSignups: MeasuredValue
  visitToSignupRate: MeasuredRate
  engagement: MeasuredValue
  parcours: MeasuredValue
  conversions: MeasuredValue
  confidence: ConfidenceState
}

/**
 * Contexte de PLATEFORME — visuellement distinct de l'impact Citadelle,
 * jamais fusionné dans un score composite.
 */
export interface ChannelPlatformContext {
  channel: string // 'youtube' | 'meta_facebook' | 'meta_instagram' | 'whatsapp' | …
  label: string
  availability: DecisionAvailability
  /** Métriques de portée plateforme (libellées, unités explicites). */
  metrics: Array<{ key: string; label: string; value: MeasuredValue; unit: string }>
  /** Raison si UNAVAILABLE (ex. Meta bloqué côté propriétaire). */
  reason?: string
}

/** Un classement NOMMÉ (jamais un « meilleur canal » global). */
export interface ChannelRanking {
  key: 'top_traffic_attributed' | 'top_signup_rate' | 'top_progressions_attributed'
  label: string
  metricLabel: string
  period: DecisionPeriod
  /** Disponible seulement si assez de canaux comparables. */
  available: boolean
  /** Raison quand available===false (ex. « moins de 2 canaux comparables »). */
  reason?: string
  rows: Array<{
    source: string
    label: string
    value: number | null
    /** Taille d'échantillon du dénominateur pour les taux. */
    sampleSize?: number | null
  }>
}

export interface DecisionChannelsPayload {
  generatedAt: string
  scope: DecisionScope
  period: DecisionPeriod
  demoMode: boolean
  citadelle: ChannelCitadelleValue[]
  /** Conversions non rattachées à une source (transparence du partiel). */
  unattributed: { signups: number; progressions: number }
  internalVisitsExcluded: number
  platformContext: ChannelPlatformContext[]
  rankings: ChannelRanking[]
  error?: string
}

/* ══════════════════════════════════════════════════════════════════════════
 * 7) QUALITÉ DE MESURE — AGENT 2 (partagé) · aucun pourcentage synthétique
 * ════════════════════════════════════════════════════════════════════════ */

export interface DataQualityItem {
  label: string
  /** Source/raison courte, non sensible. */
  detail: string
}

export interface DataQualityContext {
  generatedAt: string
  /** Mesure fiable (sources réelles connectées). */
  reliable: DataQualityItem[]
  /** Mesure partielle (attribution incomplète, différée…). */
  partial: DataQualityItem[]
  /** À instrumenter (lacunes réelles). */
  toInstrument: DataQualityItem[]
  /** Comptes factuels de couverture (available/partial/gap/total) — pas de %. */
  coverage: { available: number; partial: number; gap: number; total: number }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 8) SURFACE DE DÉCISION AGRÉGÉE — écrite par le SUPERVISEUR (intégration)
 * ════════════════════════════════════════════════════════════════════════ */

/** Payload servi par GET /api/intelligence/decision (aggrégateur superviseur). */
export interface DecisionSurfacePayload {
  generatedAt: string
  scope: DecisionScope
  period: DecisionPeriod
  demoMode: boolean
  signals: DecisionSignalsPayload
  funnel: DecisionFunnelPayload
  channels: DecisionChannelsPayload
  dataQuality: DataQualityContext
  error?: string
}
