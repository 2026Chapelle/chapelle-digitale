import type { EditorialCapacity, EditorialRecommendation } from './contracts'
import { compareEditorialPriorityBands } from './prioritization'

export interface EditorialCapacityEnvelope {
  weeklyTotal: number
  family: Record<string, number>
  channel: Record<string, number>
  contentKind: Record<string, number>
}

export function computeEditorialCapacityEnvelope(input: {
  live: number
  podcast: number
  article: number
  shortVideo: number
  social: number
  whatsapp: number
}): EditorialCapacityEnvelope {
  return {
    weeklyTotal: Object.values(input).reduce((total, value) => total + Math.max(0, value), 0),
    family: {
      LIVE: Math.max(0, input.live),
      PODCAST: Math.max(0, input.podcast),
      ARTICLE: Math.max(0, input.article),
      SHORT_VIDEO: Math.max(0, input.shortVideo),
      SOCIAL: Math.max(0, input.social),
      WHATSAPP: Math.max(0, input.whatsapp),
    },
    channel: {},
    contentKind: {},
  }
}

function isWithinLimit(current: number, limit: number | undefined): boolean {
  return limit === undefined || limit < 0 ? true : current < limit
}

export function applyEditorialCapacityLimits(
  recommendations: ReadonlyArray<EditorialRecommendation>,
  capacity: EditorialCapacity | null | undefined,
): EditorialRecommendation[] {
  if (!capacity) return [...recommendations]

  const weeklyTotalLimit = capacity.weeklyTotal >= 0 ? capacity.weeklyTotal : recommendations.length
  const familyCounts: Partial<Record<EditorialRecommendation['recommendationKind'], number>> = {}
  const channelCounts: Record<string, number> = {}
  const contentKindCounts: Record<string, number> = {}

  const sorted = [...recommendations].sort((left, right) => {
    const band = compareEditorialPriorityBands(left.priorityBand, right.priorityBand)
    if (band !== 0) return band
    const leftScheduled = left.scheduledFor ?? left.windowStart
    const rightScheduled = right.scheduledFor ?? right.windowStart
    if (leftScheduled !== rightScheduled) {
      return leftScheduled.localeCompare(rightScheduled)
    }
    return left.dedupeKey.localeCompare(right.dedupeKey)
  })

  const selected: EditorialRecommendation[] = []
  for (const recommendation of sorted) {
    if (selected.length >= weeklyTotalLimit) break

    const familyCount = familyCounts[recommendation.recommendationKind] ?? 0
    const channelCount = channelCounts[recommendation.targetChannel] ?? 0
    const contentKindCount = contentKindCounts[recommendation.contentKind] ?? 0

    if (!isWithinLimit(familyCount, capacity.family[recommendation.recommendationKind])) continue
    if (!isWithinLimit(channelCount, capacity.channel[recommendation.targetChannel])) continue
    if (!isWithinLimit(contentKindCount, capacity.contentKind[recommendation.contentKind])) continue

    selected.push(recommendation)
    familyCounts[recommendation.recommendationKind] = familyCount + 1
    channelCounts[recommendation.targetChannel] = channelCount + 1
    contentKindCounts[recommendation.contentKind] = contentKindCount + 1
  }

  return selected
}
