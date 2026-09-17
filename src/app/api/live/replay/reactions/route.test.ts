import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => {
  class IdentityError extends Error {
    reason: 'identity_required' | 'unavailable'

    constructor(reason: 'identity_required' | 'unavailable') {
      super(reason)
      this.reason = reason
      this.name = 'ReplayReactionIdentityError'
    }
  }

  return {
    IdentityError,
    resolveIdentity: vi.fn(),
    getSnapshot: vi.fn(),
    putReaction: vi.fn(),
    deleteReaction: vi.fn(),
    rateLimit: vi.fn(),
    clientIp: vi.fn(),
  }
})

vi.mock('@/lib/live/live-replay-reaction-identity', () => ({
  LIVE_REPLAY_GUEST_COOKIE: 'citadelle_replay_guest_v1',
  ReplayReactionIdentityError: mocks.IdentityError,
  resolveReplayReactionIdentity: mocks.resolveIdentity,
}))

vi.mock('@/lib/live/live-replay-reactions-server', () => ({
  getReplayReactionSnapshot: mocks.getSnapshot,
  putReplayReaction: mocks.putReaction,
  deleteReplayReaction: mocks.deleteReaction,
}))

vi.mock('@/lib/live/live-replay-reactions', () => ({
  isLiveReplayReaction: (value: unknown) =>
    ['amen', 'receive', 'glory', 'thanks'].includes(String(value)),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: mocks.clientIp,
}))

vi.mock('@/lib/site-url', () => ({
  SITE_URL: 'https://citadelle.test',
}))

import { DELETE, GET, PUT } from './route'

const CMS_ID = '11111111-1111-4111-8111-111111111111'
const GUEST_TOKEN = 'a'.repeat(43)
const guestIdentity = {
  kind: 'guest' as const,
  actorKey: `guest:${'b'.repeat(64)}`,
  userId: null,
  guestActorKey: `guest:${'b'.repeat(64)}`,
}
const snapshot = {
  enabled: true,
  selectedReaction: 'amen' as const,
  counts: { amen: 2, receive: 1, glory: 0, thanks: 3 },
}

