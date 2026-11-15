import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ isAdmin: vi.fn(), diagnostics: vi.fn() }))

vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: mocks.isAdmin }))
vi.mock('@/lib/live/canonical-server', () => ({ getCanonicalLiveDiagnostics: mocks.diagnostics }))

import { GET } from './route'

const request = () => new Request('http://localhost/api/admin/live/diagnostics') as NextRequest

describe('GET /api/admin/live/diagnostics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects non-admin requests without leaking any diagnostic', async () => {
    mocks.isAdmin.mockReturnValue(false)
    const res = await GET(request())
    expect(res.status).toBe(401)
    expect(mocks.diagnostics).not.toHaveBeenCalled()
  })

  it('returns the non-sensitive diagnostic to administrators', async () => {
    mocks.isAdmin.mockReturnValue(true)
    mocks.diagnostics.mockResolvedValue({ state: { status: 'OFFLINE' }, source: 'none', youtubeError: 'youtube_oauth_invalid_grant', youtube: { oauthConfigured: true, channelIdConfigured: false, lastError: 'youtube_oauth_invalid_grant', lastCheckedAt: null, cachedStatus: 'OFFLINE', cacheExpiresAt: null }, policy: { cmsLiveMaxHours: 8, cmsVerifiedAgainstYouTube: false }, checkedAt: '2026-11-15T10:00:00.000Z' })
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    await expect(res.json()).resolves.toMatchObject({ ok: true, youtubeError: 'youtube_oauth_invalid_grant', policy: { cmsLiveMaxHours: 8 } })
  })

  it('fails closed on internal errors', async () => {
    mocks.isAdmin.mockReturnValue(true)
    mocks.diagnostics.mockRejectedValue(new Error('boom'))
    expect((await GET(request())).status).toBe(500)
  })
})
