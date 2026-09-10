import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const LIVE_A =
  'youtube:ABCDEFGHIJK'

const LIVE_B =
  'youtube:ZZZZZZZZZZZ'

const CMS_A =
  '11111111-1111-4111-8111-111111111111'

const CMS_B =
  '22222222-2222-4222-8222-222222222222'

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

const mocks = vi.hoisted(() => ({
  cms:
    vi.fn(),

  canonical:
    vi.fn(),

  rpc:
    vi.fn(),

  from:
    vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseCmsRead: {
    from:
      mocks.from,
  },

  supabaseAdmin: {
    rpc:
      mocks.rpc,
  },
}))

vi.mock('./canonical-server', () => ({
  getCanonicalLiveState:
    mocks.canonical,

  liveKeyFromState:
    (
      state: {
        status?: string
        youtubeVideoId?: string
      },
    ) => (
      state.status === 'LIVE' &&
      typeof state.youtubeVideoId === 'string' &&
      /^[A-Za-z0-9_-]{11}$/.test(
        state.youtubeVideoId,
      )
        ? `youtube:${state.youtubeVideoId}`
        : null
    ),
}))

vi.mock(
  './live-reaction-identity-server',
  () => ({
    resolveLiveReactionActor:
      vi.fn(),
  }),
)

import {
  getReplayReactionSnapshot,
} from './live-reactions-server'

function cmsRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: CMS_A,
    youtube_url:
      'https://www.youtube.com/watch?v=ABCDEFGHIJK',
    video_url: null,
    status: 'ended',
    is_live: false,
    ...overrides,
  }
}

function setCms(
  data: unknown,
  error: unknown = null,
) {
  mocks.cms.mockResolvedValue({
    data,
    error,
  })
}

function setFinalize(
  data: unknown,
  error: unknown = null,
) {
  mocks.rpc.mockImplementation(
    (
      name: string,
      args: unknown,
    ) => {
      expect(name).toBe(
        'live_reaction_finalize',
      )

      return {
        abortSignal:
          vi.fn().mockResolvedValue({
            data,
            error,
          }),
      }
    },
  )
}