function request(
  method: 'GET' | 'PUT' | 'DELETE',
  body?: unknown,
  options: {
    origin?: string | null
    secFetchSite?: string
    contentType?: string
    query?: string
  } = {},
) {
  const headers = new Headers()
  if (method !== 'GET') {
    headers.set('content-type', options.contentType ?? 'application/json')
    headers.set('sec-fetch-site', options.secFetchSite ?? 'same-origin')
    const origin = options.origin === undefined ? 'https://citadelle.test' : options.origin
    if (origin !== null) headers.set('origin', origin)
  }

  return new NextRequest(
    `http://127.0.0.1:3000/api/live/replay/reactions${options.query ?? ''}`,
    {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  )
}

async function expectNoStore(response: Response) {
  expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
}

describe('LIVE 4C replay reaction public route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveIdentity.mockResolvedValue({
      identity: guestIdentity,
      newGuestToken: null,
    })
    mocks.getSnapshot.mockResolvedValue({ ok: true, snapshot })
    mocks.putReaction.mockResolvedValue({ ok: true, snapshot })
    mocks.deleteReaction.mockResolvedValue({
      ok: true,
      snapshot: { ...snapshot, selectedReaction: null },
    })
    mocks.rateLimit.mockReturnValue({ ok: true, remaining: 29, retryAfterSec: 0 })
    mocks.clientIp.mockReturnValue('203.0.113.9')
  })

  it('GET returns the flattened snapshot with all four counts and no-store', async () => {
    const response = await GET(request('GET', undefined, { query: `?cmsLiveId=${CMS_ID}` }))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, ...snapshot })
    await expectNoStore(response)
    expect(mocks.resolveIdentity).toHaveBeenCalledOnce()
    expect(mocks.getSnapshot).toHaveBeenCalledWith(CMS_ID, guestIdentity)
  })

  it.each([
    '?cmsLiveId=bad',
    `?cmsLiveId=${CMS_ID}&extra=1`,
    `?cmsLiveId=${CMS_ID}&cmsLiveId=${CMS_ID}`,
  ])('GET rejects invalid query %s with 400', async (query) => {
    const response = await GET(request('GET', undefined, { query }))
    expect(response.status).toBe(400)
    await expectNoStore(response)
    expect(mocks.resolveIdentity).not.toHaveBeenCalled()
  })

  it.each([
    ['missing Origin', null, 'same-origin'],
    ['null Origin', 'null', 'same-origin'],
    ['foreign Origin', 'https://evil.test', 'same-origin'],
    ['cross-site metadata', 'https://citadelle.test', 'cross-site'],
  ])('PUT rejects %s with 403', async (_label, origin, secFetchSite) => {
    const response = await PUT(request('PUT', { cmsLiveId: CMS_ID, reaction: 'amen' }, {
      origin,
      secFetchSite,
    }))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'invalid_origin' })
    await expectNoStore(response)
    expect(mocks.resolveIdentity).not.toHaveBeenCalled()
  })

  it('PUT rejects wrong content type and invalid reaction/body keys with 400', async () => {
    const wrongType = await PUT(request('PUT', { cmsLiveId: CMS_ID, reaction: 'amen' }, {
      contentType: 'text/plain',
    }))
    expect(wrongType.status).toBe(400)

    const wrongReaction = await PUT(request('PUT', { cmsLiveId: CMS_ID, reaction: 'fire' }))
    expect(wrongReaction.status).toBe(400)

    const extraKey = await PUT(request('PUT', { cmsLiveId: CMS_ID, reaction: 'amen', userId: 'x' }))
    expect(extraKey.status).toBe(400)

    expect(mocks.resolveIdentity).not.toHaveBeenCalled()
  })

  it('DELETE requires the exact cmsLiveId-only JSON shape', async () => {
    const bad = await DELETE(request('DELETE', { cmsLiveId: CMS_ID, guestToken: GUEST_TOKEN }))
    expect(bad.status).toBe(400)
    expect(mocks.resolveIdentity).not.toHaveBeenCalled()
  })

  it('maps identity_required to 401 and dependency identity failure to 503', async () => {
    mocks.resolveIdentity.mockRejectedValueOnce(new mocks.IdentityError('identity_required'))
    const unauth = await GET(request('GET', undefined, { query: `?cmsLiveId=${CMS_ID}` }))
    expect(unauth.status).toBe(401)

    mocks.resolveIdentity.mockRejectedValueOnce(new mocks.IdentityError('unavailable'))
    const unavailable = await GET(request('GET', undefined, { query: `?cmsLiveId=${CMS_ID}` }))
    expect(unavailable.status).toBe(503)
  })

  it('sets a private guest cookie only when a new token is returned', async () => {
    mocks.resolveIdentity.mockResolvedValueOnce({
      identity: guestIdentity,
      newGuestToken: GUEST_TOKEN,
    })

    const response = await GET(request('GET', undefined, { query: `?cmsLiveId=${CMS_ID}` }))
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('citadelle_replay_guest_v1=')
    expect(cookie.toLowerCase()).toContain('httponly')
    expect(cookie.toLowerCase()).toContain('samesite=lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('Max-Age=31536000')
  })

  it('rate-limits PUT separately by actor and IP at 30/minute', async () => {
    const response = await PUT(request('PUT', { cmsLiveId: CMS_ID, reaction: 'receive' }))
    expect(response.status).toBe(200)

    expect(mocks.rateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^replay-reaction:actor:/),
      { limit: 30, windowMs: 60_000 },
    )
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      'replay-reaction:ip:203.0.113.9',
      { limit: 30, windowMs: 60_000 },
    )
    expect(mocks.putReaction).toHaveBeenCalledWith(CMS_ID, 'receive', guestIdentity)
  })

  it('returns 429 before mutation when either mutation limiter is exceeded', async () => {
    mocks.rateLimit
      .mockReturnValueOnce({ ok: false, remaining: 0, retryAfterSec: 23 })
      .mockReturnValueOnce({ ok: true, remaining: 29, retryAfterSec: 0 })

    const response = await PUT(request('PUT', { cmsLiveId: CMS_ID, reaction: 'amen' }))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('23')
    expect(mocks.putReaction).not.toHaveBeenCalled()
  })

  it.each([
    ['not_replay', 404],
    ['unavailable', 503],
  ] as const)('maps server %s to %s', async (reason, status) => {
    mocks.getSnapshot.mockResolvedValueOnce({ ok: false, reason })
    const response = await GET(request('GET', undefined, { query: `?cmsLiveId=${CMS_ID}` }))
    expect(response.status).toBe(status)
    await expectNoStore(response)
  })

  it('maps disabled mutation to 403', async () => {
    mocks.putReaction.mockResolvedValueOnce({ ok: false, reason: 'disabled' })
    const response = await PUT(request('PUT', { cmsLiveId: CMS_ID, reaction: 'amen' }))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'disabled' })
  })

  it('DELETE succeeds, resolves identity once, and returns all four counts', async () => {
    const response = await DELETE(request('DELETE', { cmsLiveId: CMS_ID }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      ok: true,
      enabled: true,
      selectedReaction: null,
      counts: { amen: 2, receive: 1, glory: 0, thanks: 3 },
    })
    expect(mocks.resolveIdentity).toHaveBeenCalledOnce()
    expect(mocks.deleteReaction).toHaveBeenCalledWith(CMS_ID, guestIdentity)
  })
})
