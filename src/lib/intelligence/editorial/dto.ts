import type { EditorialRecommendation, EditorialSettings } from './contracts'
import { buildEditorialSettingsProjection } from './settings-projection'

export function toPublicEditorialRecommendation(recommendation: EditorialRecommendation) {
  const { createdBy: _createdBy, updatedBy: _updatedBy, ...publicRecommendation } = recommendation
  const { score: _score, ...explainablePerformance } = publicRecommendation.performanceSnapshot
  return {
    ...publicRecommendation,
    performanceSnapshot: explainablePerformance,
  }
}

export function toPublicEditorialSettings(settings: EditorialSettings | null) {
  return buildEditorialSettingsProjection(settings)
}
