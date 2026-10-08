import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createMiddlewareClient: vi.fn(({ res }: { res: any }) => {
    res.cookies.set('sb-refresh-token', 'refreshed-value', { httpOnly: true })
    return { auth }
  }),
}))

const makeRequest = (pathname = '/member/dashboard') =>
  new NextRequest(`https://citadelle.test${pathname}`)

describe('member auth middleware verification', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://nvyuyffywnuollaxguen.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('redirects to login when getUser returns no verified user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const { middleware } = await import('./middleware')

    const response = await middleware(makeRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login?redirect=%2Fmember%2Fdashboard')
  })

  it('allows a verified user through', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'member-1' } }, error: null })
    const { middleware } = await import('./middleware')

    const response = await middleware(makeRequest())

    expect(response.status).toBe(200)
    expect(auth.getUser).toHaveBeenCalledOnce()
  })

  it('rejects a present session when getUser cannot verify it', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'unverified' } } } })
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('verification failed') })
    const { middleware } = await import('./middleware')

    const response = await middleware(makeRequest())

    expect(response.status).toBe(307)
    expect(auth.getUser).toHaveBeenCalledOnce()
  })

  it('preserves refreshed auth cookies on the pass-through response', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'member-1' } }, error: null })
    const { middleware } = await import('./middleware')

    const response = await middleware(makeRequest())

    expect(response.cookies.get('sb-refresh-token')?.value).toBe('refreshed-value')
  })
})
