import type { EditorialPriorityBand } from './contracts'

export interface EditorialPriorityDimensions {
  mission: number
  audience: number
  performance: number
  opportunity: number
  effort: number
  timing: number
}

export interface EditorialPriorityEstimate {
  score: number
  band: EditorialPriorityBand
}

const BAND_ORDER: Readonly<Record<EditorialPriorityBand, number>> = {
  FORTE: 0,
  NORMALE: 1,
  A_SURVEILLER: 2,
}

export function estimateEditorialPriorityBand(score: number): EditorialPriorityBand {
  if (score >= 70) return 'FORTE'
  if (score >= 45) return 'NORMALE'
  return 'A_SURVEILLER'
}

export function scoreEditorialPriority(dimensions: EditorialPriorityDimensions): EditorialPriorityEstimate {
  const score =
    dimensions.mission * 0.3 +
    dimensions.audience * 0.2 +
    dimensions.performance * 0.2 +
    dimensions.opportunity * 0.15 +
    dimensions.timing * 0.1 -
    dimensions.effort * 0.15

  return {
    score,
    band: estimateEditorialPriorityBand(score),
  }
}

export function compareEditorialPriorityBands(left: EditorialPriorityBand, right: EditorialPriorityBand): number {
  return BAND_ORDER[left] - BAND_ORDER[right]
}

