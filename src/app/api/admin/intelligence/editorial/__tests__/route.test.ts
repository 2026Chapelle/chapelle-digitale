import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveEditorialWorkspaceAccess: vi.fn(),
  canWriteEditorialIntelligence: vi.fn(),
  listEditorialRecommendations: vi.fn(),
  getEditorialSettings: vi.fn(),
  getEditorialRecommendation: vi.fn(),
  patchEditorialRecommendation: vi.fn(),
  appendEditorialRecommendationEvent: vi.fn(),
  upsertEditorialSettings: vi.fn(),
}))

const {
  resolveEditorialWorkspaceAccess,
  canWriteEditorialIntelligence,
  listEditorialRecommendations,
  getEditorialSettings,
  getEditorialRecommendation,
  patchEditorialRecommendation,
  appendEditorialRecommendationEvent,
  upsertEditorialSettings,
} = mocks

vi.mock('@/lib/intelligence/editorial/permissions', () => ({
  resolveEditorialWorkspaceAccess: (...args: unknown[]) => resolveEditorialWorkspaceAccess(...args),
  canWriteEditorialIntelligence: (...args: unknown[]) => canWriteEditorialIntelligence(...args),
}))

vi.mock('@/lib/intelligence/editorial/store', () => ({
  listEditorialRecommendations: (...args: unknown[]) => listEditorialRecommendations(...args),
  getEditorialSettings: (...args: unknown[]) => getEditorialSettings(...args),
  getEditorialRecommendation: (...args: unknown[]) => getEditorialRecommendation(...args),
  patchEditorialRecommendation: (...args: unknown[]) => patchEditorialRecommendation(...args),
  appendEditorialRecommendationEvent: (...args: unknown[]) => appendEditorialRecommendationEvent(...args),
  upsertEditorialSettings: (...args: unknown[]) => upsertEditorialSettings(...args),
}))

import { GET as GET_EDITORIAL } from '../route'
import { PATCH as PATCH_EDITORIAL } from '../[recommendationId]/route'
import { GET as GET_SETTINGS, PATCH as PATCH_SETTINGS } from '../settings/route'

function req(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveEditorialWorkspaceAccess.mockResolvedValue({
    actor: { memberships: [{ unit_role: 'world_admin' }], highestRole: 'world_admin' },
    profileRole: 'editorial_manager',
    organizationId: 'org_01',
    userId: 'user_01',
    email: 'editor@example.com',
  })
  canWriteEditorialIntelligence.mockReturnValue(true)
  listEditorialRecommendations.mockResolvedValue([
    {
      id: 'rec_01',
      organizationId: 'org_01',
      recommendationKind: 'REPURPOSE',
      contentKind: 'article',
      targetChannel: 'whatsapp',
      status: 'ACCEPTED',
      priorityBand: 'FORTE',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      scheduledFor: '2026-08-28',
      batchId: 'batch_01',
      parentRecommendationId: null,
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
      performanceSnapshot: { score: 91, dimensions: { mission: 90 } },
      createdBy: 'user_01',
      updatedBy: 'user_02',
      createdAt: '2026-08-25T10:00:00.000Z',
      updatedAt: '2026-08-25T10:00:00.000Z',
    },
    {
      id: 'rec_02',
      organizationId: 'org_01',
      recommendationKind: 'PROMOTE',
      contentKind: 'whatsapp',
      targetChannel: 'facebook',
      status: 'PROPOSED',
      priorityBand: 'NORMALE',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      scheduledFor: '2026-08-29',
      batchId: 'batch_02',
      parentRecommendationId: null,
      sourceContentId: 'art_01',
      sourceContentType: 'article',
      sourceTitle: 'Article',
      sourceSnapshot: {},
      signals: [],
      why: ['watch'],
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
      createdBy: 'user_03',
      updatedBy: 'user_04',
      createdAt: '2026-08-25T10:00:00.000Z',
      updatedAt: '2026-08-25T10:00:00.000Z',
    },
  ])
  getEditorialSettings.mockResolvedValue({
    organizationId: 'org_01',
    timezone: 'Africa/Abidjan',
    refreshMode: 'manual',
    refreshTimeLocal: null,
    weeklyCapacity: { weeklyTotal: 10, family: {}, channel: {}, contentKind: {} },
    manualRefreshEnabled: true,
    channelCapacity: {},
    contentKindCapacity: {},
    createdBy: 'user_01',
    updatedBy: 'user_01',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
  })
  getEditorialRecommendation.mockResolvedValue({
    id: 'rec_01',
    organizationId: 'org_01',
    recommendationKind: 'REPURPOSE',
    contentKind: 'article',
    targetChannel: 'whatsapp',
    status: 'PROPOSED',
    priorityBand: 'NORMALE',
    windowStart: '2026-08-25',
    windowEnd: '2026-08-31',
    scheduledFor: '2026-08-28',
    batchId: 'batch_01',
    parentRecommendationId: null,
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
    createdBy: 'user_01',
    updatedBy: 'user_02',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
  })
  patchEditorialRecommendation.mockResolvedValue({
    id: 'rec_01',
    organizationId: 'org_01',
    recommendationKind: 'REPURPOSE',
    contentKind: 'article',
    targetChannel: 'whatsapp',
    status: 'ACCEPTED',
    priorityBand: 'NORMALE',
    windowStart: '2026-08-25',
    windowEnd: '2026-08-31',
    scheduledFor: '2026-08-28',
    batchId: 'batch_01',
    parentRecommendationId: null,
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
    lastHumanActionAt: '2026-08-25T12:00:00.000Z',
    acceptedAt: '2026-08-25T12:00:00.000Z',
    scheduledAt: null,
    completedAt: null,
    rejectedAt: null,
    archivedAt: null,
    performanceSnapshot: {},
    createdBy: 'user_01',
    updatedBy: 'user_01',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T12:00:00.000Z',
  })
  appendEditorialRecommendationEvent.mockResolvedValue({ id: 'evt_01' })
  upsertEditorialSettings.mockResolvedValue({
    organizationId: 'org_01',
    timezone: 'Africa/Abidjan',
    refreshMode: 'daily',
    refreshTimeLocal: '08:00',
    weeklyCapacity: { weeklyTotal: 10, family: {}, channel: {}, contentKind: {} },
    manualRefreshEnabled: true,
    channelCapacity: {},
    contentKindCapacity: {},
    createdBy: 'user_01',
    updatedBy: 'user_01',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T12:00:00.000Z',
  })
})

