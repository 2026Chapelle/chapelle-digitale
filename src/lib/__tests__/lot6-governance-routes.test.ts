import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const supabaseFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args), rpc: vi.fn() },
  IS_DEMO_MODE: false,
}))
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: vi.fn(() => true) }))
vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: vi.fn(),
}))
vi.mock('@/lib/erp/admin-unit-guard', async () => {
  const actual = await vi.importActual<any>('@/lib/erp/admin-unit-guard')
  return {
    ...actual,
    requireGuardedAdminUnit: vi.fn(),
  }
})
vi.mock('@/lib/erp/unit-access', async () => {
  const actual = await vi.importActual<any>('@/lib/erp/unit-access')
  return {
    ...actual,
    assertUnitAccess: vi.fn(),
  }
})
vi.mock('@/lib/erp/unit-governance-rpc', () => ({
  rpcNominate: vi.fn(),
  rpcSetStatus: vi.fn(),
  rpcChangeRole: vi.fn(),
  rpcTransfer: vi.fn(),
  rpcAcceptInvitation: vi.fn(),
  hashInviteToken: (t: string) => `h:${t}`,
  generateInviteToken: () => 'tok',
}))
vi.mock('@/lib/erp/unit-governance-repository', async () => {
  const actual = await vi.importActual<any>('@/lib/erp/unit-governance-repository')
  return {
    ...actual,
    getMembershipById: vi.fn(),
    revokeInvitation: vi.fn(),
    createInvitation: vi.fn(),
  }
})

import { requireGuardedAdminUnit } from '@/lib/erp/admin-unit-guard'
import { assertUnitAccess, UnitAccessError } from '@/lib/erp/unit-access'
import {
  rpcNominate,
  rpcSetStatus,
  rpcChangeRole,
  rpcTransfer,
  rpcAcceptInvitation,
} from '@/lib/erp/unit-governance-rpc'
import { getMembershipById, revokeInvitation } from '@/lib/erp/unit-governance-repository'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import * as membershipsRoute from '@/app/api/admin/organization-unit-memberships/route'
import * as membershipByIdRoute from '@/app/api/admin/organization-unit-memberships/[id]/route'
import * as transferRoute from '@/app/api/admin/organization-unit-memberships/[id]/transfer/route'
import * as revokeRoute from '@/app/api/admin/organization-unit-invitations/[id]/revoke/route'
import * as acceptRoute from '@/app/api/invite/unit/accept/route'

function actor(role: string, home = 'ci-1') {
  return {
    userId: 'actor-1',
    email: 'a@x.com',
    organizationId: 'org-1',
    memberships: [
      {
        id: 'm',
        organization_id: 'org-1',
        organization_unit_id: home,
        user_id: 'actor-1',
        unit_role: role,
        status: 'active',
        is_primary: true,
        unit: {
          id: home,
          materialized_path: `/${home}/`,
          unit_type: role === 'zone_admin' ? 'continental_zone' : 'national_central_church',
        },
      },
    ],
    homeUnitIds: [home],
    isWorldScope: role.startsWith('world_'),
    highestRole: role,
  }
}

function guarded(role = 'zone_admin', home = 'af-1') {
  return {
    actor: actor(role, home),
    organizationId: 'org-1',
    userId: 'actor-1',
    email: 'a@x.com',
  }
}

function mockReq(method: string, url: string, body?: unknown) {
  const req = new NextRequest(url, { method })
  if (body !== undefined) {
    // @ts-ignore
    req.json = vi.fn().mockResolvedValue(body)
  }
  return req
}

const memRow = {
  id: 'mem-1',
  organization_id: 'org-1',
  organization_unit_id: 'ci-1',
  user_id: 'user-2',
  unit_role: 'national_admin',
  status: 'active',
  is_primary: false,
}

