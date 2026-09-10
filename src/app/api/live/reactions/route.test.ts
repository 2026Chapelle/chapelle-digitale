import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), record: vi.fn() }))

vi.mock('@/lib/live/live-reactions-server', () => ({
  getLiveReactionSnapshot: mocks.snapshot,
  recordLiveReaction: mocks.record,
}))
vi.mock('@/lib/site-url', () => ({ SITE_URL: 'https://loopback.test' }))

import { GET, POST } from './route'

const LIVE = 'youtube:ABCDEFGHIJK'
const OPEN = {
  ok: true as const, live: true as const, state: 'open' as const, liveKey: LIVE,
  uniqueByType: { prayer: 1, fire: 2, heart: 0, praise: 0, kingdom: 0 },
  serverTime: '2026-09-10T10:00:00.000Z',
}
const ACCEPTED = {
  ok: true as const, liveKey: LIVE,
  event: { eventId: '11111111-1111-4111-8111-111111111111', reaction: 'fire', acceptedAt: '2026-09-10T10:00:00.000Z' },
  remaining: 2,
}

function post(overrides: { url?: string; headers?: Record<string, string | undefined>; body?: string } = {}) {
  const headers = new Headers({
    Origin: 'https://loopback.test',
    'Content-Type': 'application/json',
    'X-Live-Context': LIVE,
  })

  for (const [name, value] of Object.entries(overrides.headers ?? {})) {
    if (value === undefined) headers.delete(name)
    else headers.set(name, value)
  }

  return new NextRequest(overrides.url ?? 'https://loopback.test/api/live/reactions', {
    method: 'POST',
    headers,
    body: overrides.body ?? '{"reaction":"fire"}',
  })
}

async function responseBody(response: Response) {
  expect(response.headers.get('Cache-Control')).toMatch(/no-store/i)
  return response.json()
}

describe('LIVE reaction public API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.snapshot.mockResolvedValue(OPEN)
    mocks.record.mockResolvedValue(ACCEPTED)
  })

  it('gets the canonical snapshot with no selector and projects only public counts', async () => {
    const response = await GET(new NextRequest('https://loopback.test/api/live/reactions'))
    expect(response.status).toBe(200)
    await expect(responseBody(response)).resolves.toEqual(OPEN)
    expect(mocks.snapshot).toHaveBeenCalledOnce()
  })

  it.each(['?liveKey=youtube%3AABCDEFGHIJK', '?video=ABCDEFGHIJK', '?id=x', '?anything='])('rejects every non-empty query without snapshot work: %s', async (query) => {
    const response = await GET(new NextRequest(`https://loopback.test/api/live/reactions${query}`))
    expect(response.status).toBe(400)
    await expect(responseBody(response)).resolves.toEqual({ ok: false, reason: 'invalid_request' })
    expect(mocks.snapshot).not.toHaveBeenCalled()
  })

  it.each([
    [{ ok: true, live: false, state: 'not_live' }, 200],
    [{ ok: true, live: false, state: 'closed' }, 200],
    [{ ok: false, reason: 'unavailable' }, 503],
  ])('maps unavailable and non-open snapshot state', async (result, status) => {
    mocks.snapshot.mockResolvedValue(result)
    const response = await GET(new NextRequest('https://loopback.test/api/live/reactions'))
    expect(response.status).toBe(status)
    await expect(responseBody(response)).resolves.toEqual(result)
  })

  it('fails closed for malformed snapshot engine data without leaking private totals', async () => {
    mocks.snapshot.mockResolvedValue({ ok: true, live: true, totalActions: 99, identity: 'guest:secret' })
    const response = await GET(new NextRequest('https://loopback.test/api/live/reactions'))
    expect(response.status).toBe(503)
    await expect(responseBody(response)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it.each([
    ['missing Origin', { Origin: undefined }, 403, 'forbidden_origin'],
    ['null Origin', { Origin: 'null' }, 403, 'forbidden_origin'],
    ['foreign Origin', { Origin: 'https://evil.test' }, 403, 'forbidden_origin'],
    ['cross-site metadata', { 'Sec-Fetch-Site': 'cross-site' }, 403, 'forbidden_origin'],
    ['Host spoofing', { Origin: 'https://evil.test', Host: 'loopback.test' }, 403, 'forbidden_origin'],
    ['missing context', { 'X-Live-Context': '' }, 400, 'invalid_request'],
    ['malformed context', { 'X-Live-Context': 'youtube:bad' }, 400, 'invalid_request'],
    ['duplicate context', { 'X-Live-Context': `${LIVE}, ${LIVE}` }, 400, 'invalid_request'],
    ['wrong media type', { 'Content-Type': 'text/plain' }, 400, 'invalid_request'],
  ])('enforces POST gate: %s', async (_label, headers, status, reason) => {
    const response = await POST(post({ headers }))
    expect(response.status).toBe(status)
    await expect(responseBody(response)).resolves.toEqual({ ok: false, reason })
    expect(mocks.record).not.toHaveBeenCalled()
  })

  it('passes the canonical context solely as the engine stale-context precondition', async () => {
    const response = await POST(post({ body: '{"reaction":"sparkle","guestSessionId":"guest"}' }))
    expect(response.status).toBe(400)
    await responseBody(response)
    expect(mocks.record).toHaveBeenCalledWith({ reaction: 'sparkle', guestSessionId: 'guest', expectedLiveKey: LIVE })
  })

  it('returns an accepted engine result without identity or statistics', async () => {
    const response = await POST(post())
    expect(response.status).toBe(200)
    await expect(responseBody(response)).resolves.toEqual(ACCEPTED)
    expect(mocks.record).toHaveBeenCalledWith({ reaction: 'fire', expectedLiveKey: LIVE })
  })

  it.each([
    [{ ok: false, reason: 'invalid_request' }, 400, { ok: false, reason: 'invalid_request' }],
    [{ ok: false, reason: 'identity_required' }, 400, { ok: false, reason: 'identity_required' }],
    [{ ok: false, reason: 'not_live' }, 409, { ok: false, reason: 'not_live' }],
    [{ ok: false, reason: 'live_changed' }, 409, { ok: false, reason: 'live_changed' }],
    [{ ok: false, reason: 'closed' }, 409, { ok: false, reason: 'closed' }],
    [{ ok: false, reason: 'unavailable' }, 503, { ok: false, reason: 'unavailable' }],
    [{ ok: false, reason: 'unexpected' }, 503, { ok: false, reason: 'unavailable' }],
    [null, 503, { ok: false, reason: 'unavailable' }],
  ])('maps engine failures safely', async (result, status, body) => {
    mocks.record.mockResolvedValue(result)
    const response = await POST(post())
    expect(response.status).toBe(status)
    await expect(responseBody(response)).resolves.toEqual(body)
  })

  it('preserves valid retry duration and uses ceiling seconds in Retry-After', async () => {
    mocks.record.mockResolvedValue({ ok: false, reason: 'rate_limited', retryAfterMs: 1001 })
    const response = await POST(post())
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('2')
    await expect(responseBody(response)).resolves.toEqual({ ok: false, reason: 'rate_limited', retryAfterMs: 1001 })
  })

  it('fails closed for malformed accepted engine output and never returns private engine data', async () => {
    mocks.record.mockResolvedValue({ ok: true, identity: 'member:secret', totalActions: 9 })
    const response = await POST(post())
    expect(response.status).toBe(503)
    await expect(responseBody(response)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })
})