describe('GET /api/admin/intelligence/editorial', () => {
  it('redacts actor identifiers and preserves the calendar read model', async () => {
    const res = await GET_EDITORIAL(req('GET', 'http://localhost/api/admin/intelligence/editorial'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.organizationId).toBe('org_01')
    expect(json.data.recommendations[0].createdBy).toBeUndefined()
    expect(json.data.recommendations[0].updatedBy).toBeUndefined()
    expect(json.data.recommendations[0].performanceSnapshot.score).toBeUndefined()
    expect(json.data.recommendations[0].performanceSnapshot.dimensions).toEqual({ mission: 90 })
    expect(json.data.calendar.items).toHaveLength(1)
    expect(JSON.stringify(json)).not.toContain('user_01')
    expect(JSON.stringify(json)).not.toContain('user_02')
  })
})

describe('PATCH /api/admin/intelligence/editorial/:id', () => {
  it('accepts a valid lifecycle transition and appends the audit event', async () => {
    const res = await PATCH_EDITORIAL(
      req('PATCH', 'http://localhost/api/admin/intelligence/editorial/rec_01', { status: 'ACCEPTED' }),
      { params: { recommendationId: 'rec_01' } },
    )

    expect(res.status).toBe(200)
    expect(patchEditorialRecommendation).toHaveBeenCalledWith(
      'org_01',
      'rec_01',
      expect.objectContaining({
        status: 'ACCEPTED',
        updatedBy: 'user_01',
      }),
    )
    expect(appendEditorialRecommendationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_01',
        recommendationId: 'rec_01',
        eventType: 'ACCEPTED',
      }),
    )
    const json = await res.json()
    expect(json.data.recommendation.createdBy).toBeUndefined()
  })

  it('rejects an invalid transition', async () => {
    getEditorialRecommendation.mockResolvedValueOnce({
      id: 'rec_01',
      organizationId: 'org_01',
      recommendationKind: 'REPURPOSE',
      contentKind: 'article',
      targetChannel: 'whatsapp',
      status: 'COMPLETED',
      priorityBand: 'NORMALE',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      scheduledFor: '2026-08-28',
      batchId: 'batch_01',
      parentRecommendationId: null,
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
      completedAt: '2026-08-25T12:00:00.000Z',
      rejectedAt: null,
      archivedAt: null,
      performanceSnapshot: {},
      createdBy: 'user_01',
      updatedBy: 'user_02',
      createdAt: '2026-08-25T10:00:00.000Z',
      updatedAt: '2026-08-25T12:00:00.000Z',
    })

    const res = await PATCH_EDITORIAL(
      req('PATCH', 'http://localhost/api/admin/intelligence/editorial/rec_01', { status: 'PROPOSED' }),
      { params: { recommendationId: 'rec_01' } },
    )

    expect(res.status).toBe(400)
  })
})

describe('GET/PATCH /api/admin/intelligence/editorial/settings', () => {
  it('reads settings', async () => {
    const res = await GET_SETTINGS(req('GET', 'http://localhost/api/admin/intelligence/editorial/settings'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.settings.organizationId).toBe('org_01')
  })

  it('updates settings', async () => {
    const res = await PATCH_SETTINGS(
      req('PATCH', 'http://localhost/api/admin/intelligence/editorial/settings', {
        refreshMode: 'daily',
        timezone: 'Africa/Abidjan',
        weeklyCapacity: { weeklyTotal: 10, family: {}, channel: {}, contentKind: {} },
      }),
    )

    expect(res.status).toBe(200)
    expect(upsertEditorialSettings).toHaveBeenCalled()
    const json = await res.json()
    expect(json.data.settings.refreshMode).toBe('daily')
  })
})
