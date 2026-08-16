import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const isAdminRequest = vi.fn((..._a: unknown[]) => true)
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: (...a: unknown[]) => isAdminRequest(...a) }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
  clientIp: vi.fn(() => '127.0.0.1'),
}))

const from = vi.fn()
vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false, supabaseAdmin: { from: (...a: unknown[]) => from(...a) } }))

const grantEntitlementByAdmin = vi.fn()
const revokeEntitlementForUser = vi.fn()
const getEntitlementStatus = vi.fn()
vi.mock('@/lib/podcast/premium-acquisition', () => ({
  PODCAST_PREMIUM_ENTITLEMENT_KEY: 'podcast_premium',
  grantEntitlementByAdmin: (...a: unknown[]) => grantEntitlementByAdmin(...a),
  revokeEntitlementForUser: (...a: unknown[]) => revokeEntitlementForUser(...a),
  getEntitlementStatus: (...a: unknown[]) => getEntitlementStatus(...a),
}))

import { GET, POST } from '@/app/api/admin/podcast-premium/route'

function chain(result: unknown): any {
  const p = Promise.resolve(result)
  return new Proxy({}, { get(_t, prop) {
    if (prop === 'then') return p.then.bind(p)
    if (prop === 'maybeSingle') return () => p
    return () => chain(result)
  } })
}

function req(body?: unknown, url = 'http://localhost/api/admin/podcast-premium') {
  return new NextRequest(url, body === undefined
    ? { method: 'GET' }
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequest.mockReturnValue(true)
  getEntitlementStatus.mockResolvedValue({ active: true, rows: [] })
  // profiles lookups: target exists by default
  from.mockImplementation(() => ({
    select: () => chain({ data: { id: 'u1' }, error: null }),
  }))
})

describe('GET /api/admin/podcast-premium', () => {
  it('non-admin → 401', async () => {
    isAdminRequest.mockReturnValue(false)
    expect((await GET(req())).status).toBe(401)
  })
  it('user_id → statut détaillé', async () => {
    getEntitlementStatus.mockResolvedValue({ active: true, rows: [{ source_type: 'admin' }] })
    const res = await GET(req(undefined, 'http://localhost/api/admin/podcast-premium?user_id=u1'))
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.data.active).toBe(true)
  })
})

describe('POST /api/admin/podcast-premium', () => {
  it('non-admin → 401', async () => {
    isAdminRequest.mockReturnValue(false)
    expect((await POST(req({ action: 'grant', user_id: 'u1' }))).status).toBe(401)
  })

  it('user_id manquant → 400', async () => {
    expect((await POST(req({ action: 'grant' }))).status).toBe(400)
  })

  it('membre introuvable → 404', async () => {
    from.mockImplementation(() => ({ select: () => chain({ data: null, error: null }) }))
    expect((await POST(req({ action: 'grant', user_id: 'ghost' }))).status).toBe(404)
  })

  it('grant valide → appelle grantEntitlementByAdmin, 200', async () => {
    grantEntitlementByAdmin.mockResolvedValue({ granted: true, idempotent: false })
    const res = await POST(req({ action: 'grant', user_id: 'u1' }))
    expect(res.status).toBe(200)
    expect(grantEntitlementByAdmin).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: 'u1', entitlementKey: 'podcast_premium', expiresAt: null }))
  })

  it('grant avec expires_at PASSÉ → 400, aucun octroi', async () => {
    const res = await POST(req({ action: 'grant', user_id: 'u1', expires_at: '2000-01-01T00:00:00.000Z' }))
    expect(res.status).toBe(400)
    expect(grantEntitlementByAdmin).not.toHaveBeenCalled()
  })

  it('grant avec expires_at futur → transmis', async () => {
    grantEntitlementByAdmin.mockResolvedValue({ granted: true, idempotent: false })
    await POST(req({ action: 'grant', user_id: 'u1', expires_at: '2099-01-01T00:00:00.000Z' }))
    expect(grantEntitlementByAdmin).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ expiresAt: '2099-01-01T00:00:00.000Z' }))
  })

  it('revoke → appelle revokeEntitlementForUser, 200', async () => {
    revokeEntitlementForUser.mockResolvedValue({ revoked: true })
    const res = await POST(req({ action: 'revoke', user_id: 'u1' }))
    expect(res.status).toBe(200)
    expect(revokeEntitlementForUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: 'u1', entitlementKey: 'podcast_premium' }))
  })

  it('action inconnue → 400', async () => {
    expect((await POST(req({ action: 'delete', user_id: 'u1' }))).status).toBe(400)
  })
})
