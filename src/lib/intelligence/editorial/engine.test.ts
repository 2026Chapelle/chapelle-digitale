import { validate as validateUuid, version as uuidVersion } from 'uuid'
import { describe, expect, it } from 'vitest'
import type { ContentGraphNode } from '../types/content'
import { buildEditorialRecommendationsForWindow } from './engine'

function liveSource(contentId = 'live_42'): ContentGraphNode {
  return {
    entity: {
      content_id: contentId,
      type: 'live',
      title: 'Teaching from Sunday',
      canonical_slug: 'teaching-from-sunday',
      published_at: '2026-08-24T09:00:00.000Z',
    },
    destinations: [
      {
        content_id: contentId,
        platform: 'youtube',
        external_id: 'yt_42',
        url: 'https://youtube.example/live_42',
      },
    ],
  }
}

function expectUuidV5(batchId: string | null): asserts batchId is string {
  expect(batchId).toEqual(expect.any(String))
  expect(validateUuid(batchId as string)).toBe(true)
  expect(uuidVersion(batchId as string)).toBe(5)
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
    for (const item of result.recommendations) expectUuidV5(item.batchId)
  })

  it('uses deterministic UUID v5 batches scoped to organization, source, and window', () => {
    const input = {
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:00:00.000Z',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      sources: [liveSource()],
      signals: [createSignal],
    }
    const first = buildEditorialRecommendationsForWindow(input)
    const repeated = buildEditorialRecommendationsForWindow(input)
    const sourceBatchId = first.recommendations[0]?.batchId ?? null
    const repeatedSourceBatchId = repeated.recommendations[0]?.batchId ?? null
    const signalBatchId = first.recommendations.at(-1)?.batchId ?? null
    const repeatedSignalBatchId = repeated.recommendations.at(-1)?.batchId ?? null

    expectUuidV5(sourceBatchId)
    expectUuidV5(signalBatchId)
    expect(sourceBatchId).toBe(repeatedSourceBatchId)
    expect(signalBatchId).toBe(repeatedSignalBatchId)

    const differentSource = buildEditorialRecommendationsForWindow({
      ...input,
      sources: [liveSource('live_99')],
      signals: [],
    })
    const differentOrganization = buildEditorialRecommendationsForWindow({
      ...input,
      organizationId: 'org_02',
      signals: [],
    })
    const signalOnly = buildEditorialRecommendationsForWindow({ ...input, sources: [] })
    const repeatedSignalOnly = buildEditorialRecommendationsForWindow({ ...input, sources: [] })
    const differentSourceBatchId = differentSource.recommendations[0]?.batchId ?? null
    const differentOrganizationBatchId = differentOrganization.recommendations[0]?.batchId ?? null
    const signalOnlyBatchId = signalOnly.recommendations[0]?.batchId ?? null
    const repeatedSignalOnlyBatchId = repeatedSignalOnly.recommendations[0]?.batchId ?? null

    expectUuidV5(differentSourceBatchId)
    expectUuidV5(differentOrganizationBatchId)
    expectUuidV5(signalOnlyBatchId)
    expect(differentSourceBatchId).not.toBe(sourceBatchId)
    expect(differentOrganizationBatchId).not.toBe(sourceBatchId)
    expect(signalOnlyBatchId).toBe(repeatedSignalOnlyBatchId)
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
