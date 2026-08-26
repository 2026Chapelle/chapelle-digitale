import { describe, expect, it } from 'vitest'
import type { EditorialRecommendation } from './contracts'
import { applyEditorialCapacityLimits } from './capacity'
import { computeEditorialCapacityEnvelope, prepareEditorialWeekPlan } from './prepare-week'

function rec(overrides: Partial<EditorialRecommendation>): EditorialRecommendation {
  return {
    id: 'rec_' + (overrides.id ?? 'x'),
    organizationId: 'org_01',
    recommendationKind: 'REPURPOSE',
    contentKind: 'article',
    targetChannel: 'web',
    status: 'PROPOSED',
    priorityBand: 'NORMALE',
    windowStart: '2026-08-25',
    windowEnd: '2026-08-31',
    scheduledFor: '2026-08-25',
    batchId: 'batch_01',
    parentRecommendationId: null,
    dedupeKey: 'dedupe_' + (overrides.id ?? 'x'),
    sourceContentId: 'live_01',
    sourceContentType: 'live',
    sourceTitle: 'Sunday live',
    sourceSnapshot: {},
    signals: [],
    why: ['reuse-first'],
    humanTitleOverride: null,
    humanNotes: null,
    humanEdit: {},
    generatedAt: '2026-08-25T10:00:00.000Z',
    lastRefreshedAt: null,
    lastHumanActionAt: null,
    acceptedAt: null,
    scheduledAt: null,
    completedAt: null,
    rejectedAt: null,
    archivedAt: null,
    performanceSnapshot: {},
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
    ...overrides,
  }
}

describe('applyEditorialCapacityLimits', () => {
  it('keeps the highest priority items within weekly, family, channel, and content-kind limits', () => {
    const selected = applyEditorialCapacityLimits(
      [
        rec({ id: 'a', priorityBand: 'FORTE', recommendationKind: 'REPURPOSE', targetChannel: 'web', contentKind: 'article', scheduledFor: '2026-08-25' }),
        rec({ id: 'b', priorityBand: 'FORTE', recommendationKind: 'REPURPOSE', targetChannel: 'web', contentKind: 'article', scheduledFor: '2026-08-26' }),
        rec({ id: 'c', priorityBand: 'NORMALE', recommendationKind: 'PROMOTE', targetChannel: 'whatsapp', contentKind: 'whatsapp', scheduledFor: '2026-08-27' }),
        rec({ id: 'd', priorityBand: 'A_SURVEILLER', recommendationKind: 'PROMOTE', targetChannel: 'facebook', contentKind: 'facebook', scheduledFor: '2026-08-28' }),
      ],
      {
        weeklyTotal: 2,
        family: { REPURPOSE: 1, PROMOTE: 1 },
        channel: { web: 1, whatsapp: 1, facebook: 1 },
        contentKind: { article: 1, whatsapp: 1, facebook: 1 },
      },
    )

    expect(selected.map((item) => item.id)).toEqual(['a', 'c'])
  })
})

describe('6A-2 capacity contracts', () => {
  it('computes the declared family envelope and prepares a seven-day preview', () => {
    const envelope = computeEditorialCapacityEnvelope({
      live: 1,
      podcast: 1,
      article: 1,
      shortVideo: 2,
      social: 3,
      whatsapp: 2,
    })
    const plan = prepareEditorialWeekPlan({
      organizationId: 'org_01',
      calendarWindow: { start: '2026-08-25', end: '2026-09-01' },
      capacity: { live: 1, podcast: 1, article: 1, shortVideo: 2, social: 3, whatsapp: 2 },
      candidates: [
        { recommendationId: 'rec_01', contentKind: 'LIVE', channel: 'YOUTUBE' },
        { recommendationId: 'rec_02', contentKind: 'PODCAST', channel: 'PODCAST' },
        { recommendationId: 'rec_03', contentKind: 'ARTICLE', channel: 'WEB' },
      ],
    })

    expect(envelope.weeklyTotal).toBe(10)
    expect(plan.days).toHaveLength(7)
    expect(plan.autoAccepted).toBe(false)
    expect(plan.autoPublished).toBe(false)
  })
})
