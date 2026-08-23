/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 1 · CONSTRUCTION PURE DU FUNNEL DE DÉCISION.
 *
 * `buildDecisionFunnel` transforme des comptes DÉJÀ LUS (aucun I/O ici, horloge
 * injectée) en un `DecisionFunnelPayload` VÉRIDIQUE :
 *  - une étape instrumentée porte sa vraie valeur (0 réel reste REAL) ;
 *  - une étape non instrumentée sort UNAVAILABLE + raison (JAMAIS 0) ;
 *  - le mode démo ne présente AUCUN nombre fictif comme réel (value=null) ;
 *  - un taux inter-étapes n'existe que si les deux étapes sont REAL, de MÊME
 *    cohorte et dénominateur > 0 — sinon UNAVAILABLE + raison (jamais « 0 % ») ;
 *    les cohortes voisines étant distinctes, tous les taux sortent honnêtement
 *    UNAVAILABLE.
 *  - `scope` est TOUJOURS 'citadelle' (le funnel est le périmètre Citadelle).
 *
 * Aucune métrique de PLATEFORME (vues YouTube, portée Meta…) n'entre ici.
 */

import type { ConversionCounts } from '../../conversions/categories'
import { COHORT_LABEL_FR } from '../../conversions/funnel'
import type {
  DecisionFunnelPayload,
  DecisionFunnelRate,
  DecisionFunnelStage,
  DecisionFunnelStageKey,
  DecisionPeriod,
  FunnelStageStatus,
} from '../contract'
import { DECISION_FUNNEL_STAGE_ORDER } from '../contract'
import { getStageDef, orderedStageDefs } from './stages'

/**
 * Entrées PURES du builder du funnel (déjà lues par l'agrégateur superviseur).
 * `counts` réutilise la forme prouvée ConversionCounts ; null (ou demo) ⇒ aucune
 * valeur réelle présentée. `nowIso` = horloge injectée (déterminisme des tests).
 */
export interface FunnelBuildInput {
  /** Comptes réels de la période. null ⇒ démo (aucun nombre réel). */
  counts: ConversionCounts | null
  /** Fenêtre explicite portée par chaque affirmation. */
  period: DecisionPeriod
  /** Instant de génération (ISO 8601) — injecté, jamais Date.now() ici. */
  nowIso: string
  /** Mode démonstration : aucune valeur réelle n'est produite. */
  demo?: boolean
}

/**
 * Construit une étape à partir de sa définition + des comptes. PURE.
 *  - non instrumentée → UNAVAILABLE, value=null, raison intrinsèque ;
 *  - démo / counts=null → UNAVAILABLE, value=null, raison « mode démonstration » ;
 *  - sinon → REAL avec le vrai compte (0 réel reste REAL).
 */
function buildStage(
  key: DecisionFunnelStageKey,
  counts: ConversionCounts | null,
  demoMode: boolean,
): DecisionFunnelStage {
  const def = getStageDef(key)

  if (def.kind === 'uninstrumented') {
    return {
      key: def.key,
      label: def.label,
      status: 'UNAVAILABLE',
      value: null,
      definition: def.definition,
      source: def.source,
      cohort: def.cohort,
      freshness: def.freshness,
      metricKey: def.metricKey,
      reason: def.reason,
    }
  }

  if (demoMode || !counts) {
    return {
      key: def.key,
      label: def.label,
      status: 'UNAVAILABLE',
      value: null,
      definition: def.definition,
      source: def.source,
      cohort: def.cohort,
      freshness: def.freshness,
      metricKey: def.metricKey,
      reason:
        'Mode démonstration : aucun chiffre réel n\'est présenté pour cette étape.',
    }
  }

  const status: FunnelStageStatus = 'REAL'
  return {
    key: def.key,
    label: def.label,
    status,
    value: counts[def.countKey], // 0 réel reste REAL
    definition: def.definition,
    source: def.source,
    cohort: def.cohort,
    freshness: def.freshness,
    metricKey: def.metricKey,
  }
}

