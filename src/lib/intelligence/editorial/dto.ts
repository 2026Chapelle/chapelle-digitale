import type { EditorialRecommendation, EditorialSettings } from './contracts'
import { buildEditorialSettingsProjection } from './settings-projection'

export function toPublicEditorialRecommendation(recommendation: EditorialRecommendation) {
  const { createdBy: _createdBy, updatedBy: _updatedBy, ...publicRecommendation } = recommendation
  return publicRecommendation
}

export function toPublicEditorialSettings(settings: EditorialSettings | null) {
  return buildEditorialSettingsProjection(settings)
}

