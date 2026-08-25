import { describe, expect, it } from 'vitest'
import type { EditorialRecommendation } from './contracts'
import {
  buildEditorialSignalSignature,
  isHumanLockedEditorialStatus,
  recordEditorialPerformanceObservation,
  shouldSuppressRejectedEditorialRecommendation,
} from './memory'

function recommendation(status: EditorialRecommendation['status'], signalSignature: string): EditorialRecommendation {
  return {
    id: 'rec_01',
    organizationId: 'org_01',
    recommendationKind: 'REPURPOSE',
    contentKind: 'article',
    targetChannel: 'web',
    status,
    priorityBand: 'NORMALE',
    windowStart: '2026-08-25',
    windowEnd: '2026-08-31',
    scheduledFor: '2026-08-25',
    batchId: 'batch_01',
    parentRecommendationId: null,
    dedupeKey: 'dedupe_01',
    sourceContentId: 'live_01',
    sourceContentType: 'live',
    sourceTitle: 'Sunday live',
    sourceSnapshot: { signalSignature },
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
  }
}

describe('editorial memory helpers', () => {
  it('keeps missing values distinct while building signal signatures', () => {
    const a = buildEditorialSignalSignature([
      {
        key: 'views',
        source: 'youtube',
        truthState: 'REAL',
        available: true,
        observedAt: '2026-08-25T10:00:00.000Z',
        value: 0,
      },
    ])
    const b = buildEditorialSignalSignature([
      {
        key: 'views',
        source: 'youtube',
        truthState: 'UNAVAILABLE',
        available: false,
        observedAt: '2026-08-25T10:00:00.000Z',
        value: null,
      },
    ])

    expect(a).not.toBe(b)
  })

  it('protects locked human statuses and suppresses rejected recommendations only on the same signature', () => {
    expect(isHumanLockedEditorialStatus('ACCEPTED')).toBe(true)
    expect(isHumanLockedEditorialStatus('PROPOSED')).toBe(false)
    expect(shouldSuppressRejectedEditorialRecommendation(recommendation('REJECTED', 'sig_a'), 'sig_a')).toBe(true)
    expect(shouldSuppressRejectedEditorialRecommendation(recommendation('REJECTED', 'sig_a'), 'sig_b')).toBe(false)
    expect(shouldSuppressRejectedEditorialRecommendation(recommendation('ACCEPTED', 'sig_a'), 'sig_a')).toBe(false)
  })

  it('records performance only after completion without changing human edits', async () => {
    await expect(recordEditorialPerformanceObservation({
      organizationId: 'org_01',
      recommendationId: 'rec_01',
      status: 'COMPLETED',
      metrics: { views: 120, listens: 40 },
      humanEdited: true,
    })).resolves.toMatchObject({ appended: true })
  })
})
