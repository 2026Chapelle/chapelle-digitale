import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  LIVE_PRESENCE_COUNT_INTERVAL_MS,
  LIVE_PRESENCE_HEARTBEAT_INTERVAL_MS,
  getOrCreateGuestSessionId,
  hasJoinedLive,
  markLiveJoined,
  requestLiveHeartbeat,
  requestLiveJoin,
  requestLivePresenceCount,
} from './live-presence-client'

const GUEST =
  '550e8400-e29b-41d4-a716-446655440000'

function storage() {
  const values =
    new Map<string, string>()

  return {
    values,

    getItem(key: string) {
      return values.get(key) ?? null
    },

    setItem(
      key: string,
      value: string,
    ) {
      values.set(key, value)
    },
  }
}

describe('LIVE 4A.4 client presence behaviour', () => {
  it('uses 15s public count polling and 30s heartbeats', () => {
    expect(
      LIVE_PRESENCE_COUNT_INTERVAL_MS,
    ).toBe(15_000)

    expect(
      LIVE_PRESENCE_HEARTBEAT_INTERVAL_MS,
    ).toBe(30_000)
  })

  it('creates one persistent guest UUID and reuses it across tabs', () => {
    const store = storage()

    const randomUUID =
      vi.fn(() => GUEST)

    const cryptoApi = {
      randomUUID,

      getRandomValues(
        array: Uint8Array,
      ) {
        return array
      },
    }

    const first =
      getOrCreateGuestSessionId(
        store,
        cryptoApi,
      )

    const second =
      getOrCreateGuestSessionId(
        store,
        cryptoApi,
      )

    expect(first).toBe(GUEST)
    expect(second).toBe(GUEST)

    expect(
      randomUUID,
    ).toHaveBeenCalledTimes(1)
  })

  it('uses cryptographic random bytes as the UUID fallback without Math.random', () => {
    const store = storage()

    const cryptoApi = {
      getRandomValues(
        array: Uint8Array,
      ) {
        array.fill(0)
        return array
      },
    }

    expect(
      getOrCreateGuestSessionId(
        store,
        cryptoApi,
      ),
    ).toBe(
      '00000000-0000-4000-8000-000000000000',
    )
  })

  it('stores explicit consent separately for each YouTube live', () => {
    const store = storage()

    expect(
      hasJoinedLive(
        store,
        'ABCDEFGHIJK',
      ),
    ).toBe(false)

    markLiveJoined(
      store,
      'ABCDEFGHIJK',
    )

    expect(
      hasJoinedLive(
        store,
        'ABCDEFGHIJK',
      ),
    ).toBe(true)

    expect(
      hasJoinedLive(
        store,
        'LMNOPQRSTUV',
      ),
    ).toBe(false)
  })

  it('joins using only the raw guest UUID expected by the public API', async () => {
    const fetcher = vi.fn(
      async (
        _input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        expect(
          JSON.parse(
            String(init?.body),
          ),
        ).toEqual({
          guestSessionId: GUEST,
        })

        expect(
          String(init?.body),
        ).not.toContain('liveKey')

        expect(
          String(init?.body),
        ).not.toContain('userId')

        return new Response(
          JSON.stringify({
            ok: true,
            participantKind: 'guest',
          }),
          {
            status: 200,
            headers: {
              'content-type':
                'application/json',
            },
          },
        )
      },
    )

    await expect(
      requestLiveJoin(
        GUEST,
        fetcher,
      ),
    ).resolves.toEqual({
      ok: true,
      participantKind: 'guest',
    })

    expect(fetcher).toHaveBeenCalledWith(
      '/api/live/presence/join',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
      }),
    )
  })

  it('preserves active=false so remembered consent can safely trigger a rejoin', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            participantKind: 'guest',
            active: false,
          }),
          {
            status: 200,
            headers: {
              'content-type':
                'application/json',
            },
          },
        ),
    )

    await expect(
      requestLiveHeartbeat(
        GUEST,
        fetcher,
      ),
    ).resolves.toEqual({
      ok: true,
      participantKind: 'guest',
      active: false,
    })
  })

  it('reads only the public active total from the count endpoint', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            live: true,
            activeTotal: 12,
          }),
          {
            status: 200,
            headers: {
              'content-type':
                'application/json',
            },
          },
        ),
    )

    await expect(
      requestLivePresenceCount(
        fetcher,
      ),
    ).resolves.toEqual({
      ok: true,
      live: true,
      activeTotal: 12,
    })

    expect(fetcher).toHaveBeenCalledWith(
      '/api/live/presence',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      }),
    )
  })

  it('degrades to null when the presence service is unavailable', async () => {
    const fetcher = vi.fn(
      async () => {
        throw new Error(
          'network unavailable',
        )
      },
    )

    await expect(
      requestLiveJoin(
        GUEST,
        fetcher,
      ),
    ).resolves.toBeNull()

    await expect(
      requestLiveHeartbeat(
        GUEST,
        fetcher,
      ),
    ).resolves.toBeNull()

    await expect(
      requestLivePresenceCount(
        fetcher,
      ),
    ).resolves.toBeNull()
  })
})