describe('replay reaction server resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.from.mockImplementation(
      (table: string) => {
        expect(table).toBe('cms_lives')

        return {
          select:
            (
              columns: string,
            ) => {
              expect(columns).toBe(
                'id,youtube_url,video_url,status,is_live',
              )

              return {
                eq:
                  (
                    field: string,
                    value: string,
                  ) => {
                    expect(field).toBe('id')
                    expect(value).toMatch(
                      /^[0-9a-f-]{36}$/i,
                    )

                    return {
                      maybeSingle:
                        () => mocks.cms(),
                    }
                  },
              }
            },
        }
      },
    )

    setCms(
      cmsRow(),
    )

    mocks.canonical.mockResolvedValue({
      status: 'OFFLINE',
    })

    setFinalize({
      state: 'final',
      liveKey: LIVE_A,
      stats: {
        uniqueActors: 5,
        totalActions: 20,
        uniqueByType:
          COUNTS,
        actionsByType: {
          prayer: 2,
          fire: 3,
          heart: 4,
          praise: 5,
          kingdom: 6,
        },
      },
    })
  })

  it('rejects malformed CMS UUID without any CMS, canonical or RPC work', async () => {
    await expect(
      getReplayReactionSnapshot(
        'not-a-uuid',
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    })

    expect(
      mocks.from,
    ).not.toHaveBeenCalled()

    expect(
      mocks.canonical,
    ).not.toHaveBeenCalled()

    expect(
      mocks.rpc,
    ).not.toHaveBeenCalled()
  })

  it('distinguishes a CMS error from a missing row', async () => {
    setCms(
      null,
      {
        message:
          'connection failed',
      },
    )

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })

    expect(
      mocks.canonical,
    ).not.toHaveBeenCalled()

    expect(
      mocks.rpc,
    ).not.toHaveBeenCalled()
  })

  it('maps a missing CMS row to not_found', async () => {
    setCms(null)

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    })

    expect(
      mocks.rpc,
    ).not.toHaveBeenCalled()
  })

  it.each([
    {
      status: 'draft',
      is_live: false,
    },

    {
      status: 'scheduled',
      is_live: false,
    },

    {
      status: 'live',
      is_live: true,
    },

    {
      status: 'ended',
      is_live: true,
    },

    {
      status: 'published',
      is_live: true,
    },
  ])(
    'requires a published replay row %#',
    async overrides => {
      setCms(
        cmsRow(overrides),
      )

      await expect(
        getReplayReactionSnapshot(
          CMS_A,
        ),
      ).resolves.toEqual({
        ok: false,
        reason: 'not_found',
      })

      expect(
        mocks.rpc,
      ).not.toHaveBeenCalled()
    },
  )

  it('gives nonempty youtube_url absolute priority over video_url', async () => {
    setCms(
      cmsRow({
        youtube_url:
          'https://cdn.example.com/not-youtube.mp4',
        video_url:
          'https://youtu.be/ABCDEFGHIJK',
      }),
    )

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'not_recorded',
    })

    expect(
      mocks.canonical,
    ).not.toHaveBeenCalled()

    expect(
      mocks.rpc,
    ).not.toHaveBeenCalled()
  })

  it('uses video_url only when youtube_url is empty', async () => {
    setCms(
      cmsRow({
        youtube_url: '',
        video_url:
          'https://youtu.be/ABCDEFGHIJK',
      }),
    )

    const result =
      await getReplayReactionSnapshot(
        CMS_A,
      )

    expect(result).toEqual({
      ok: true,
      state: 'final',
      liveKey: LIVE_A,
      uniqueByType:
        COUNTS,
    })

    expect(
      mocks.rpc,
    ).toHaveBeenCalledOnce()
  })

  it('returns not_recorded when the exact run does not exist', async () => {
    setFinalize({
      state:
        'not_recorded',
    })

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'not_recorded',
    })
  })

  it('preserves a known final zero snapshot as genuine zero history', async () => {
    setFinalize({
      state: 'final',
      liveKey: LIVE_A,
      stats: {
        uniqueActors: 0,
        totalActions: 0,
        uniqueByType: ZERO,
        actionsByType: ZERO,
      },
    })

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: true,
      state: 'final',
      liveKey: LIVE_A,
      uniqueByType: ZERO,
    })
  })

  it('does not finalize while the same exact YouTube key is still canonical LIVE', async () => {
    mocks.canonical.mockResolvedValue({
      status: 'LIVE',
      youtubeVideoId:
        'ABCDEFGHIJK',
    })

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'not_final',
    })

    expect(
      mocks.rpc,
    ).not.toHaveBeenCalled()
  })

  it('finalizes replay A while different live B is currently canonical', async () => {
    mocks.canonical.mockResolvedValue({
      status: 'LIVE',
      youtubeVideoId:
        'ZZZZZZZZZZZ',
    })

    const result =
      await getReplayReactionSnapshot(
        CMS_A,
      )

    expect(result).toEqual({
      ok: true,
      state: 'final',
      liveKey: LIVE_A,
      uniqueByType:
        COUNTS,
    })

    expect(
      mocks.rpc,
    ).toHaveBeenCalledWith(
      'live_reaction_finalize',
      {
        p_live_key:
          LIVE_A,
      },
    )
  })

  it('fails closed when canonical throws and never finalizes', async () => {
    mocks.canonical.mockRejectedValue(
      new Error(
        'canonical unavailable',
      ),
    )

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })

    expect(
      mocks.rpc,
    ).not.toHaveBeenCalled()
  })

  it('fails closed when finalize RPC fails', async () => {
    setFinalize(
      null,
      {
        message:
          'rpc unavailable',
      },
    )

    await expect(
      getReplayReactionSnapshot(
        CMS_A,
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('projects only public unique counts and never totals/actions', async () => {
    const result =
      await getReplayReactionSnapshot(
        CMS_A,
      )

    expect(result).toEqual({
      ok: true,
      state: 'final',
      liveKey: LIVE_A,
      uniqueByType:
        COUNTS,
    })

    expect(
      JSON.stringify(result),
    ).not.toMatch(
      /totalActions|actionsByType|uniqueActors|actorKey/i,
    )
  })

  it('gives different CMS rows with the same YouTube identity the same frozen stats', async () => {
    setCms(
      cmsRow({
        id: CMS_A,
      }),
    )

    const first =
      await getReplayReactionSnapshot(
        CMS_A,
      )

    setCms(
      cmsRow({
        id: CMS_B,
      }),
    )

    const second =
      await getReplayReactionSnapshot(
        CMS_B,
      )

    expect(second).toEqual(first)

    expect(
      mocks.rpc,
    ).toHaveBeenCalledTimes(2)
  })

  it('returns the same already-closed final snapshot on repeated reads', async () => {
    const first =
      await getReplayReactionSnapshot(
        CMS_A,
      )

    const second =
      await getReplayReactionSnapshot(
        CMS_A,
      )

    expect(second).toEqual(first)

    expect(
      mocks.rpc,
    ).toHaveBeenCalledTimes(2)
  })
})