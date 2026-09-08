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
  rpc: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/live/canonical-server', () => ({
  getCanonicalLiveState: mocks.getCanonicalLiveState,
  liveKeyFromState: mocks.liveKeyFromState,
}))

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: mocks.getVerifiedRouteProfile,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    rpc: mocks.rpc,
  },
}))

import {
  LIVE_HEARTBEAT_INTERVAL_MS,
  LIVE_PRESENCE_TTL_MS,
  getLivePresenceCounts,
  hashGuestSessionId,
  heartbeatLivePresence,
  joinLivePresence,
  normalizeGuestSessionId,
} from './live-participation-server'

const LIVE_KEY = 'youtube:ABCDEFGHIJK'
const GUEST_UUID =
  '550e8400-e29b-41d4-a716-446655440000'

const GUEST_HASH =
  'a3a9e1ed9732cab28868127be00f1ce921acaefdd5c3b23a6e9e0072bd9c1a34'

describe('LIVE 4A.2 server presence engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getCanonicalLiveState.mockResolvedValue({
      status: 'LIVE',
      title: 'Culte Royal',
      youtubeVideoId: 'ABCDEFGHIJK',
      watchUrl: '/live',
    })

    mocks.liveKeyFromState.mockReturnValue(LIVE_KEY)
    mocks.getVerifiedRouteProfile.mockResolvedValue(null)
    mocks.rpc.mockResolvedValue({
      data: null,
      error: null,
    })
  })

  it('keeps the agreed 30s heartbeat and 90s active TTL', () => {
    expect(LIVE_HEARTBEAT_INTERVAL_MS).toBe(30_000)
    expect(LIVE_PRESENCE_TTL_MS).toBe(90_000)
  })

  it('normalizes and hashes guest UUIDs without exposing the raw UUID to the database', async () => {
    expect(
      normalizeGuestSessionId(
        GUEST_UUID.toUpperCase(),
      ),
    ).toBe(GUEST_UUID)

    expect(
      hashGuestSessionId(GUEST_UUID),
    ).toBe(GUEST_HASH)

    const result = await joinLivePresence({
      guestSessionId: GUEST_UUID,
    })

    expect(result).toEqual({
      ok: true,
      liveKey: LIVE_KEY,
      participantKind: 'guest',
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'live_presence_join',
      {
        p_live_key: LIVE_KEY,
        p_user_id: null,
        p_guest_session_hash: GUEST_HASH,
      },
    )

    expect(
      JSON.stringify(
        mocks.rpc.mock.calls[0]?.[1],
      ),
    ).not.toContain(GUEST_UUID)
  })

  it('derives member identity from the verified server profile and passes the guest hash only for atomic merge', async () => {
    mocks.getVerifiedRouteProfile.mockResolvedValue({
      uid: '11111111-1111-4111-8111-111111111111',
      role: 'membre',
      email: 'member@example.test',
      profile: {
        id: '11111111-1111-4111-8111-111111111111',
      },
    })

    const result = await joinLivePresence({
      guestSessionId: GUEST_UUID,
    })

    expect(result).toEqual({
      ok: true,
      liveKey: LIVE_KEY,
      participantKind: 'member',
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'live_presence_join',
      {
        p_live_key: LIVE_KEY,
        p_user_id: '11111111-1111-4111-8111-111111111111',
        p_guest_session_hash: GUEST_HASH,
      },
    )
  })

  it('allows an authenticated member without requiring a guest UUID', async () => {
    mocks.getVerifiedRouteProfile.mockResolvedValue({
      uid: '22222222-2222-4222-8222-222222222222',
      role: 'membre',
      email: null,
      profile: {
        id: '22222222-2222-4222-8222-222222222222',
      },
    })

    const result = await joinLivePresence()

    expect(result.ok).toBe(true)

    expect(mocks.rpc).toHaveBeenCalledWith(
      'live_presence_join',
      {
        p_live_key: LIVE_KEY,
        p_user_id: '22222222-2222-4222-8222-222222222222',
        p_guest_session_hash: null,
      },
    )
  })

  it('fails closed outside canonical LIVE before touching identity or database', async () => {
    mocks.getCanonicalLiveState.mockResolvedValue({
      status: 'OFFLINE',
    })

    mocks.liveKeyFromState.mockReturnValue(null)

    const result = await joinLivePresence({
      guestSessionId: GUEST_UUID,
    })

    expect(result).toEqual({
      ok: false,
      reason: 'not_live',
    })

    expect(
      mocks.getVerifiedRouteProfile,
    ).not.toHaveBeenCalled()

    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('requires a valid guest UUID when no member session exists', async () => {
    const result = await joinLivePresence({
      guestSessionId: 'invalid',
    })

    expect(result).toEqual({
      ok: false,
      reason: 'identity_required',
    })

    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('heartbeats an existing guest without silently creating a new join', async () => {
    mocks.rpc.mockResolvedValue({
      data: false,
      error: null,
    })

    const result = await heartbeatLivePresence({
      guestSessionId: GUEST_UUID,
    })

    expect(result).toEqual({
      ok: true,
      liveKey: LIVE_KEY,
      participantKind: 'guest',
      active: false,
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'live_presence_heartbeat',
      {
        p_live_key: LIVE_KEY,
        p_user_id: null,
        p_guest_session_hash: GUEST_HASH,
      },
    )

    expect(
      mocks.rpc.mock.calls.some(
        ([name]) => name === 'live_presence_join',
      ),
    ).toBe(false)
  })

  it('lets an authenticated heartbeat promote an existing guest atomically', async () => {
    mocks.getVerifiedRouteProfile.mockResolvedValue({
      uid: '33333333-3333-4333-8333-333333333333',
      role: 'membre',
      email: null,
      profile: {
        id: '33333333-3333-4333-8333-333333333333',
      },
    })

    mocks.rpc.mockResolvedValue({
      data: true,
      error: null,
    })

    const result = await heartbeatLivePresence({
      guestSessionId: GUEST_UUID,
    })

    expect(result).toEqual({
      ok: true,
      liveKey: LIVE_KEY,
      participantKind: 'member',
      active: true,
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'live_presence_heartbeat',
      {
        p_live_key: LIVE_KEY,
        p_user_id: '33333333-3333-4333-8333-333333333333',
        p_guest_session_hash: GUEST_HASH,
      },
    )
  })

  it('counts active participants from a server-generated 90-second cutoff', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        active_total: 12,
        active_members: 7,
        active_guests: 5,
        joined_total: 31,
      }],
      error: null,
    })

    const now = new Date(
      '2026-09-07T22:30:00.000Z',
    )

    const result = await getLivePresenceCounts({
      now,
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'live_presence_counts',
      {
        p_live_key: LIVE_KEY,
        p_active_since:
          '2026-09-07T22:28:30.000Z',
      },
    )

    expect(result).toEqual({
      ok: true,
      liveKey: LIVE_KEY,
      activeTotal: 12,
      activeMembers: 7,
      activeGuests: 5,
      joinedTotal: 31,
    })
  })

  it('returns unavailable instead of leaking database failures', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'db unavailable',
      },
    })

    await expect(
      joinLivePresence({
        guestSessionId: GUEST_UUID,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})