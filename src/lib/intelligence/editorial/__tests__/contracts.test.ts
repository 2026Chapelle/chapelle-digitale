import { describe, expect, it } from 'vitest'
import {
  buildEditorialRecommendationDedupeKey,
  canTransitionEditorialRecommendation,
  EDITORIAL_PRIORITY_BANDS,
  EDITORIAL_RECOMMENDATION_KINDS,
  EDITORIAL_RECOMMENDATION_STATUSES,
} from '../contracts'

describe('editorial contracts', () => {
  it('treats one recommendation as one schedulable editorial unit', () => {
    expect(EDITORIAL_RECOMMENDATION_KINDS).toEqual(['CREATE', 'REPURPOSE', 'PROMOTE'])
    expect(EDITORIAL_RECOMMENDATION_STATUSES).toEqual([
      'PROPOSED',
      'ACCEPTED',
      'SCHEDULED',
      'COMPLETED',
      'REJECTED',
      'ARCHIVED',
    ])
    expect(EDITORIAL_PRIORITY_BANDS).toEqual(['FORTE', 'NORMALE', 'A_SURVEILLER'])

    const dedupeKey = buildEditorialRecommendationDedupeKey({
      organizationId: 'org_01',
      recommendationKind: 'REPURPOSE',
      contentKind: 'article',
      targetChannel: 'whatsapp',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      scheduledFor: '2026-08-28',
      sourceContentId: 'live_42',
      batchId: 'batch_01',
      parentRecommendationId: 'rec_parent',
    })

    expect(dedupeKey).toBe('org_01|REPURPOSE|article|whatsapp|2026-08-25|2026-08-31|2026-08-28|live_42')
    expect(canTransitionEditorialRecommendation('PROPOSED', 'ACCEPTED')).toBe(true)
    expect(canTransitionEditorialRecommendation('ACCEPTED', 'PROPOSED')).toBe(false)
  })
})
