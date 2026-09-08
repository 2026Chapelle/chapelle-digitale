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
  getVerifiedRouteProfile: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/live/canonical-server', () => ({
  getCanonicalLiveState:
    mocks.getCanonicalLiveState,
  liveKeyFromState:
    mocks.liveKeyFromState,
}))

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile:
    mocks.getVerifiedRouteProfile,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}))

import {
  recordLiveShareAction,
} from './live-share-server'

const LIVE_KEY =
  'youtube:ABCDEFGHIJK'

const GUEST =
  '550e8400-e29b-41d4-a716-446655440000'

const GUEST_HASH =
  'a3a9e1ed9732cab28868127be00f1ce921acaefdd5c3b23a6e9e0072bd9c1a34'

describe('LIVE 4A.5 share server service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getCanonicalLiveState.mockResolvedValue({
      status: 'LIVE',
      title: 'Culte Royal',
      youtubeVideoId: 'ABCDEFGHIJK',
      watchUrl: '/live',
    })

    mocks.liveKeyFromState.mockReturnValue(
      LIVE_KEY,
    )

    mocks.getVerifiedRouteProfile.mockResolvedValue(
      null,
    )

    mocks.insert.mockResolvedValue({
      error: null,
    })

    mocks.from.mockReturnValue({
      insert: mocks.insert,
    })
  })

  it('records a guest share using only the hashed guest identity', async () => {
    const result =
      await recordLiveShareAction({
        actionKind: 'native_share',
        guestSessionId: GUEST,
      })

    expect(result).toEqual({
      ok: true,
      participantKind: 'guest',
    })

    expect(mocks.from).toHaveBeenCalledWith(
      'live_share_actions',
    )

    expect(mocks.insert).toHaveBeenCalledWith({
      live_key: LIVE_KEY,
      participant_kind: 'guest',
      user_id: null,
      guest_session_hash: GUEST_HASH,
      action_kind: 'native_share',
    })

    expect(
      JSON.stringify(
        mocks.insert.mock.calls[0]?.[0],
      ),
    ).not.toContain(GUEST)
  })

  it('uses verified server member identity and does not persist a guest hash for members', async () => {
    mocks.getVerifiedRouteProfile.mockResolvedValue({
      uid: '11111111-1111-4111-8111-111111111111',
      role: 'membre',
      email: 'member@example.test',
      profile: {
        id: '11111111-1111-4111-8111-111111111111',
      },
    })

    const result =
      await recordLiveShareAction({
        actionKind: 'copy_link',
        guestSessionId: GUEST,
      })

    expect(result).toEqual({
      ok: true,
      participantKind: 'member',
    })

    expect(mocks.insert).toHaveBeenCalledWith({
      live_key: LIVE_KEY,
      participant_kind: 'member',
      user_id:
        '11111111-1111-4111-8111-111111111111',
      guest_session_hash: null,
      action_kind: 'copy_link',
    })
  })

  it('rejects unsupported share action kinds', async () => {
    const result =
      await recordLiveShareAction({
        actionKind: 'opened_link' as never,
        guestSessionId: GUEST,
      })

    expect(result).toEqual({
      ok: false,
      reason: 'invalid_action',
    })

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('fails closed when the canonical state is not a stable LIVE', async () => {
    mocks.getCanonicalLiveState.mockResolvedValue({
      status: 'OFFLINE',
    })

    mocks.liveKeyFromState.mockReturnValue(null)

    const result =
      await recordLiveShareAction({
        actionKind: 'native_share',
        guestSessionId: GUEST,
      })

    expect(result).toEqual({
      ok: false,
      reason: 'not_live',
    })

    expect(
      mocks.getVerifiedRouteProfile,
    ).not.toHaveBeenCalled()

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('requires guest identity when no authenticated member exists', async () => {
    const result =
      await recordLiveShareAction({
        actionKind: 'copy_link',
      })

    expect(result).toEqual({
      ok: false,
      reason: 'identity_required',
    })

    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('degrades database failures to unavailable', async () => {
    mocks.insert.mockResolvedValue({
      error: {
        message: 'db unavailable',
      },
    })

    await expect(
      recordLiveShareAction({
        actionKind: 'native_share',
        guestSessionId: GUEST,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})