import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  joinLivePresence: vi.fn(),
  heartbeatLivePresence: vi.fn(),
  getLivePresenceCounts: vi.fn(),
  rateLimit: vi.fn(),
  clientIp: vi.fn(),
}))

vi.mock('@/lib/live/live-participation-server', () => ({
  joinLivePresence: mocks.joinLivePresence,
  heartbeatLivePresence:
    mocks.heartbeatLivePresence,
  getLivePresenceCounts:
    mocks.getLivePresenceCounts,
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: mocks.clientIp,
}))

import {
  GET as getPresence,
} from './route'

import {
  POST as postJoin,
} from './join/route'

import {
  POST as postHeartbeat,
} from './heartbeat/route'

const IP = '203.0.113.10'
const GUEST =
  '550e8400-e29b-41d4-a716-446655440000'

function post(
  path: string,
  body?: unknown,
) {
  const init: ConstructorParameters<
    typeof NextRequest
  >[1] = {
    method: 'POST',
  }

  if (body !== undefined) {
    init.body =
      typeof body === 'string'
        ? body
        : JSON.stringify(body)

    init.headers = {
      'content-type': 'application/json',
    }
  }

  return new NextRequest(
    `https://citadelle.example${path}`,
    init,
  )
}

function get(path: string) {
  return new NextRequest(
    `https://citadelle.example${path}`,
    {
      method: 'GET',
    },
  )
}

