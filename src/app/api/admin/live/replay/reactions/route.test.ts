import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  isAdminRequest: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  rateLimit: vi.fn(),
  clientIp: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest: mocks.isAdminRequest,
}))

vi.mock('@/lib/live/live-replay-reaction-admin-server', () => ({
  listManageableReplayReactionSettings: mocks.list,
  updateReplayReactionGovernance: mocks.update,
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: mocks.clientIp,
}))

vi.mock('@/lib/site-url', () => ({
  SITE_URL: 'https://citadelle.test',
}))

import { GET, PATCH } from './route'

const LIVE_ID = '22222222-2222-4222-8222-222222222222'
const ORG_ID = '11111111-1111-4111-8111-111111111111'
const UNIT_ID = '33333333-3333-4333-8333-333333333333'

const payload = {
  cmsLiveId: LIVE_ID,
  enabled: true,
  organizationId: ORG_ID,
  organizationUnitId: UNIT_ID,
}

function request(
  method: 'GET' | 'PATCH',
  body?: unknown,
  options: {
    origin?: string | null
    secFetchSite?: string
    contentType?: string
    query?: string
  } = {},
) {
  const headers = new Headers()
  if (method === 'PATCH') {
    headers.set('content-type', options.contentType ?? 'application/json')
    headers.set('sec-fetch-site', options.secFetchSite ?? 'same-origin')
    const origin = options.origin === undefined ? 'https://citadelle.test' : options.origin
    if (origin !== null) headers.set('origin', origin)
  }

  return new NextRequest(
    `http://127.0.0.1:3000/api/admin/live/replay/reactions${options.query ?? ''}`,
    {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  )
}

function expectNoStore(response: Response) {
  expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
}

describe('LIVE 4C replay reaction admin route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAdminRequest.mockReturnValue(true)
    mocks.rateLimit.mockReturnValue({ ok: true, remaining: 29, retryAfterSec: 0 })
    mocks.clientIp.mockReturnValue('203.0.113.10')
    mocks.list.mockResolvedValue({
      ok: true,
      data: { lives: [], units: [], canManageGlobal: false },
    })
    mocks.update.mockResolvedValue({
      ok: true,
      data: {
        live: {
          cmsLiveId: LIVE_ID,
          title: 'Culte royal',
          status: 'published',
          organizationId: ORG_ID,
          organizationUnitId: UNIT_ID,
          enabled: true,
        },
      },
    })
  })

  it('GET returns only service-authorized data with no-store', async () => {
    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { lives: [], units: [], canManageGlobal: false },
    })
    expectNoStore(response)
    expect(mocks.list).toHaveBeenCalledOnce()
  })

  it('GET rejects query parameters with 400 and no-store', async () => {
    const response = await GET(request('GET', undefined, { query: '?organizationId=client' }))

    expect(response.status).toBe(400)
    expectNoStore(response)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('does not trust the admin cookie without a real server identity', async () => {
    mocks.isAdminRequest.mockReturnValue(true)
    mocks.list.mockResolvedValueOnce({ ok: false, reason: 'forbidden' })

    const response = await GET(request('GET'))

    expect(response.status).toBe(403)
    expectNoStore(response)
  })

  it('rejects a missing admin session with 403', async () => {
    mocks.isAdminRequest.mockReturnValue(false)

    const response = await GET(request('GET'))

    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
    expectNoStore(response)
  })

  it.each([
    ['missing Origin', null, 'same-origin'],
    ['null Origin', 'null', 'same-origin'],
    ['foreign Origin', 'https://evil.test', 'same-origin'],
    ['cross-site metadata', 'https://citadelle.test', 'cross-site'],
  ])('PATCH rejects %s with 403 before mutation', async (_label, origin, secFetchSite) => {
    const response = await PATCH(request('PATCH', payload, { origin, secFetchSite }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'invalid_origin' })
    expectNoStore(response)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('PATCH accepts only the exact four-key body', async () => {
    const valid = await PATCH(request('PATCH', payload))
    expect(valid.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(payload)
    expectNoStore(valid)

    mocks.update.mockClear()
    const extra = await PATCH(request('PATCH', { ...payload, actorUserId: 'forged' }))
    expect(extra.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()

    const missing = await PATCH(request('PATCH', {
      cmsLiveId: LIVE_ID,
      enabled: true,
      organizationId: ORG_ID,
    }))
    expect(missing.status).toBe(400)

    const mixedNull = await PATCH(request('PATCH', {
      ...payload,
      organizationId: null,
    }))
    expect(mixedNull.status).toBe(400)
  })

  it('PATCH requires JSON content type', async () => {
    const response = await PATCH(request('PATCH', payload, { contentType: 'text/plain' }))
    expect(response.status).toBe(400)
    expectNoStore(response)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('PATCH rate-limits by IP with 429 and Retry-After', async () => {
    mocks.rateLimit.mockReturnValueOnce({ ok: false, remaining: 0, retryAfterSec: 17 })

    const response = await PATCH(request('PATCH', payload))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('17')
    expectNoStore(response)
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      'admin-replay-reaction:ip:203.0.113.10',
      { limit: 30, windowMs: 60_000 },
    )
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it.each([
    ['forbidden', 403],
    ['not_found', 404],
    ['unavailable', 503],
  ] as const)('maps service %s to %s with no-store', async (reason, status) => {
    mocks.update.mockResolvedValueOnce({ ok: false, reason })

    const response = await PATCH(request('PATCH', payload))

    expect(response.status).toBe(status)
    expectNoStore(response)
  })
})
