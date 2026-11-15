import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ isAdmin: vi.fn(), sync: vi.fn(), status: vi.fn() }))
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: mocks.isAdmin }))
vi.mock('@/lib/live/youtube-sync-server', () => ({ syncYouTubeLives: mocks.sync, getYouTubeSyncStatus: mocks.status }))

import { GET, POST } from './route'
const request = (method = 'GET') => new Request('http://localhost/api/admin/live/sync', { method }) as NextRequest

describe('/api/admin/live/sync', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires the admin session for status and relaunch', async () => {
    mocks.isAdmin.mockReturnValue(false)
    expect((await GET(request())).status).toBe(401)
    expect((await POST(request('POST'))).status).toBe(401)
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('returns the sync status to administrators', async () => {
    mocks.isAdmin.mockReturnValue(true)
    mocks.status.mockResolvedValue({ configured: true, lastRun: null, states: { scheduled: 1, live: 0, replayPending: 0, replayAvailable: 3 } })
    const res = await GET(request())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, states: { replayAvailable: 3 } })
  })

  it('relaunches the sync manually and reports failures with 503', async () => {
    mocks.isAdmin.mockReturnValue(true)
    mocks.sync.mockResolvedValue({ ok: true, inserted: 0, updated: 2, error: null })
    expect((await POST(request('POST'))).status).toBe(200)
    expect(mocks.sync).toHaveBeenCalledWith({ trigger: 'admin' })
    mocks.sync.mockResolvedValue({ ok: false, error: 'youtube_oauth_invalid_grant' })
    expect((await POST(request('POST'))).status).toBe(503)
  })
})