/**
 * Taux entre deux étapes CONSÉCUTIVES. Même logique de garde que
 * conversions/funnel.computeStageRate (premier garde qui échoue fixe la raison) :
 *  1. amont non REAL → UNAVAILABLE ;
 *  2. aval non REAL → UNAVAILABLE ;
 *  3. cohortes différentes → UNAVAILABLE ;
 *  4. dénominateur ≤ 0 → UNAVAILABLE ;
 *  5. sinon → REAL, rate = aval / amont (0..1). Jamais NaN/Infinity/faux 0 %.
 */
function computeDecisionRate(
  from: DecisionFunnelStage,
  to: DecisionFunnelStage,
): DecisionFunnelRate {
  const base = { fromKey: from.key, toKey: to.key }

  if (from.status !== 'REAL' || from.value === null) {
    return {
      ...base,
      rate: null,
      availability: 'UNAVAILABLE',
      reason: `Étape amont « ${from.label} » indisponible : aucun taux calculable.`,
    }
  }
  if (to.status !== 'REAL' || to.value === null) {
    return {
      ...base,
      rate: null,
      availability: 'UNAVAILABLE',
      reason: `Étape aval « ${to.label} » indisponible : aucun taux calculable.`,
    }
  }
  if (from.cohort !== to.cohort) {
    return {
      ...base,
      rate: null,
      availability: 'UNAVAILABLE',
      reason:
        `Cohortes non comparables : « ${from.label} » compte des ${COHORT_LABEL_FR[from.cohort]}, ` +
        `« ${to.label} » compte des ${COHORT_LABEL_FR[to.cohort]}. Un taux entre les deux n'aurait pas de sens.`,
    }
  }
  if (from.value <= 0) {
    return {
      ...base,
      rate: null,
      availability: 'UNAVAILABLE',
      reason: `Dénominateur nul : « ${from.label} » = 0, aucun taux calculable.`,
    }
  }
  return { ...base, rate: to.value / from.value, availability: 'REAL' }
}

/**
 * Détermine l'étape de chute principale (drop-off), ou null.
 * N'est considéré QUE ce qui est réellement calculable : parmi les taux REAL
 * (donc même cohorte, dénominateur > 0), on retient l'étape aval du taux le plus
 * FAIBLE strictement inférieur à 1 (une vraie chute). Aucun taux REAL ⇒ null.
 * Aucune chute n'est jamais fabriquée à partir d'une étape indisponible.
 */
function determinePrimaryDropOff(
  rates: DecisionFunnelRate[],
): DecisionFunnelStageKey | null {
  let worstKey: DecisionFunnelStageKey | null = null
  let worstRate = Number.POSITIVE_INFINITY
  for (const r of rates) {
    if (r.availability !== 'REAL' || r.rate === null) continue
    if (r.rate >= 1) continue // pas de chute (rétention/hausse)
    if (r.rate < worstRate) {
      worstRate = r.rate
      worstKey = r.toKey
    }
  }
  return worstKey
}

/**
 * Construit le funnel de décision Citadelle complet. PURE et déterministe.
 * scope = 'citadelle' invariablement. Les taux ne portent que sur des étapes
 * consécutives ; primaryDropOffKey n'est renseigné que s'il est réellement calculable.
 */
export function buildDecisionFunnel(input: FunnelBuildInput): DecisionFunnelPayload {
  const demoMode = input.demo === true || input.counts === null

  const stages: DecisionFunnelStage[] = DECISION_FUNNEL_STAGE_ORDER.map((key) =>
    buildStage(key, input.counts, demoMode),
  )

  const rates: DecisionFunnelRate[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    rates.push(computeDecisionRate(stages[i], stages[i + 1]))
  }

  const primaryDropOffKey = determinePrimaryDropOff(rates)

  return {
    generatedAt: input.nowIso,
    scope: 'citadelle',
    period: input.period,
    demoMode,
    stages,
    rates,
    primaryDropOffKey,
  }
}

// Réexport interne pour tests unitaires ciblés (helpers purs).
export const __internals = {
  buildStage,
  computeDecisionRate,
  determinePrimaryDropOff,
  orderedStageDefs,
}