describe('Lot 6 — memberships routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST refuse organization_id client', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded())
    const res = await membershipsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships', {
        organization_id: 'evil',
        organization_unit_id: 'u1',
        user_id: 'u2',
        unit_role: 'member',
      }),
    )
    expect(res.status).toBe(400)
    expect(rpcNominate).not.toHaveBeenCalled()
  })

  it('POST refuse actor_user_id client', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded())
    const res = await membershipsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships', {
        actor_user_id: 'evil-actor',
        organization_unit_id: 'ci-1',
        user_id: 'u2',
        unit_role: 'member',
      }),
    )
    expect(res.status).toBe(400)
    expect(rpcNominate).not.toHaveBeenCalled()
  })

  it('POST auto-promotion refuse', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue({
      ...guarded('national_admin', 'ci-1'),
      actor: actor('national_admin', 'ci-1'),
    })
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    const res = await membershipsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships', {
        organization_unit_id: 'ci-1',
        user_id: 'actor-1',
        unit_role: 'zone_admin',
      }),
    )
    expect([403, 400]).toContain(res.status)
    expect(rpcNominate).not.toHaveBeenCalled()
  })

  it('POST nominate appelle RPC avec actor serveur (ignore client)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcNominate as any).mockResolvedValue({ id: 'mem-new', error: null })
    const res = await membershipsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships', {
        organization_unit_id: 'ci-1',
        user_id: 'user-2',
        unit_role: 'national_admin',
      }),
    )
    expect(res.status).toBe(200)
    expect(rpcNominate).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        unitId: 'ci-1',
        userId: 'user-2',
        role: 'national_admin',
        actorId: 'actor-1',
      }),
    )
  })
})

describe('Lot 6 — transfer route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transfert autorisé appelle RPC avec actor serveur', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockImplementation(async (_a: unknown, unitId: string) => ({
      id: unitId,
      unit_type: unitId === 'ci-2' ? 'national_central_church' : 'national_central_church',
      name: unitId,
    }))
    ;(rpcTransfer as any).mockResolvedValue({ id: 'mem-t', error: null })
    const res = await transferRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships/mem-1/transfer', {
        to_unit_id: 'ci-2',
        unit_role: 'national_admin',
        organization_id: 'evil-org',
        actor_user_id: 'evil-actor',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(200)
    expect(getMembershipById).toHaveBeenCalledWith('org-1', 'mem-1')
    expect(rpcTransfer).toHaveBeenCalledWith({
      membershipId: 'mem-1',
      toUnitId: 'ci-2',
      actorId: 'actor-1',
      role: 'national_admin',
    })
  })

  it('transfert hors périmètre refusé', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockImplementation(async (_a: unknown, unitId: string) => {
      if (unitId === 'ci-1') {
        return { id: 'ci-1', unit_type: 'national_central_church', name: 'CI' }
      }
      throw new UnitAccessError('Hors périmètre', 403)
    })
    const res = await transferRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships/mem-1/transfer', {
        to_unit_id: 'eu-99',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(403)
    expect(rpcTransfer).not.toHaveBeenCalled()
  })
})

describe('Lot 6 — change role / status route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('PATCH refuse organization_id / user_id client', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded())
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/mem-1', {
        organization_id: 'evil',
        unit_role: 'member',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(400)
    expect(rpcChangeRole).not.toHaveBeenCalled()
    expect(rpcSetStatus).not.toHaveBeenCalled()
  })

  it('changement de rôle autorisé', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcChangeRole as any).mockResolvedValue({ id: 'mem-1', error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/mem-1', {
        unit_role: 'staff',
        actor_user_id: 'evil',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(200)
    expect(rpcChangeRole).toHaveBeenCalledWith({
      membershipId: 'mem-1',
      newRole: 'staff',
      actorId: 'actor-1',
    })
  })

  it('rôle supérieur / pair refusé (non attribuable)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/mem-1', {
        unit_role: 'zone_admin',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(403)
    expect(rpcChangeRole).not.toHaveBeenCalled()
  })

  it('suspension', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcSetStatus as any).mockResolvedValue({ id: 'mem-1', error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/mem-1', {
        status: 'suspended',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(200)
    expect(rpcSetStatus).toHaveBeenCalledWith({
      membershipId: 'mem-1',
      status: 'suspended',
      actorId: 'actor-1',
      notes: null,
    })
  })

  it('réactivation', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(getMembershipById as any).mockResolvedValue({ ...memRow, status: 'suspended' })
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcSetStatus as any).mockResolvedValue({ id: 'mem-1', error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/mem-1', {
        status: 'active',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(200)
    expect(rpcSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', actorId: 'actor-1' }),
    )
  })

  it('retrait', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcSetStatus as any).mockResolvedValue({ id: 'mem-1', error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/mem-1', {
        status: 'removed',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(200)
    expect(rpcSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'removed', actorId: 'actor-1' }),
    )
  })

  it('dernier world_super_admin protégé (erreur RPC remontée)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('world_super_admin', 'hq-1'))
    ;(getMembershipById as any).mockResolvedValue({
      ...memRow,
      unit_role: 'world_super_admin',
      organization_unit_id: 'hq-1',
    })
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'hq-1',
      unit_type: 'world_headquarters',
      name: 'HQ',
    })
    ;(rpcSetStatus as any).mockResolvedValue({
      id: null,
      error: 'Lot6: cannot suspend/remove last world_super_admin',
    })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/mem-1', {
        status: 'removed',
      }),
      { params: { id: 'mem-1' } },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/last world_super_admin/i)
  })
})

