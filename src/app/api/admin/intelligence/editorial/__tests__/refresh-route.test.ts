import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveEditorialWorkspaceAccess: vi.fn(),
  refreshEditorialIntelligence: vi.fn(),
}))

const { resolveEditorialWorkspaceAccess, refreshEditorialIntelligence } = mocks

vi.mock('@/lib/intelligence/editorial/permissions', () => ({
  resolveEditorialWorkspaceAccess: (...args: unknown[]) => resolveEditorialWorkspaceAccess(...args),
}))

vi.mock('@/lib/intelligence/editorial/refresh', () => ({
  refreshEditorialIntelligence: (...args: unknown[]) => refreshEditorialIntelligence(...args),
}))

import { POST } from '../refresh/route'

function req(url: string, body?: unknown, secret?: string) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(secret ? { 'x-editorial-refresh-secret': secret } : {}),
    },
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
  refreshEditorialIntelligence.mockResolvedValue({
    organizationId: 'org_01',
    mode: 'manual',
    windowStart: '2026-08-25',
    windowEnd: '2026-08-25',
    signalSignature: 'sig',
    createdCount: 1,
    recommendations: [],
    priorityRecommendations: [],
  })
  process.env.EDITORIAL_REFRESH_SECRET = 'cron-secret'
})

describe('POST /api/admin/intelligence/editorial/refresh', () => {
  it('delegates manual refresh for authorized editorial users', async () => {
    const res = await POST(req('http://localhost/api/admin/intelligence/editorial', { nowIso: '2026-08-25T10:00:00.000Z' }))

    expect(res.status).toBe(200)
    expect(resolveEditorialWorkspaceAccess).toHaveBeenCalledWith(expect.any(NextRequest), 'write')
    expect(refreshEditorialIntelligence).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_01',
        mode: 'manual',
        requestedBy: 'user_01',
      }),
    )
  })

  it('does not accept client-provided sources or signals as editorial evidence', async () => {
    await POST(req('http://localhost/api/admin/intelligence/editorial/refresh', {
      sources: [{ entity: { content_id: 'fake', type: 'live', title: 'fake' } }],
      signals: [{ key: 'fake', truthState: 'REAL', available: true }],
    }))

    expect(refreshEditorialIntelligence).toHaveBeenCalledWith(expect.objectContaining({
      sources: [],
      signals: [],
    }))
  })

})
