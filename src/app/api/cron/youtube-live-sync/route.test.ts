import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ sync: vi.fn() }))
vi.mock('@/lib/live/youtube-sync-server', () => ({ syncYouTubeLives: mocks.sync }))

import { GET, POST } from './route'
import { isAuthorizedCron } from '@/lib/cron-auth'

const req = (url: string, headers: Record<string, string> = {}) => {
  const r = new Request(url, { headers }) as NextRequest & { nextUrl: URL }
  Object.defineProperty(r, 'nextUrl', { value: new URL(url) })
  return r
}

describe('GET|POST /api/cron/youtube-live-sync', () => {
  const original = process.env.CRON_SECRET
  beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = 'cron-test' })
  afterEach(() => { if (original === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = original })

  it('authenticates ONLY through the x-cron-secret header (no ?token= query parameter)', async () => {
    expect((await GET(req('http://localhost/api/cron/youtube-live-sync?token=cron-test'))).status).toBe(401)
    expect((await POST(req('http://localhost/api/cron/youtube-live-sync?token=cron-test'))).status).toBe(401)
    expect(mocks.sync).not.toHaveBeenCalled()
    expect(isAuthorizedCron({ headers: new Headers({ 'x-cron-secret': 'cron-test' }) })).toBe(true)
    expect(isAuthorizedCron({ headers: new Headers({ 'x-cron-secret': 'cron-tes' }) })).toBe(false)
    expect(isAuthorizedCron({ headers: new Headers({ 'x-cron-secret': 'cron-test-longer' }) })).toBe(false)
    expect(isAuthorizedCron({ headers: new Headers() })).toBe(false)
    expect(isAuthorizedCron({ headers: new Headers({ 'x-cron-secret': '' }) }, '')).toBe(false)
    expect(isAuthorizedCron({ headers: new Headers({ 'x-cron-secret': 'x' }) }, undefined as unknown as string)).toBe(false)
  })

  it('rejects calls without or with a wrong header and never syncs', async () => {
    expect((await GET(req('http://localhost/api/cron/youtube-live-sync'))).status).toBe(401)
    expect((await POST(req('http://localhost/api/cron/youtube-live-sync', { 'x-cron-secret': 'wrong' }))).status).toBe(401)
    delete process.env.CRON_SECRET
    expect((await GET(req('http://localhost/api/cron/youtube-live-sync', { 'x-cron-secret': 'cron-test' }))).status).toBe(401)
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('runs the sync with the header and returns its summary (503 when the pass failed)', async () => {
    mocks.sync.mockResolvedValue({ ok: true, error: null, inserted: 1, updated: 0 })
    const res = await GET(req('http://localhost/api/cron/youtube-live-sync', { 'x-cron-secret': 'cron-test' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    await expect(res.json()).resolves.toMatchObject({ ok: true, inserted: 1 })
    expect(mocks.sync).toHaveBeenCalledWith({ trigger: 'cron' })
    mocks.sync.mockResolvedValue({ ok: false, error: 'youtube_live_403' })
    expect((await POST(req('http://localhost/api/cron/youtube-live-sync', { 'x-cron-secret': 'cron-test' }))).status).toBe(503)
  })

  it('source contract: no query-string secret, constant-time comparison', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/api/cron/youtube-live-sync/route.ts'), 'utf8')
    expect(source).not.toContain("searchParams.get('token')")
    expect(source).toContain("import { isAuthorizedCron } from '@/lib/cron-auth'")
    expect(readFileSync(resolve(process.cwd(), 'src/lib/cron-auth.ts'), 'utf8')).toContain('timingSafeEqual')
  })
})
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