describe('Lot 6 — revoke invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('révocation d’invitation autorisée', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', 'af-1'))
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'inv-1',
        organization_unit_id: 'ci-1',
        organization_id: 'org-1',
      },
      error: null,
    })
    supabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
    })
    ;(assertUnitAccess as any).mockResolvedValue({
      id: 'ci-1',
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(revokeInvitation as any).mockResolvedValue(undefined)
    const res = await revokeRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations/inv-1/revoke', {
        organization_id: 'evil',
        actor_user_id: 'evil',
      }),
      { params: { id: 'inv-1' } },
    )
    expect(res.status).toBe(200)
    expect(revokeInvitation).toHaveBeenCalledWith({
      orgId: 'org-1',
      invitationId: 'inv-1',
      actorId: 'actor-1',
    })
  })

  it('révocation hors org introuvable', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded())
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    supabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
    })
    const res = await revokeRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations/inv-x/revoke', {}),
      { params: { id: 'inv-x' } },
    )
    expect(res.status).toBe(404)
    expect(revokeInvitation).not.toHaveBeenCalled()
  })
})

describe('Lot 6 — accept invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('acceptation d’invitation valide', async () => {
    ;(getVerifiedRouteProfile as any).mockResolvedValue({
      uid: 'user-9',
      email: 'Invitee@Example.COM',
    })
    ;(rpcAcceptInvitation as any).mockResolvedValue({ id: 'mem-acc', error: null })
    const res = await acceptRoute.POST(
      mockReq('POST', 'http://localhost/api/invite/unit/accept', {
        token: 'a-valid-token-32chars-minimum!!',
        organization_id: 'evil',
        actor_user_id: 'evil',
        user_id: 'forged',
      }),
    )
    expect(res.status).toBe(200)
    expect(rpcAcceptInvitation).toHaveBeenCalledWith({
      tokenHash: 'h:a-valid-token-32chars-minimum!!',
      userId: 'user-9',
      email: 'invitee@example.com',
    })
  })

  it('token expiré refusé', async () => {
    ;(getVerifiedRouteProfile as any).mockResolvedValue({ uid: 'user-9', email: 'u@x.com' })
    ;(rpcAcceptInvitation as any).mockResolvedValue({
      id: null,
      error: 'Lot6: invitation expired',
    })
    const res = await acceptRoute.POST(
      mockReq('POST', 'http://localhost/api/invite/unit/accept', {
        token: 'expired-token-value-here-ok',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/expired/i)
  })

  it('token révoqué ou consommé refusé', async () => {
    ;(getVerifiedRouteProfile as any).mockResolvedValue({ uid: 'user-9', email: 'u@x.com' })
    ;(rpcAcceptInvitation as any).mockResolvedValue({
      id: null,
      error: 'Lot6: invitation not pending',
    })
    const res = await acceptRoute.POST(
      mockReq('POST', 'http://localhost/api/invite/unit/accept', {
        token: 'revoked-or-consumed-token-xx',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/not pending/i)
  })

  it('email mismatch refusé', async () => {
    ;(getVerifiedRouteProfile as any).mockResolvedValue({ uid: 'user-9', email: 'other@x.com' })
    ;(rpcAcceptInvitation as any).mockResolvedValue({
      id: null,
      error: 'Lot6: email mismatch',
    })
    const res = await acceptRoute.POST(
      mockReq('POST', 'http://localhost/api/invite/unit/accept', {
        token: 'valid-token-for-email-test!!',
      }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.message).toMatch(/email mismatch/i)
  })

  it('organization_members suspended/removed refusée', async () => {
    ;(getVerifiedRouteProfile as any).mockResolvedValue({ uid: 'user-9', email: 'u@x.com' })
    ;(rpcAcceptInvitation as any).mockResolvedValue({
      id: null,
      error: 'Lot6: organization membership suspended or removed',
    })
    const res = await acceptRoute.POST(
      mockReq('POST', 'http://localhost/api/invite/unit/accept', {
        token: 'token-for-suspended-member!!',
      }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.message).toMatch(/suspended or removed/i)
  })
})
