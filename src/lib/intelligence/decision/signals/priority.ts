/**
 * CITADELLE INTELLIGENCE — 5B · PRIORISATION & SÉLECTION DE L'ACTION PRIORITAIRE.
 *
 * Tri DÉTERMINISTE des signaux + plafond à 5 + choix d'AU PLUS UNE action
 * prioritaire. Aucune part d'aléatoire : le tri ne dépend que de la confiance,
 * de la catégorie et de l'identifiant (stable).
 *
 * GARDES DE VÉRITÉ :
 *  - au plus 5 signaux publiés ;
 *  - au plus 1 `isActionPriority=true` ;
 *  - l'action prioritaire exige une confiance HIGH ET une catégorie réellement
 *    actionnable ET une action non vide ; sinon `hasActionPriority=false`
 *    (état de succès valide).
 */

import type {
  ConfidenceState,
  DecisionSignal,
  DecisionSignalCategory,
} from '../contract'
import { canBeActionPriority } from '../thresholds'

/** Nombre MAXIMUM de signaux publiés (contrat 5B). */
export const MAX_SIGNALS = 5

/** Poids de confiance (plus petit = plus fiable, remonte en tête). */
const CONFIDENCE_WEIGHT: Record<ConfidenceState, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  INSUFFICIENT_DATA: 3,
}

/**
 * Poids de catégorie (à confiance égale) : ordre d'urgence pour
 * « À comprendre aujourd'hui ». Plus petit = plus prioritaire.
 */
const CATEGORY_WEIGHT: Record<DecisionSignalCategory, number> = {
  DROP_OFF: 0,
  DECLINE: 1,
  CONVERSION: 2,
  CHANNEL_OPPORTUNITY: 3,
  GROWTH: 4,
  SEO_OPPORTUNITY: 5,
  CONTENT_SIGNAL: 6,
  CONNECTOR_STATUS: 7,
  DATA_QUALITY: 8,
}

/**
 * Catégories réellement ACTIONNABLES pour la Citadelle (éligibles à l'action
 * prioritaire). GROWTH/DECLINE (plateforme), DATA_QUALITY, CONNECTOR_STATUS et
 * CONTENT_SIGNAL en sont exclus par principe (informatifs, non pilotables ici).
 */
export const ACTION_PRIORITY_ELIGIBLE_CATEGORIES: ReadonlySet<DecisionSignalCategory> = new Set<
  DecisionSignalCategory
>(['DROP_OFF', 'CONVERSION', 'CHANNEL_OPPORTUNITY', 'SEO_OPPORTUNITY'])

/** Comparateur déterministe : confiance, puis catégorie, puis id (stable). */
export function compareSignals(a: DecisionSignal, b: DecisionSignal): number {
  const dc = CONFIDENCE_WEIGHT[a.confidence] - CONFIDENCE_WEIGHT[b.confidence]
  if (dc !== 0) return dc
  const cc = CATEGORY_WEIGHT[a.category] - CATEGORY_WEIGHT[b.category]
  if (cc !== 0) return cc
  return a.id.localeCompare(b.id)
}

/** Un signal peut-il porter l'action prioritaire ? (HIGH + actionnable + action). */
export function isEligibleActionPriority(signal: DecisionSignal): boolean {
  return (
    canBeActionPriority(signal.confidence) &&
    ACTION_PRIORITY_ELIGIBLE_CATEGORIES.has(signal.category) &&
    typeof signal.action === 'string' &&
    signal.action.trim().length > 0
  )
}

export interface RankResult {
  signals: DecisionSignal[]
  actionPriority: { hasActionPriority: boolean; signalId: string | null }
}

/**
 * Trie, plafonne à 5, puis choisit AU PLUS UNE action prioritaire parmi les
 * signaux publiés. Retourne des copies (aucune mutation des entrées).
 */
export function rankAndSelect(raw: ReadonlyArray<DecisionSignal>): RankResult {
  const sorted = [...raw].sort(compareSignals)
  const capped = sorted.slice(0, MAX_SIGNALS)

  // Premier signal éligible dans l'ordre trié = action prioritaire unique.
  const chosen = capped.find(isEligibleActionPriority) ?? null
  const chosenId = chosen ? chosen.id : null

  const signals = capped.map((s) => ({ ...s, isActionPriority: s.id === chosenId }))
  return {
    signals,
    actionPriority: {
      hasActionPriority: chosenId !== null,
      signalId: chosenId,
    },
  }
}
