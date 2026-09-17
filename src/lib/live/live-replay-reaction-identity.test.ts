import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getUser: vi.fn(),
  headers: vi.fn(),
  profile: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
  headers: mocks.headers,
}))
vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: mocks.profile,
}))

import {
  LIVE_REPLAY_GUEST_COOKIE,
  ReplayReactionIdentityError,
  hashReplayGuestToken,
  resolveReplayReactionIdentity,
} from './live-replay-reaction-identity'

const SECRET = 's'.repeat(32)
const RETURNING_TOKEN = 'a'.repeat(43)
const originalSecret = process.env.LIVE_REPLAY_GUEST_SECRET

function cookieStore(replayToken?: string, authPresented = false) {
  const entries = [
    ...(replayToken === undefined
      ? []
      : [{ name: LIVE_REPLAY_GUEST_COOKIE, value: replayToken }]),
    ...(authPresented
      ? [{ name: 'sb-nvyuyffywnuollaxguen-auth-token', value: 'presented' }]
      : []),
  ]

  return {
    get: (name: string) => entries.find((entry) => entry.name === name),
    getAll: () => entries,
  }
}

describe('LIVE 4C replay reaction identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LIVE_REPLAY_GUEST_SECRET = SECRET
    mocks.cookies.mockReturnValue(cookieStore())
    mocks.headers.mockReturnValue({ get: () => null })
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mocks.profile.mockResolvedValue(null)
  })

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.LIVE_REPLAY_GUEST_SECRET
    else process.env.LIVE_REPLAY_GUEST_SECRET = originalSecret
  })

  it('uses a deterministic keyed 64-hex digest', () => {
    const first = hashReplayGuestToken('token-a', SECRET)
    const same = hashReplayGuestToken('token-a', SECRET)
    const otherSecret = hashReplayGuestToken('token-a', 'y'.repeat(32))

    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(same).toBe(first)
    expect(otherSecret).not.toBe(first)
  })

  it('rejects secrets shorter than 32 characters', () => {
    expect(() => hashReplayGuestToken('token-a', 'short')).toThrow(
      'LIVE_REPLAY_GUEST_SECRET_INVALID',
    )
  })

  it('creates a private guest identity when no valid cookie exists', async () => {
    const result = await resolveReplayReactionIdentity()

    expect(result.identity).toEqual({
      kind: 'guest',
      actorKey: expect.stringMatching(/^guest:[0-9a-f]{64}$/),
      userId: null,
      guestActorKey: expect.stringMatching(/^guest:[0-9a-f]{64}$/),
    })
    expect(result.newGuestToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(result.identity.actorKey).toBe(
      `guest:${hashReplayGuestToken(result.newGuestToken!, SECRET)}`,
    )
  })

  it('reuses a valid returning guest cookie without rotating it', async () => {
    mocks.cookies.mockReturnValue(cookieStore(RETURNING_TOKEN))

    await expect(resolveReplayReactionIdentity()).resolves.toEqual({
      identity: {
        kind: 'guest',
        actorKey: `guest:${hashReplayGuestToken(RETURNING_TOKEN, SECRET)}`,
        userId: null,
        guestActorKey: `guest:${hashReplayGuestToken(RETURNING_TOKEN, SECRET)}`,
      },
      newGuestToken: null,
    })
  })

  it('regenerates an invalid replay guest cookie', async () => {
    mocks.cookies.mockReturnValue(cookieStore('invalid cookie'))

    const result = await resolveReplayReactionIdentity()

    expect(result.identity.kind).toBe('guest')
    expect(result.newGuestToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(result.newGuestToken).not.toBe('invalid cookie')
  })

  it('returns a verified member and its prior guest key for atomic transfer', async () => {
    mocks.cookies.mockReturnValue(cookieStore(RETURNING_TOKEN))
    mocks.getUser.mockResolvedValue({
      data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
      error: null,
    })
    mocks.profile.mockResolvedValue({
      uid: '11111111-1111-4111-8111-111111111111',
    })

    await expect(resolveReplayReactionIdentity()).resolves.toEqual({
      identity: {
        kind: 'member',
        actorKey: 'member:11111111-1111-4111-8111-111111111111',
        userId: '11111111-1111-4111-8111-111111111111',
        guestActorKey: `guest:${hashReplayGuestToken(RETURNING_TOKEN, SECRET)}`,
      },
      newGuestToken: null,
    })
    expect(mocks.profile).toHaveBeenCalledOnce()
  })

  it('rejects presented invalid authentication instead of falling back to guest', async () => {
    mocks.cookies.mockReturnValue(cookieStore(undefined, true))
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401, name: 'AuthApiError' },
    })

    await expect(resolveReplayReactionIdentity()).rejects.toMatchObject({
      name: 'ReplayReactionIdentityError',
      reason: 'identity_required',
    })
  })

  it('allows a guest when Supabase reports no unpresented session', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 400, name: 'AuthSessionMissingError' },
    })

    await expect(resolveReplayReactionIdentity()).resolves.toMatchObject({
      identity: { kind: 'guest' },
    })
  })

  it('fails closed when authentication is unavailable or the profile mismatches', async () => {
    mocks.getUser.mockRejectedValueOnce(new Error('network'))
    await expect(resolveReplayReactionIdentity()).rejects.toEqual(
      new ReplayReactionIdentityError('unavailable'),
    )

    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'member-a' } },
      error: null,
    })
    mocks.profile.mockResolvedValue({ uid: 'member-b' })
    await expect(resolveReplayReactionIdentity()).rejects.toMatchObject({
      reason: 'unavailable',
    })
  })
})
