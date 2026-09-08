import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  getCanonicalLiveState: vi.fn(),
  liveKeyFromState: vi.fn(),
  getLivePresenceCounts: vi.fn(),
  from: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/live/canonical-server', () => ({
  getCanonicalLiveState:
    mocks.getCanonicalLiveState,
  liveKeyFromState:
    mocks.liveKeyFromState,
}))

vi.mock('@/lib/live/live-participation-server', () => ({
  getLivePresenceCounts:
    mocks.getLivePresenceCounts,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}))

import {
  getLiveAdminSupervision,
} from './live-admin-supervision-server'

const LIVE_KEY =
  'youtube:ABCDEFGHIJK'

function shareBuilder(
  nativeCount = 4,
  copyCount = 3,
  fail = false,
) {
  return {
    select() {
      const builder = {
        eq(
          column: string,
          value: string,
        ): unknown {
          if (column === 'live_key') {
            return builder
          }

          if (
            column === 'action_kind'
          ) {
            if (fail) {
              return Promise.resolve({
                count: null,
                error: {
                  message:
                    'share table unavailable',
                },
              })
            }

            return Promise.resolve({
              count:
                value ===
                'native_share'
                  ? nativeCount
                  : copyCount,
              error: null,
            })
          }

          return builder
        },
      }

      return builder
    },
  }
}

describe('LIVE 4A.6 admin supervision server', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getCanonicalLiveState.mockResolvedValue({
      status: 'LIVE',
      titre: 'Culte Royal',
      youtubeVideoId: 'ABCDEFGHIJK',
    })

    mocks.liveKeyFromState.mockReturnValue(
      LIVE_KEY,
    )

    mocks.getLivePresenceCounts.mockResolvedValue({
      ok: true,
      liveKey: LIVE_KEY,
      activeTotal: 31,
      activeMembers: 22,
      activeGuests: 9,
      joinedTotal: 38,
    })

    mocks.from.mockImplementation(
      () => shareBuilder(),
    )
  })

  it('returns a calm offline state without querying live aggregates', async () => {
    mocks.getCanonicalLiveState.mockResolvedValue({
      status: 'OFFLINE',
    })

    mocks.liveKeyFromState.mockReturnValue(
      null,
    )

    await expect(
      getLiveAdminSupervision(),
    ).resolves.toEqual({
      live: false,
      canonical: {
        status: 'OFFLINE',
        title: null,
        youtubeVideoId: null,
      },
      presence: null,
      shares: null,
    })

    expect(
      mocks.getLivePresenceCounts,
    ).not.toHaveBeenCalled()

    expect(
      mocks.from,
    ).not.toHaveBeenCalled()
  })

  it('combines canonical state, current presence and successful share actions', async () => {
    await expect(
      getLiveAdminSupervision(),
    ).resolves.toEqual({
      live: true,
      canonical: {
        status: 'LIVE',
        title: 'Culte Royal',
        youtubeVideoId:
          'ABCDEFGHIJK',
      },
      presence: {
        available: true,
        activeTotal: 31,
        activeMembers: 22,
        activeGuests: 9,
        joinedTotal: 38,
      },
      shares: {
        available: true,
        totalActions: 7,
        nativeShare: 4,
        copyLink: 3,
      },
    })

    expect(
      mocks.getLivePresenceCounts,
    ).toHaveBeenCalledTimes(1)

    expect(
      mocks.from,
    ).toHaveBeenCalledTimes(2)

    expect(
      mocks.from,
    ).toHaveBeenNthCalledWith(
      1,
      'live_share_actions',
    )

    expect(
      mocks.from,
    ).toHaveBeenNthCalledWith(
      2,
      'live_share_actions',
    )
  })

  it('never converts a presence failure into a fake zero', async () => {
    mocks.getLivePresenceCounts.mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })

    const result =
      await getLiveAdminSupervision()

    expect(result.live).toBe(true)

    expect(result.presence).toEqual({
      available: false,
    })

    expect(result.shares).toEqual({
      available: true,
      totalActions: 7,
      nativeShare: 4,
      copyLink: 3,
    })
  })

  it('never converts a share database failure into fake zero actions', async () => {
    mocks.from.mockImplementation(
      () =>
        shareBuilder(
          0,
          0,
          true,
        ),
    )

    const result =
      await getLiveAdminSupervision()

    expect(result.live).toBe(true)

    expect(result.presence).toEqual({
      available: true,
      activeTotal: 31,
      activeMembers: 22,
      activeGuests: 9,
      joinedTotal: 38,
    })

    expect(result.shares).toEqual({
      available: false,
    })
  })

  it('rejects mixed presence data if the canonical live changes during aggregation', async () => {
    mocks.getLivePresenceCounts.mockResolvedValue({
      ok: true,
      liveKey:
        'youtube:LMNOPQRSTUV',
      activeTotal: 99,
      activeMembers: 70,
      activeGuests: 29,
      joinedTotal: 120,
    })

    const result =
      await getLiveAdminSupervision()

    expect(result.presence).toEqual({
      available: false,
    })

    expect(result.shares).toEqual({
      available: true,
      totalActions: 7,
      nativeShare: 4,
      copyLink: 3,
    })
  })
})