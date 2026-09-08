import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  LIVE_PUBLIC_URL,
  LIVE_SHARE_TEXT,
  recordSuccessfulLiveShare,
} from './live-share-client'

const GUEST =
  '550e8400-e29b-41d4-a716-446655440000'

function storage() {
  const values =
    new Map<string, string>()

  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },

    setItem(
      key: string,
      value: string,
    ) {
      values.set(
        key,
        value,
      )
    },
  }
}

const cryptoApi = {
  randomUUID() {
    return GUEST
  },

  getRandomValues(
    array: Uint8Array,
  ) {
    return array
  },
}

describe('LIVE 4A.5 share client telemetry', () => {
  it('uses the permanent Citadelle Live URL and agreed invitation text', () => {
    expect(
      LIVE_PUBLIC_URL,
    ).toBe(
      'https://citadelle.chapelleduroyaume.org/live',
    )

    expect(
      LIVE_SHARE_TEXT,
    ).toBe(
      'Nous sommes en direct sur Citadelle. Rejoins-nous maintenant pour vivre le culte avec la Famille Royale.',
    )
  })

  it('records native_share using only guestSessionId and actionKind', async () => {
    const fetcher =
      vi.fn(
        async (
          _input:
            RequestInfo | URL,
          init?: RequestInit,
        ) => {
          const body =
            JSON.parse(
              String(
                init?.body,
              ),
            )

          expect(body).toEqual({
            actionKind:
              'native_share',
            guestSessionId:
              GUEST,
          })

          expect(
            JSON.stringify(body),
          ).not.toContain(
            'liveKey',
          )

          expect(
            JSON.stringify(body),
          ).not.toContain(
            'userId',
          )

          expect(
            JSON.stringify(body),
          ).not.toContain(
            'guestSessionHash',
          )

          return new Response(
            JSON.stringify({
              ok: true,
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
      recordSuccessfulLiveShare(
        'native_share',
        {
          storage:
            storage(),
          cryptoApi,
          fetcher,
        },
      ),
    ).resolves.toBe(true)

    expect(fetcher).toHaveBeenCalledWith(
      '/api/live/share',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        credentials:
          'same-origin',
      }),
    )
  })

  it('records copy_link with the same identity model', async () => {
    const fetcher =
      vi.fn(
        async (
          _input:
            RequestInfo | URL,
          init?: RequestInit,
        ) => {
          expect(
            JSON.parse(
              String(
                init?.body,
              ),
            ),
          ).toEqual({
            actionKind:
              'copy_link',
            guestSessionId:
              GUEST,
          })

          return new Response(
            JSON.stringify({
              ok: true,
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
      recordSuccessfulLiveShare(
        'copy_link',
        {
          storage:
            storage(),
          cryptoApi,
          fetcher,
        },
      ),
    ).resolves.toBe(true)
  })

  it('does not make a successful browser share fail when telemetry is unavailable', async () => {
    const fetcher =
      vi.fn(
        async () => {
          throw new Error(
            'telemetry offline',
          )
        },
      )

    await expect(
      recordSuccessfulLiveShare(
        'native_share',
        {
          storage:
            storage(),
          cryptoApi,
          fetcher,
        },
      ),
    ).resolves.toBe(false)
  })
})