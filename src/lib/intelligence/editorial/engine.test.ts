import { describe, expect, it } from 'vitest'
import type { ContentGraphNode } from '../types/content'
import { buildEditorialRecommendationsForWindow } from './engine'

function liveSource(): ContentGraphNode {
  return {
    entity: {
      content_id: 'live_42',
      type: 'live',
      title: 'Teaching from Sunday',
      canonical_slug: 'teaching-from-sunday',
      published_at: '2026-08-24T09:00:00.000Z',
    },
    destinations: [
      {
        content_id: 'live_42',
        platform: 'youtube',
        external_id: 'yt_42',
        url: 'https://youtube.example/live_42',
      },
    ],
  }
}

const createSignal = {
  key: 'seo:create:article',
  source: 'google_search_console',
  truthState: 'REAL' as const,
  available: true,
  observedAt: '2026-08-25T08:00:00.000Z',
  value: { topic: 'Marriage' },
}

describe('buildEditorialRecommendationsForWindow', () => {
  it('generates reuse-first multi-channel recommendations with stable batch grouping', () => {
    const result = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:00:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [createSignal],
      derivedFromByContentId: { live_42: 'rec_seed_01' },
    })

    expect(result.recommendations).toHaveLength(6)
    expect(result.priorityRecommendations).toHaveLength(5)
    expect(new Set(result.recommendations.map((item) => item.batchId)).size).toBe(2)
    expect(result.recommendations.slice(0, 5).every((item) => item.parentRecommendationId === 'rec_seed_01')).toBe(true)
    expect(result.recommendations[5].parentRecommendationId).toBeNull()
    expect(result.recommendations.map((item) => item.recommendationKind)).toEqual([
      'REPURPOSE',
      'REPURPOSE',
      'REPURPOSE',
      'PROMOTE',
      'PROMOTE',
      'CREATE',
    ])
    expect(result.recommendations.every((item) => ['FORTE', 'NORMALE', 'A_SURVEILLER'].includes(item.priorityBand))).toBe(true)
    for (const item of result.recommendations) {
      expect(item.batchId).toEqual(expect.any(String))
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(item.batchId as string)).toBe(true)
    }
  })

  it('deduplicates against existing recommendations on a repeated refresh', () => {
    const first = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:00:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [createSignal],
      derivedFromByContentId: { live_42: 'rec_seed_01' },
    })

    const second = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:05:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [createSignal],
      derivedFromByContentId: { live_42: 'rec_seed_01' },
      existingRecommendations: first.recommendations,
    })

    expect(second.recommendations).toHaveLength(0)
    expect(second.priorityRecommendations).toHaveLength(0)
  })

  it('reopens recommendations when the signal signature changes meaningfully', () => {
    const first = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:00:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [createSignal],
      derivedFromByContentId: { live_42: 'rec_seed_01' },
    })

    const second = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:05:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [
        {
          ...createSignal,
          value: { topic: 'Marriage', fresh: true },
        },
      ],
      derivedFromByContentId: { live_42: 'rec_seed_01' },
      existingRecommendations: first.recommendations,
    })

    expect(second.recommendations).toHaveLength(6)
    expect(second.recommendations[0].dedupeKey).not.toBe(first.recommendations[0].dedupeKey)
  })

  it('does not regenerate accepted work when a signal changes', () => {
    const first = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:00:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [createSignal],
    })

    const accepted = first.recommendations.map((item) => ({ ...item, status: 'ACCEPTED' as const }))
    const second = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:05:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [{ ...createSignal, value: { topic: 'Marriage', fresh: true } }],
      existingRecommendations: accepted,
    })

    expect(second.recommendations).toHaveLength(0)
  })
})
