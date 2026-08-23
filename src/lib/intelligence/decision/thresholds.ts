/**
 * CITADELLE INTELLIGENCE — 5B · SEUILS D'ÉCHANTILLON CENTRALISÉS & DOCUMENTÉS.
 *
 * Aucune « magie » dispersée : tout garde-fou de taille minimale d'échantillon
 * vit ICI, documenté. On NE prétend PAS à une significativité statistique : ce
 * sont des garde-fous prudents contre les conclusions sur micro-échantillons.
 *
 * Principe : sous le seuil, la confiance est dégradée (JAMAIS supprimée) —
 * un taux calculé sur un petit dénominateur devient LOW / INSUFFICIENT_DATA.
 */

import type { ConfidenceState } from './contract'

/**
 * Seuils de dénominateur (taille de cohorte) pour qualifier la confiance d'un TAUX.
 * Ex. « taux visite → inscription » : si < 30 visites, on n'en conclut rien de solide.
 */
export const RATE_SAMPLE_THRESHOLDS = {
  /** En dessous : INSUFFICIENT_DATA (trop peu pour toute lecture). */
  insufficientBelow: 10,
  /** [insufficientBelow, lowBelow) : LOW (indicatif, non concluant). */
  lowBelow: 30,
  /** [lowBelow, mediumBelow) : MEDIUM. */
  mediumBelow: 100,
  /** ≥ mediumBelow : HIGH éligible (si les autres conditions Evidence First sont réunies). */
} as const

/**
 * Nombre MINIMAL de canaux réellement comparables pour publier un classement.
 * En dessous : RANKING=NOT_AVAILABLE (jamais un « meilleur canal » trompeur).
 */
export const MIN_COMPARABLE_CHANNELS_FOR_RANKING = 2

/**
 * Variation relative minimale (ratio) pour qu'un signal de croissance/déclin
 * soit jugé matériel plutôt que du bruit. Ex. 0.15 = 15 %.
 */
export const MIN_MATERIAL_DELTA_RATIO = 0.15

/**
 * Volume absolu minimal (compte) pour qu'une variation relative soit prise au
 * sérieux : passer de 1 à 2 est +100 % mais non concluant.
 */
export const MIN_ABSOLUTE_VOLUME_FOR_TREND = 20

/**
 * Confiance dérivée d'une taille d'échantillon (dénominateur) selon les seuils.
 * Déterministe et pure. `sampleSize` null/indéfini ⇒ INSUFFICIENT_DATA.
 */
export function confidenceFromSample(sampleSize: number | null | undefined): ConfidenceState {
  if (sampleSize === null || sampleSize === undefined || !Number.isFinite(sampleSize)) {
    return 'INSUFFICIENT_DATA'
  }
  if (sampleSize < RATE_SAMPLE_THRESHOLDS.insufficientBelow) return 'INSUFFICIENT_DATA'
  if (sampleSize < RATE_SAMPLE_THRESHOLDS.lowBelow) return 'LOW'
  if (sampleSize < RATE_SAMPLE_THRESHOLDS.mediumBelow) return 'MEDIUM'
  return 'HIGH'
}

/** Une confiance autorise-t-elle une recommandation affichée comme confiante ? */
export function isConfidentEnough(c: ConfidenceState): boolean {
  return c === 'HIGH' || c === 'MEDIUM'
}

/** Une confiance autorise-t-elle de devenir ACTION PRIORITAIRE (HIGH seulement) ? */
export function canBeActionPriority(c: ConfidenceState): boolean {
  return c === 'HIGH'
}
