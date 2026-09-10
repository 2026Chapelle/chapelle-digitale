import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  requestReplayReactionSnapshot,
} from './live-reaction-replay-client'

const CMS =
  '11111111-1111-4111-8111-111111111111'

const LIVE =
  'youtube:ABCDEFGHIJK'

const ZERO = {
  prayer: 0,
  fire: 0,
  heart: 0,
  praise: 0,
  kingdom: 0,
}

const COUNTS = {
  prayer: 1,
  fire: 2,
  heart: 3,
  praise: 4,
  kingdom: 5,
}

function json(
  value: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(value),
    {
      status,
      headers: {
        'content-type':
          'application/json',
      },
    },
  )
}

describe('replay reaction snapshot client', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses one exact encoded cmsLiveId GET and never POSTs', async () => {
    const fetcher =
      vi.fn(async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        expect(String(input)).toBe(
          `/api/live/reactions/replay?cmsLiveId=${encodeURIComponent(CMS)}`,
        )

        expect(
          init?.method,
        ).toBe('GET')

        expect(
          init?.cache,
        ).toBe('no-store')

        return json({
          ok: true,
          state: 'final',
          liveKey: LIVE,
          uniqueByType:
            COUNTS,
        })
      }) as unknown as typeof fetch

    await expect(
      requestReplayReactionSnapshot(
        CMS,
        fetcher,
      ),
    ).resolves.toEqual({
      ok: true,
      state: 'final',
      liveKey: LIVE,
      uniqueByType:
        COUNTS,
    })

    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('preserves genuine final zero history', async () => {
    const fetcher =
      vi.fn(async () =>
        json({
          ok: true,
          state: 'final',
          liveKey: LIVE,
          uniqueByType:
            ZERO,
        }),
      ) as unknown as typeof fetch

    await expect(
      requestReplayReactionSnapshot(
        CMS,
        fetcher,
      ),
    ).resolves.toEqual({
      ok: true,
      state: 'final',
      liveKey: LIVE,
      uniqueByType:
        ZERO,
    })
  })

  it.each([
    'not_recorded',
    'not_final',
    'not_found',
    'unavailable',
  ] as const)(
    'preserves normal replay state %s',
    async reason => {
      const fetcher =
        vi.fn(async () =>
          json({
            ok: false,
            reason,
          }),
        ) as unknown as typeof fetch

      await expect(
        requestReplayReactionSnapshot(
          CMS,
          fetcher,
        ),
      ).resolves.toEqual({
        ok: false,
        reason,
      })
    },
  )

  it('fails closed for malformed private or unexpected response payloads', async () => {
    const fetcher =
      vi.fn(async () =>
        json({
          ok: true,
          state: 'final',
          liveKey: LIVE,
          uniqueByType:
            COUNTS,
          totalActions: 99,
        }),
      ) as unknown as typeof fetch

    await expect(
      requestReplayReactionSnapshot(
        CMS,
        fetcher,
      ),
    ).resolves.toEqual({
      ok: false,
      reason:
        'unavailable',
    })
  })

  it('fails closed for invalid json and network failure', async () => {
    const invalid =
      vi.fn(async () =>
        new Response(
          '{',
          {
            status: 200,
          },
        ),
      ) as unknown as typeof fetch

    await expect(
      requestReplayReactionSnapshot(
        CMS,
        invalid,
      ),
    ).resolves.toEqual({
      ok: false,
      reason:
        'unavailable',
    })

    const failed =
      vi.fn(async () => {
        throw new Error(
          'offline',
        )
      }) as unknown as typeof fetch

    await expect(
      requestReplayReactionSnapshot(
        CMS,
        failed,
      ),
    ).resolves.toEqual({
      ok: false,
      reason:
        'unavailable',
    })
  })

  it('rejects malformed CMS UUID without fetching', async () => {
    const fetcher =
      vi.fn() as unknown as typeof fetch

    await expect(
      requestReplayReactionSnapshot(
        'bad',
        fetcher,
      ),
    ).resolves.toEqual({
      ok: false,
      reason:
        'unavailable',
    })

    expect(
      fetcher,
    ).not.toHaveBeenCalled()
  })

  it('aborts a slow request after exactly two seconds', async () => {
    const fetcher =
      vi.fn((
        _input:
          RequestInfo | URL,
        init?: RequestInit,
      ) =>
        new Promise<Response>(
          (_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => {
                reject(
                  new DOMException(
                    'aborted',
                    'AbortError',
                  ),
                )
              },
              {
                once: true,
              },
            )
          },
        ),
      ) as unknown as typeof fetch

    const pending =
      requestReplayReactionSnapshot(
        CMS,
        fetcher,
      )

    await vi.advanceTimersByTimeAsync(
      1_999,
    )

    expect(
      fetcher,
    ).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(
      1,
    )

    await expect(
      pending,
    ).resolves.toEqual({
      ok: false,
      reason:
        'unavailable',
    })
  })

  it('forwards external abort for replay switch or unmount', async () => {
    const external =
      new AbortController()

    let observedSignal:
      AbortSignal | undefined

    const fetcher =
      vi.fn((
        _input:
          RequestInfo | URL,
        init?: RequestInit,
      ) => {
        observedSignal =
          init?.signal ?? undefined

        return new Promise<Response>(
          (_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => {
                reject(
                  new DOMException(
                    'aborted',
                    'AbortError',
                  ),
                )
              },
              {
                once: true,
              },
            )
          },
        )
      }) as unknown as typeof fetch

    const pending =
      requestReplayReactionSnapshot(
        CMS,
        fetcher,
        external.signal,
      )

    expect(
      observedSignal?.aborted,
    ).toBe(false)

    external.abort()

    expect(
      observedSignal?.aborted,
    ).toBe(true)

    await expect(
      pending,
    ).resolves.toEqual({
      ok: false,
      reason:
        'unavailable',
    })
  })
})