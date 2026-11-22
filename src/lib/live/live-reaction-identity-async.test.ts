import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
  getUser: vi.fn(),
  profile: vi.fn(),
  demo: false,
}))

vi.mock('server-only', () => ({}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
  headers: mocks.headers,
}))

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => ({
    auth: { getUser: mocks.getUser },
  }),
}))

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: mocks.profile,
}))

vi.mock('@/lib/supabase', () => ({
  get IS_DEMO_MODE() {
    return mocks.demo
  },
}))

import { resolveLiveReactionActor } from './live-reaction-identity-server'

const GUEST = '11111111-1111-4111-8111-111111111111'

describe('Next.js 15 - asynchronous live reaction identity', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mocks.demo = false

    mocks.cookies.mockResolvedValue({
      getAll: () => [],
    })

    mocks.headers.mockResolvedValue({
      get: () => null,
    })

    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    mocks.profile.mockResolvedValue(null)
  })

  it('accepts a valid guest with asynchronous request APIs', async () => {
    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: true,
        actorKey: expect.stringMatching(/^guest:[0-9a-f]{64}$/),
      })
  })

  it('resolves a verified matching authenticated member', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'member-test' } },
      error: null,
    })

    mocks.profile.mockResolvedValue({
      uid: 'member-test',
    })

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: true,
        actorKey: 'member:member-test',
      })
  })

  it.each([
    'sb-test-auth-token',
    'sb-test-auth-token.0',
    'supabase-auth-token',
  ])('never downgrades a presented session to guest: %s', async (name) => {
    mocks.cookies.mockResolvedValue({
      getAll: () => [{ name }],
    })

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: false,
        reason: 'identity_required',
      })
  })

  it('rejects an unverified Authorization header', async () => {
    mocks.headers.mockResolvedValue({
      get: (name: string) =>
        name === 'authorization'
          ? 'Bearer unverified-test'
          : null,
    })

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: false,
        reason: 'identity_required',
      })

    expect(mocks.cookies).not.toHaveBeenCalled()
  })

  it('fails closed when headers promise rejects', async () => {
    mocks.headers.mockRejectedValue(
      new Error('headers unavailable'),
    )

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      })

    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it('fails closed when cookies promise rejects', async () => {
    mocks.cookies.mockRejectedValue(
      new Error('cookies unavailable'),
    )

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      })

    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it('rejects a mismatch between auth user and verified profile', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'member-a' } },
      error: null,
    })

    mocks.profile.mockResolvedValue({
      uid: 'member-b',
    })

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      })
  })

  it('allows guest fallback only for an unpresented missing session', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: {
        status: 400,
        name: 'AuthSessionMissingError',
      },
    })

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: true,
        actorKey: expect.stringMatching(/^guest:[0-9a-f]{64}$/),
      })

    mocks.cookies.mockResolvedValue({
      getAll: () => [{ name: 'sb-test-auth-token' }],
    })

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: false,
        reason: 'identity_required',
      })
  })

  it('does not authorize an invalid guest identifier', async () => {
    await expect(resolveLiveReactionActor('invalid'))
      .resolves.toEqual({
        ok: false,
        reason: 'identity_required',
      })
  })

  it('does not run identity services in demo mode', async () => {
    mocks.demo = true

    await expect(resolveLiveReactionActor(GUEST))
      .resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      })

    expect(mocks.headers).not.toHaveBeenCalled()
    expect(mocks.getUser).not.toHaveBeenCalled()
  })
})
