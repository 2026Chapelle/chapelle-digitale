import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'

const FIX = join(
  process.cwd(),
  'supabase/migrations/20260717124500_citadelle_erp_lot6_invitation_expiry_guard.sql',
)

describe('Lot 6 — expiry guard migration static', () => {
  const sql = readFileSync(FIX, 'utf8')

  it('transaction BEGIN/COMMIT', () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/m)
    expect(sql.includes('\nCOMMIT;') || sql.trim().endsWith('COMMIT;')).toBe(true)
  })

  it('accept: profile d’abord, expire atomique RETURN NULL sans RAISE expired', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.erp_unit_invitation_accept')
    // profile check appears before invitation FOR UPDATE path mutations on expire
    const profileIdx = sql.indexOf("RAISE EXCEPTION 'Lot6: profile required'")
    const expireReturnIdx = sql.indexOf('RETURN NULL;')
    expect(profileIdx).toBeGreaterThan(0)
    expect(expireReturnIdx).toBeGreaterThan(profileIdx)
    expect(sql).toContain("status = 'expired'")
    expect(sql).toContain("'invite_expire'")
    expect(sql).not.toContain("RAISE EXCEPTION 'Lot6: invitation expired'")
  })

  it('nominate: garde organization_members active', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.erp_unit_membership_nominate')
    expect(sql).toContain('target active organization membership required')
    expect(sql).toMatch(
      /organization_members[\s\S]*organization_id\s*=\s*p_org_id[\s\S]*user_id\s*=\s*p_user_id[\s\S]*status\s*=\s*'active'/,
    )
  })

  it('EXECUTE service_role only sur accept + nominate', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.erp_unit_invitation_accept\(text,\s*uuid,\s*text\) FROM PUBLIC,\s*anon,\s*authenticated/,
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.erp_unit_invitation_accept\(text,\s*uuid,\s*text\) TO service_role/,
    )
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.erp_unit_membership_nominate/,
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.erp_unit_membership_nominate/,
    )
  })
})

const rpcMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { rpc: (...args: unknown[]) => rpcMock(...args) },
  IS_DEMO_MODE: false,
}))
vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: vi.fn(),
}))

import { rpcAcceptInvitation, rpcNominate } from '@/lib/erp/unit-governance-rpc'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import * as acceptRoute from '@/app/api/invite/unit/accept/route'

describe('Lot 6 — rpcAcceptInvitation NULL → invitation_expired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('RPC data null → error invitation_expired (pas de succès)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    const res = await rpcAcceptInvitation({
      tokenHash: 'abc',
      userId: 'u1',
      email: 'a@b.c',
    })
    expect(res.id).toBeNull()
    expect(res.error).toBe('invitation_expired')
  })

  it('RPC data uuid → succès', async () => {
    rpcMock.mockResolvedValue({ data: 'mem-1', error: null })
    const res = await rpcAcceptInvitation({
      tokenHash: 'abc',
      userId: 'u1',
      email: 'a@b.c',
    })
    expect(res.id).toBe('mem-1')
    expect(res.error).toBeNull()
  })
})

describe('Lot 6 — accept route HTTP 400 invitation_expired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('backend convertit NULL RPC en HTTP 400 invitation_expired', async () => {
    ;(getVerifiedRouteProfile as any).mockResolvedValue({
      uid: 'user-1',
      email: 'u@x.com',
    })
    rpcMock.mockResolvedValue({ data: null, error: null })
    const req = new NextRequest('http://localhost/api/invite/unit/accept', { method: 'POST' })
    // @ts-ignore
    req.json = vi.fn().mockResolvedValue({ token: 'a-valid-token-32chars-minimum!!' })
    const res = await acceptRoute.POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.message).toBe('invitation_expired')
    expect(body.code).toBe('invitation_expired')
  })
})

describe('Lot 6 — nominate org membership guard (messages RPC)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('nomination refusée sans membership organisationnelle active', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'Lot6: target active organization membership required' },
    })
    const res = await rpcNominate({
      orgId: 'org',
      unitId: 'u',
      userId: 'subject',
      role: 'member',
      actorId: 'actor',
    })
    expect(res.id).toBeNull()
    expect(res.error).toMatch(/target active organization membership required/)
  })

  it('nomination autorisée si membership org active (RPC OK)', async () => {
    rpcMock.mockResolvedValue({ data: 'mem-ok', error: null })
    const res = await rpcNominate({
      orgId: 'org',
      unitId: 'u',
      userId: 'subject',
      role: 'member',
      actorId: 'actor',
    })
    expect(res.id).toBe('mem-ok')
    expect(res.error).toBeNull()
  })
})

describe('Lot 6 — invariants expiration déclarés SQL (static preuve)', () => {
  const sql = readFileSync(FIX, 'utf8')

  it('expiration: statut expired + invite_expire + RETURN NULL', () => {
    // Preuve statique du contrat DB : RPC retourne NULL après writes
    expect(sql).toMatch(/status\s*=\s*'expired'/)
    expect(sql).toContain("'invite_expire'")
    expect(sql).toMatch(/RETURN NULL\s*;/)
  })
})