describe('LIVE 4A.3 public presence APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.clientIp.mockReturnValue(IP)

    mocks.rateLimit.mockReturnValue({
      ok: true,
      retryAfterSec: 0,
    })

    mocks.joinLivePresence.mockResolvedValue({
      ok: true,
      liveKey: 'youtube:ABCDEFGHIJK',
      participantKind: 'guest',
    })

    mocks.heartbeatLivePresence.mockResolvedValue({
      ok: true,
      liveKey: 'youtube:ABCDEFGHIJK',
      participantKind: 'guest',
      active: true,
    })

    mocks.getLivePresenceCounts.mockResolvedValue({
      ok: true,
      liveKey: 'youtube:ABCDEFGHIJK',
      activeTotal: 12,
      activeMembers: 7,
      activeGuests: 5,
      joinedTotal: 31,
    })
  })

  it('joins a guest through a minimal response without leaking liveKey or identities', async () => {
    const response = await postJoin(
      post(
        '/api/live/presence/join',
        {
          guestSessionId: GUEST,
        },
      ),
    )

    const json =
      await response.json()

    expect(response.status).toBe(200)

    expect(json).toEqual({
      ok: true,
      participantKind: 'guest',
    })

    expect(
      JSON.stringify(json),
    ).not.toContain('youtube:')

    expect(json).not.toHaveProperty('userId')
    expect(json).not.toHaveProperty(
      'guestSessionHash',
    )

    expect(
      mocks.joinLivePresence,
    ).toHaveBeenCalledWith({
      guestSessionId: GUEST,
    })
  })

  it('allows an authenticated join with an empty request body', async () => {
    mocks.joinLivePresence.mockResolvedValue({
      ok: true,
      liveKey: 'youtube:ABCDEFGHIJK',
      participantKind: 'member',
    })

    const response = await postJoin(
      post(
        '/api/live/presence/join',
      ),
    )

    expect(response.status).toBe(200)

    await expect(
      response.json(),
    ).resolves.toEqual({
      ok: true,
      participantKind: 'member',
    })

    expect(
      mocks.joinLivePresence,
    ).toHaveBeenCalledWith({})
  })

  it('rejects malformed JSON and client-authoritative identity fields', async () => {
    const malformed = await postJoin(
      post(
        '/api/live/presence/join',
        '{bad json',
      ),
    )

    expect(malformed.status).toBe(400)

    expect(
      mocks.joinLivePresence,
    ).not.toHaveBeenCalled()

    const forbidden = await postJoin(
      post(
        '/api/live/presence/join',
        {
          guestSessionId: GUEST,
          userId:
            '11111111-1111-4111-8111-111111111111',
          liveKey: 'youtube:ABCDEFGHIJK',
          guestSessionHash: 'fake',
        },
      ),
    )

    expect(forbidden.status).toBe(400)

    expect(
      mocks.joinLivePresence,
    ).not.toHaveBeenCalled()
  })

  it('rate-limits join by IP only as abuse protection', async () => {
    mocks.rateLimit.mockReturnValue({
      ok: false,
      retryAfterSec: 17,
    })

    const response = await postJoin(
      post(
        '/api/live/presence/join',
        {
          guestSessionId: GUEST,
        },
      ),
    )

    expect(response.status).toBe(429)

    expect(
      response.headers.get('retry-after'),
    ).toBe('17')

    expect(
      mocks.rateLimit,
    ).toHaveBeenCalledWith(
      `live-presence-join:${IP}`,
      {
        limit: 60,
        windowMs: 60_000,
      },
    )

    expect(
      mocks.joinLivePresence,
    ).not.toHaveBeenCalled()
  })

  it('maps join domain failures without leaking internal errors', async () => {
    mocks.joinLivePresence.mockResolvedValueOnce({
      ok: false,
      reason: 'identity_required',
    })

    const identity = await postJoin(
      post(
        '/api/live/presence/join',
        {},
      ),
    )

    expect(identity.status).toBe(400)

    await expect(
      identity.json(),
    ).resolves.toEqual({
      ok: false,
      reason: 'identity_required',
    })

    mocks.joinLivePresence.mockResolvedValueOnce({
      ok: false,
      reason: 'not_live',
    })

    const notLive = await postJoin(
      post(
        '/api/live/presence/join',
        {
          guestSessionId: GUEST,
        },
      ),
    )

    expect(notLive.status).toBe(409)

    mocks.joinLivePresence.mockResolvedValueOnce({
      ok: false,
      reason: 'unavailable',
    })

    const unavailable = await postJoin(
      post(
        '/api/live/presence/join',
        {
          guestSessionId: GUEST,
        },
      ),
    )

    expect(unavailable.status).toBe(503)
  })

  it('heartbeats through the server engine without accepting liveKey or userId', async () => {
    const response =
      await postHeartbeat(
        post(
          '/api/live/presence/heartbeat',
          {
            guestSessionId: GUEST,
          },
        ),
      )

    expect(response.status).toBe(200)

    expect(
      await response.json(),
    ).toEqual({
      ok: true,
      participantKind: 'guest',
      active: true,
    })

    expect(
      mocks.heartbeatLivePresence,
    ).toHaveBeenCalledWith({
      guestSessionId: GUEST,
    })
  })

  it('preserves active=false when heartbeat finds no prior explicit join', async () => {
    mocks.heartbeatLivePresence.mockResolvedValue({
      ok: true,
      liveKey: 'youtube:ABCDEFGHIJK',
      participantKind: 'guest',
      active: false,
    })

    const response =
      await postHeartbeat(
        post(
          '/api/live/presence/heartbeat',
          {
            guestSessionId: GUEST,
          },
        ),
      )

    expect(response.status).toBe(200)

    await expect(
      response.json(),
    ).resolves.toEqual({
      ok: true,
      participantKind: 'guest',
      active: false,
    })
  })

  it('rate-limits heartbeat with a generous abuse-only window', async () => {
    mocks.rateLimit.mockReturnValue({
      ok: false,
      retryAfterSec: 4,
    })

    const response =
      await postHeartbeat(
        post(
          '/api/live/presence/heartbeat',
          {
            guestSessionId: GUEST,
          },
        ),
      )

    expect(response.status).toBe(429)

    expect(
      mocks.rateLimit,
    ).toHaveBeenCalledWith(
      `live-presence-heartbeat:${IP}`,
      {
        limit: 240,
        windowMs: 60_000,
      },
    )

    expect(
      mocks.heartbeatLivePresence,
    ).not.toHaveBeenCalled()
  })

  it('exposes only the active public total while a live is running', async () => {
    const response =
      await getPresence(
        get(
          '/api/live/presence',
        ),
      )

    expect(response.status).toBe(200)

    const json =
      await response.json()

    expect(json).toEqual({
      ok: true,
      live: true,
      activeTotal: 12,
    })

    expect(json).not.toHaveProperty(
      'activeMembers',
    )

    expect(json).not.toHaveProperty(
      'activeGuests',
    )

    expect(json).not.toHaveProperty(
      'joinedTotal',
    )

    expect(json).not.toHaveProperty(
      'liveKey',
    )
  })

  it('returns a calm zero public state when canonical live is offline', async () => {
    mocks.getLivePresenceCounts.mockResolvedValue({
      ok: false,
      reason: 'not_live',
    })

    const response =
      await getPresence(
        get(
          '/api/live/presence',
        ),
      )

    expect(response.status).toBe(200)

    await expect(
      response.json(),
    ).resolves.toEqual({
      ok: true,
      live: false,
      activeTotal: 0,
    })
  })

  it('returns 503 when counts are temporarily unavailable', async () => {
    mocks.getLivePresenceCounts.mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })

    const response =
      await getPresence(
        get(
          '/api/live/presence',
        ),
      )

    expect(response.status).toBe(503)

    await expect(
      response.json(),
    ).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('marks every response no-store', async () => {
    const join = await postJoin(
      post(
        '/api/live/presence/join',
        {
          guestSessionId: GUEST,
        },
      ),
    )

    const heartbeat =
      await postHeartbeat(
        post(
          '/api/live/presence/heartbeat',
          {
            guestSessionId: GUEST,
          },
        ),
      )

    const counts =
      await getPresence(
        get(
          '/api/live/presence',
        ),
      )

    expect(
      join.headers.get('cache-control'),
    ).toContain('no-store')

    expect(
      heartbeat.headers.get('cache-control'),
    ).toContain('no-store')

    expect(
      counts.headers.get('cache-control'),
    ).toContain('no-store')
  })
})