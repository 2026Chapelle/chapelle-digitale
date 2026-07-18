/**
 * Tests comportementaux — auth admin nominative + logout.
 * Exercice réel des handlers avec mocks (pas de scan textuel).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const signOut = vi.fn()
const getVerifiedRouteProfile = vi.fn()

vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: vi.fn(() => ({
    auth: { signOut },
  })),
}))

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: (...args: unknown[]) => getVerifiedRouteProfile(...args),
  getSessionProfile: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  ADMIN_SESSION_TOKEN: 'test-admin-token',
  ADMIN_CONFIGURED: true,
  isAdminRequest: vi.fn(),
  isValidAdminToken: vi.fn(),
}))

vi.mock('@/lib/admin/admin-access', () => ({
  isAdminCapable: (role: string | null | undefined) => role === 'admin' || role === 'super_admin',
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ ok: true, remaining: 7, retryAfterSec: 0 })),
  clientIp: vi.fn(() => '127.0.0.1'),
}))

import * as authSupabaseRoute from '@/app/api/admin/auth-supabase/route'
import * as logoutRoute from '@/app/api/admin/logout/route'
import { createRouteClient } from '@/lib/supabase-server'

function post(url: string) {
  return new NextRequest(url, { method: 'POST' })
}

describe('POST /api/admin/auth-supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signOut.mockResolvedValue({ error: null })
  })

  it('sans profil SQL (même avec user_metadata.role=admin côté auth) => 401 + signOut + pas de cookie token', async () => {
    // getVerifiedRouteProfile ignore user_metadata et exige une ligne profiles.
    getVerifiedRouteProfile.mockResolvedValue(null)
    const res = await authSupabaseRoute.POST(post('http://localhost/api/admin/auth-supabase'))
    expect(res.status).toBe(401)
    expect(createRouteClient).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalled()
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).not.toMatch(/cier_admin=test-admin-token/)
    // Cookie legacy éventuel effacé (max-age=0)
    expect(setCookie.toLowerCase()).toMatch(/cier_admin=/)
  })

  it('profil SQL membre => 403 + signOut + pas de cookie token', async () => {
    getVerifiedRouteProfile.mockResolvedValue({
      uid: 'u1',
      role: 'membre',
      email: 'm@x.com',
      profile: { id: 'u1', role: 'membre' },
    })
    const res = await authSupabaseRoute.POST(post('http://localhost/api/admin/auth-supabase'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('not_admin')
    expect(signOut).toHaveBeenCalled()
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).not.toMatch(/cier_admin=test-admin-token/)
  })

  it('profil SQL admin => 200 + cookie cier_admin posé', async () => {
    getVerifiedRouteProfile.mockResolvedValue({
      uid: 'u-admin',
      role: 'admin',
      email: 'a@x.com',
      profile: { id: 'u-admin', role: 'admin' },
    })
    const res = await authSupabaseRoute.POST(post('http://localhost/api/admin/auth-supabase'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(signOut).not.toHaveBeenCalled()
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).toMatch(/cier_admin=test-admin-token/)
  })
})

describe('POST /api/admin/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('révoque la session Supabase et efface le cookie', async () => {
    signOut.mockResolvedValue({ error: null })
    const res = await logoutRoute.POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.sessionRevoked).toBe(true)
    expect(signOut).toHaveBeenCalled()
    const setCookie = (res.headers.get('set-cookie') || '').toLowerCase()
    expect(setCookie).toMatch(/cier_admin=/)
    expect(setCookie).toMatch(/max-age=0/)
  })

  it('efface le cookie même si signOut échoue, status HTTP honnête', async () => {
    signOut.mockResolvedValue({ error: { message: 'network' } })
    const res = await logoutRoute.POST()
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.sessionRevoked).toBe(false)
    const setCookie = (res.headers.get('set-cookie') || '').toLowerCase()
    expect(setCookie).toMatch(/max-age=0/)
  })

  it('efface le cookie si signOut throw', async () => {
    signOut.mockRejectedValue(new Error('boom'))
    const res = await logoutRoute.POST()
    expect(res.status).toBe(502)
    const setCookie = (res.headers.get('set-cookie') || '').toLowerCase()
    expect(setCookie).toMatch(/max-age=0/)
  })
})
