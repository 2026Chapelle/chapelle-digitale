import { describe, expect, it } from 'vitest'
import type { ContentGraphNode } from '../types/content'
import { prepareEditorialWeek } from './prepare-week'

function liveSource(): ContentGraphNode {
  return {
    entity: {
      content_id: 'live_42',
      type: 'live',
      title: 'Teaching from Sunday',
      canonical_slug: 'teaching-from-sunday',
      published_at: '2026-08-24T09:00:00.000Z',
    },
    destinations: [],
  }
}

describe('prepareEditorialWeek', () => {
  it('builds a 7-day preview without auto-accepting recommendations', () => {
    const result = prepareEditorialWeek({
      organizationId: 'org_01',
      nowIso: '2026-08-25T10:00:00.000Z',
      sources: [liveSource()],
      signals: [],
      settings: {
        organizationId: 'org_01',
        timezone: 'Africa/Abidjan',
        refreshMode: 'manual',
        refreshTimeLocal: null,
        weeklyCapacity: { weeklyTotal: 3, family: {}, channel: {}, contentKind: {} },
        manualRefreshEnabled: true,
        channelCapacity: {},
        contentKindCapacity: {},
        createdBy: null,
        updatedBy: null,
        createdAt: '2026-08-25T10:00:00.000Z',
        updatedAt: '2026-08-25T10:00:00.000Z',
      },
    })

    expect(result.windowStart).toBe('2026-08-25')
    expect(result.windowEnd).toBe('2026-08-31')
    expect(result.recommendations).toHaveLength(5)
    expect(result.priorityRecommendations).toHaveLength(3)
    expect(result.recommendations.every((item) => item.status === 'PROPOSED')).toBe(true)
  })
})

