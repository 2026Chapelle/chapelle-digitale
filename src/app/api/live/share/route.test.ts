import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  NextRequest,
} from 'next/server'

const mocks = vi.hoisted(() => ({
  recordLiveShareAction: vi.fn(),
  rateLimit: vi.fn(),
  clientIp: vi.fn(),
}))

vi.mock('@/lib/live/live-share-server', () => ({
  recordLiveShareAction:
    mocks.recordLiveShareAction,
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: mocks.clientIp,
}))

import {
  POST,
} from './route'

const GUEST =
  '550e8400-e29b-41d4-a716-446655440000'

const IP =
  '203.0.113.20'

function request(
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
      'content-type':
        'application/json',
    }
  }

  return new NextRequest(
    'https://citadelle.example/api/live/share',
    init,
  )
}

describe('LIVE 4A.5 share API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.clientIp.mockReturnValue(IP)

    mocks.rateLimit.mockReturnValue({
      ok: true,
      retryAfterSec: 0,
    })

    mocks.recordLiveShareAction.mockResolvedValue({
      ok: true,
      participantKind: 'guest',
    })
  })

  it('records one successful browser action through a minimal public contract', async () => {
    const response =
      await POST(
        request({
          actionKind: 'native_share',
          guestSessionId: GUEST,
        }),
      )

    expect(response.status).toBe(200)

    await expect(
      response.json(),
    ).resolves.toEqual({
      ok: true,
    })

    expect(
      mocks.recordLiveShareAction,
    ).toHaveBeenCalledWith({
      actionKind: 'native_share',
      guestSessionId: GUEST,
    })
  })

  it('accepts only native_share or copy_link and rejects client authority fields', async () => {
    const badAction =
      await POST(
        request({
          actionKind: 'opened_link',
          guestSessionId: GUEST,
        }),
      )

    expect(
      badAction.status,
    ).toBe(400)

    const forbidden =
      await POST(
        request({
          actionKind: 'copy_link',
          guestSessionId: GUEST,
          liveKey:
            'youtube:ABCDEFGHIJK',
          userId:
            '11111111-1111-4111-8111-111111111111',
        }),
      )

    expect(
      forbidden.status,
    ).toBe(400)

    expect(
      mocks.recordLiveShareAction,
    ).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON', async () => {
    const response =
      await POST(
        request('{bad json'),
      )

    expect(response.status).toBe(400)

    expect(
      mocks.recordLiveShareAction,
    ).not.toHaveBeenCalled()
  })

  it('rate-limits abuse by IP without using IP as participant identity', async () => {
    mocks.rateLimit.mockReturnValue({
      ok: false,
      retryAfterSec: 9,
    })

    const response =
      await POST(
        request({
          actionKind: 'copy_link',
          guestSessionId: GUEST,
        }),
      )

    expect(response.status).toBe(429)

    expect(
      response.headers.get(
        'retry-after',
      ),
    ).toBe('9')

    expect(
      mocks.rateLimit,
    ).toHaveBeenCalledWith(
      `live-share:${IP}`,
      {
        limit: 60,
        windowMs: 60_000,
      },
    )

    expect(
      mocks.recordLiveShareAction,
    ).not.toHaveBeenCalled()
  })

  it('maps domain failures without leaking identities', async () => {
    mocks.recordLiveShareAction.mockResolvedValueOnce({
      ok: false,
      reason: 'identity_required',
    })

    const identity =
      await POST(
        request({
          actionKind: 'copy_link',
        }),
      )

    expect(identity.status).toBe(400)

    mocks.recordLiveShareAction.mockResolvedValueOnce({
      ok: false,
      reason: 'not_live',
    })

    const offline =
      await POST(
        request({
          actionKind: 'copy_link',
          guestSessionId: GUEST,
        }),
      )

    expect(offline.status).toBe(409)

    mocks.recordLiveShareAction.mockResolvedValueOnce({
      ok: false,
      reason: 'unavailable',
    })

    const unavailable =
      await POST(
        request({
          actionKind: 'native_share',
          guestSessionId: GUEST,
        }),
      )

    expect(unavailable.status).toBe(503)
  })

  it('marks every response no-store', async () => {
    const response =
      await POST(
        request({
          actionKind: 'native_share',
          guestSessionId: GUEST,
        }),
      )

    expect(
      response.headers.get(
        'cache-control',
      ),
    ).toContain('no-store')
  })
})