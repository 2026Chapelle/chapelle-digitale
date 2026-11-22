import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  validate: vi.fn(),
  requestAuth: vi.fn(),
  profile: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}))

vi.mock('@/lib/admin-auth', () => ({
  isValidAdminToken: mocks.validate,
  isAdminRequest: mocks.requestAuth,
}))

vi.mock('@/lib/supabase-server', () => ({
  getServerProfile: mocks.profile,
}))

import { resolveAdminContext } from '../admin-context.server'

describe('Next.js 15 - asynchronous admin context', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mocks.cookies.mockResolvedValue({
      get: () => undefined,
    })

    mocks.validate.mockImplementation(
      (token: unknown) => token === 'valid-test-token',
    )

    mocks.requestAuth.mockReturnValue(false)
    mocks.profile.mockResolvedValue(null)
  })

  it('accepts a valid legacy token from asynchronous cookies', async () => {
    mocks.cookies.mockResolvedValue({
      get: (name: string) =>
        name === 'cier_admin'
          ? { value: 'valid-test-token' }
          : undefined,
    })

    const result = await resolveAdminContext()

    expect(result.isAuthenticated).toBe(true)

    expect(mocks.validate).toHaveBeenCalledWith(
      'valid-test-token',
    )
  })

  it('does not grant legacy authentication without a cookie', async () => {
    const result = await resolveAdminContext()

    expect(result.isAuthenticated).toBe(false)
    expect(mocks.validate).toHaveBeenCalledWith(undefined)
  })

  it('rejects an invalid asynchronous cookie token', async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'invalid-test-token' }),
    })

    const result = await resolveAdminContext()

    expect(result.isAuthenticated).toBe(false)

    expect(mocks.validate).toHaveBeenCalledWith(
      'invalid-test-token',
    )
  })

  it('fails closed for rejected cookies without a profile', async () => {
    mocks.cookies.mockRejectedValue(
      new Error('request context unavailable'),
    )

    const result = await resolveAdminContext()

    expect(result.isAuthenticated).toBe(false)
    expect(mocks.validate).not.toHaveBeenCalled()
  })

  it('retains NextRequest authentication without reading cookies', async () => {
    const req = {} as NextRequest

    mocks.requestAuth.mockReturnValue(true)

    const result = await resolveAdminContext(req)

    expect(result.isAuthenticated).toBe(true)
    expect(mocks.requestAuth).toHaveBeenCalledWith(req)
    expect(mocks.cookies).not.toHaveBeenCalled()
  })

  it('does not grant authentication when profile lookup rejects', async () => {
    mocks.profile.mockRejectedValue(
      new Error('profile unavailable'),
    )

    const result = await resolveAdminContext()

    expect(result.isAuthenticated).toBe(false)
  })
})
