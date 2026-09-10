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

const CMS =
  '11111111-1111-4111-8111-111111111111'

const LIVE =
  'youtube:ABCDEFGHIJK'

const COUNTS = {
  prayer: 1,
  fire: 2,
  heart: 0,
  praise: 3,
  kingdom: 0,
}

const mocks = vi.hoisted(
  () => ({
    replay:
      vi.fn(),
  }),
)

vi.mock(
  '@/lib/live/live-reactions-server',
  () => ({
    getReplayReactionSnapshot:
      mocks.replay,
  }),
)

import {
  GET,
} from './route'

async function body(
  response: Response,
) {
  expect(
    response.headers.get(
      'Cache-Control',
    ),
  ).toMatch(/no-store/i)

  return response.json()
}

describe('replay reaction read-only API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.replay.mockResolvedValue({
      ok: true,
      state: 'final',
      liveKey: LIVE,
      uniqueByType:
        COUNTS,
    })
  })

  it('returns the exact frozen public snapshot for one CMS UUID selector', async () => {
    const response =
      await GET(
        new NextRequest(
          `https://loopback.test/api/live/reactions/replay?cmsLiveId=${CMS}`,
        ),
      )

    expect(
      response.status,
    ).toBe(200)

    await expect(
      body(response),
    ).resolves.toEqual({
      ok: true,
      state: 'final',
      liveKey: LIVE,
      uniqueByType:
        COUNTS,
    })

    expect(
      mocks.replay,
    ).toHaveBeenCalledWith(
      CMS,
    )
  })

  it.each([
    '',
    '?cmsLiveId=bad',
    '?cmsLiveId=',
    `?cmsLiveId=${CMS}&anything=1`,
    `?anything=1&cmsLiveId=${CMS}`,
    `?cmsLiveId=${CMS}&cmsLiveId=${CMS}`,
  ])(
    'rejects malformed or non-exact selector %s',
    async query => {
      const response =
        await GET(
          new NextRequest(
            `https://loopback.test/api/live/reactions/replay${query}`,
          ),
        )

      expect(
        response.status,
      ).toBe(400)

      await expect(
        body(response),
      ).resolves.toEqual({
        ok: false,
        reason:
          'invalid_request',
      })

      expect(
        mocks.replay,
      ).not.toHaveBeenCalled()
    },
  )

  it.each([
    [
      {
        ok: false,
        reason: 'not_found',
      },
      404,
    ],

    [
      {
        ok: false,
        reason:
          'not_recorded',
      },
      200,
    ],

    [
      {
        ok: false,
        reason:
          'not_final',
      },
      200,
    ],

    [
      {
        ok: false,
        reason:
          'unavailable',
      },
      503,
    ],
  ])(
    'maps replay engine state %#',
    async (
      result,
      status,
    ) => {
      mocks.replay.mockResolvedValue(
        result,
      )

      const response =
        await GET(
          new NextRequest(
            `https://loopback.test/api/live/reactions/replay?cmsLiveId=${CMS}`,
          ),
        )

      expect(
        response.status,
      ).toBe(status)

      await expect(
        body(response),
      ).resolves.toEqual(
        result,
      )
    },
  )

  it('fails closed on thrown engine dependency', async () => {
    mocks.replay.mockRejectedValue(
      new Error('boom'),
    )

    const response =
      await GET(
        new NextRequest(
          `https://loopback.test/api/live/reactions/replay?cmsLiveId=${CMS}`,
        ),
      )

    expect(
      response.status,
    ).toBe(503)

    await expect(
      body(response),
    ).resolves.toEqual({
      ok: false,
      reason:
        'unavailable',
    })
  })
})