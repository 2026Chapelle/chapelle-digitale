import { describe, expect, it, vi } from 'vitest'
import type { ContentGraphNode } from '../types/content'
import type { EditorialRecommendation, EditorialSettings } from './contracts'
import { refreshEditorialIntelligence } from './refresh'

const listEditorialRecommendations = vi.fn()
const getEditorialSettings = vi.fn()
const createEditorialRecommendation = vi.fn()
const appendEditorialRecommendationEvent = vi.fn()

function settings(): EditorialSettings {
  return {
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
  }
}

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

function createdRecommendation(id: string): EditorialRecommendation {
  return {
    id,
    organizationId: 'org_01',
    recommendationKind: 'REPURPOSE',
    contentKind: 'article',
    targetChannel: 'web',
    status: 'PROPOSED',
    priorityBand: 'FORTE',
    windowStart: '2026-08-25',
    windowEnd: '2026-08-25',
    scheduledFor: '2026-08-25',
    batchId: 'batch_01',
    parentRecommendationId: null,
    dedupeKey: id,
    sourceContentId: 'live_42',
    sourceContentType: 'live',
    sourceTitle: 'Teaching from Sunday',
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
    createdBy: 'user_01',
    updatedBy: 'user_01',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
  }
}

describe('refreshEditorialIntelligence', () => {
  it('requires the delegated editorial permission for manual domain calls', async () => {
    await expect(
      refreshEditorialIntelligence({
        organizationId: 'org_01',
        nowIso: '2026-08-25T10:00:00.000Z',
        mode: 'manual',
        requestedBy: 'user_01',
        actor: { id: 'user_01', organizationId: 'org_01', permissions: [] },
        machineAuth: null,
        sources: [],
        signals: [],
      }, {
        getSettings: getEditorialSettings,
        listRecommendations: listEditorialRecommendations,
        createRecommendation: createEditorialRecommendation,
        appendEvent: appendEditorialRecommendationEvent,
      }),
    ).rejects.toThrow('editorial-permission-required')
  })

  it('requires server-only machine authentication for scheduled domain calls', async () => {
    await expect(
      refreshEditorialIntelligence({
        organizationId: 'org_01',
        nowIso: '2026-08-25T10:00:00.000Z',
        mode: 'scheduled',
        requestedBy: null,
        actor: null,
        machineAuth: { kind: 'missing' },
        sources: [],
        signals: [],
      }, {
        getSettings: getEditorialSettings,
        listRecommendations: listEditorialRecommendations,
        createRecommendation: createEditorialRecommendation,
        appendEvent: appendEditorialRecommendationEvent,
      }),
    ).rejects.toThrow('machine-auth-required')
  })

  it('creates a capacity-limited set of editorial recommendations and records a refresh event', async () => {
    let persisted: EditorialRecommendation[] = []
    getEditorialSettings.mockResolvedValue(settings())
    listEditorialRecommendations.mockImplementation(async () => persisted)
    createEditorialRecommendation.mockImplementation(async (input: any) => {
      const record = createdRecommendation(input.dedupeKey)
      persisted = [...persisted, record]
      return record
    })
    appendEditorialRecommendationEvent.mockResolvedValue({ id: 'evt_01' })

    const result = await refreshEditorialIntelligence(
      {
        organizationId: 'org_01',
        nowIso: '2026-08-25T10:00:00.000Z',
        mode: 'manual',
        requestedBy: 'user_01',
        actor: { id: 'user_01', organizationId: 'org_01', permissions: ['can_manage_editorial_intelligence'] },
        machineAuth: null,
        sources: [liveSource()],
        signals: [
          {
            key: 'seo:create:article',
            source: 'google_search_console',
            truthState: 'REAL',
            available: true,
            observedAt: '2026-08-25T08:00:00.000Z',
            value: { topic: 'Marriage' },
          },
        ],
      },
      {
        getSettings: getEditorialSettings,
        listRecommendations: listEditorialRecommendations,
        createRecommendation: createEditorialRecommendation,
        appendEvent: appendEditorialRecommendationEvent,
      },
    )

    expect(result.createdCount).toBe(6)
    expect(result.priorityRecommendations).toHaveLength(3)
    expect(createEditorialRecommendation).toHaveBeenCalledTimes(6)
    expect(appendEditorialRecommendationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_01',
        recommendationId: expect.any(String),
        eventType: 'REFRESHED',
      }),
    )
  })

  it('stays idempotent when the same recommendations already exist', async () => {
    let persisted: EditorialRecommendation[] = []
    getEditorialSettings.mockResolvedValue(settings())
    listEditorialRecommendations.mockImplementation(async () => persisted)
    createEditorialRecommendation.mockImplementation(async (input: any) => {
      const record = createdRecommendation(input.dedupeKey)
      persisted = [...persisted, record]
      return record
    })
    appendEditorialRecommendationEvent.mockResolvedValue({ id: 'evt_01' })

    const first = await refreshEditorialIntelligence(
      {
        organizationId: 'org_01',
        nowIso: '2026-08-25T10:00:00.000Z',
        mode: 'manual',
        requestedBy: 'user_01',
        actor: { id: 'user_01', organizationId: 'org_01', permissions: ['can_manage_editorial_intelligence'] },
        machineAuth: null,
        sources: [liveSource()],
        signals: [],
      },
      {
        getSettings: getEditorialSettings,
        listRecommendations: listEditorialRecommendations,
        createRecommendation: createEditorialRecommendation,
        appendEvent: appendEditorialRecommendationEvent,
      },
    )

    const second = await refreshEditorialIntelligence(
      {
        organizationId: 'org_01',
        nowIso: '2026-08-25T10:05:00.000Z',
        mode: 'manual',
        requestedBy: 'user_01',
        actor: { id: 'user_01', organizationId: 'org_01', permissions: ['can_manage_editorial_intelligence'] },
        machineAuth: null,
        sources: [liveSource()],
        signals: [],
      },
      {
        getSettings: getEditorialSettings,
        listRecommendations: listEditorialRecommendations,
        createRecommendation: createEditorialRecommendation,
        appendEvent: appendEditorialRecommendationEvent,
      },
    )

    expect(first.createdCount).toBeGreaterThan(0)
    expect(second.createdCount).toBe(0)
  })
})
