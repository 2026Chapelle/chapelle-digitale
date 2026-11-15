import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ sync: vi.fn() }))
vi.mock('@/lib/live/youtube-sync-server', () => ({ syncYouTubeLives: mocks.sync }))

import { GET, POST } from './route'

const req = (url: string, headers: Record<string, string> = {}) => {
  const r = new Request(url, { headers }) as NextRequest & { nextUrl: URL }
  Object.defineProperty(r, 'nextUrl', { value: new URL(url) })
  return r
}

describe('GET|POST /api/cron/youtube-live-sync', () => {
  const original = process.env.CRON_SECRET
  beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = 'cron-test' })
  afterEach(() => { if (original === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = original })

  it('rejects calls without the cron secret and never syncs', async () => {
    expect((await GET(req('http://localhost/api/cron/youtube-live-sync'))).status).toBe(401)
    expect((await POST(req('http://localhost/api/cron/youtube-live-sync', { 'x-cron-secret': 'wrong' }))).status).toBe(401)
    delete process.env.CRON_SECRET
    expect((await GET(req('http://localhost/api/cron/youtube-live-sync?token=cron-test'))).status).toBe(401)
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('runs the sync with the header or the token and returns its summary', async () => {
    mocks.sync.mockResolvedValue({ ok: true, error: null, inserted: 1, updated: 0 })
    const res = await GET(req('http://localhost/api/cron/youtube-live-sync', { 'x-cron-secret': 'cron-test' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    await expect(res.json()).resolves.toMatchObject({ ok: true, inserted: 1 })
    expect(mocks.sync).toHaveBeenCalledWith({ trigger: 'cron' })
    mocks.sync.mockResolvedValue({ ok: false, error: 'youtube_live_403' })
    expect((await POST(req('http://localhost/api/cron/youtube-live-sync?token=cron-test'))).status).toBe(503)
  })
})
