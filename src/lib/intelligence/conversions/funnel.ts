/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Tunnel de conversion PUR (aucun I/O). Règle cardinale : on ne calcule JAMAIS un
 * taux entre deux cohortes incompatibles. Un taux n'est produit que si les deux
 * étapes partagent EXACTEMENT la même unité de cohorte ET sont réelles ET le
 * dénominateur est strictement positif. Sinon RATE=UNAVAILABLE + raison déterministe.
 */

import type {
  CohortUnit,
  Funnel,
  FunnelRate,
  FunnelStage,
} from './types'

/** Libellé humain (FR) d'une unité de cohorte, pour des raisons explicites. */
export const COHORT_LABEL_FR: Record<CohortUnit, string> = {
  pageviews: 'pages vues (événements, pas visiteurs uniques)',
  new_persons: 'personnes nouvellement inscrites',
  plays: 'écoutes (lectures, pas auditeurs uniques)',
  module_completions: 'complétions de module',
  composite: 'agrégat hétérogène non sommable',
  unavailable: 'cohorte indisponible',
}

/**
 * Calcule le taux entre deux étapes consécutives. PUR et déterministe.
 * Ordre des gardes (le premier qui échoue fixe la raison) :
 *  1. étape amont non réelle → indisponible ;
 *  2. étape aval non réelle → indisponible ;
 *  3. cohortes différentes → indisponible (raison = les deux libellés) ;
 *  4. dénominateur ≤ 0 → indisponible (jamais NaN/Infinity/faux 0 %) ;
 *  5. sinon → taux = aval / amont (ratio 0..1).
 */
export function computeStageRate(from: FunnelStage, to: FunnelStage): FunnelRate {
  const base = { fromKey: from.key, toKey: to.key }

  if (from.availability !== 'REAL' || from.value === null) {
    return {
      ...base,
      rate: null,
      availability: 'UNAVAILABLE',
      reason: `Étape amont « ${from.label} » indisponible : aucun taux calculable.`,
    }
  }
  if (to.availability !== 'REAL' || to.value === null) {
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
 * Construit le tunnel complet à partir d'étapes déjà déterminées. PUR.
 * Les taux sont calculés uniquement entre étapes CONSÉCUTIVES.
 */
export function buildFunnel(stages: FunnelStage[]): Funnel {
  const rates: FunnelRate[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    rates.push(computeStageRate(stages[i], stages[i + 1]))
  }
  return { stages, rates }
}
