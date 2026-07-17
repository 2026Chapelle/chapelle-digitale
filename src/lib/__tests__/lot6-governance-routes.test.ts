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
  rpcCreateInvitation: vi.fn(),
  rpcRevokeInvitation: vi.fn(),
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
    listInvitationsForUnit: vi.fn(),
  }
})
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => ({ ok: true, skipped: false })),
}))
vi.mock('@/lib/email-templates-unit-governance', () => ({
  unitGovernanceInviteEmail: () => ({
    subject: 'Invite',
    html: '<p>x</p>',
    text: 'x',
  }),
}))

import { requireGuardedAdminUnit } from '@/lib/erp/admin-unit-guard'
import { assertUnitAccess, UnitAccessError } from '@/lib/erp/unit-access'
import {
  rpcNominate,
  rpcSetStatus,
  rpcChangeRole,
  rpcTransfer,
  rpcAcceptInvitation,
} from '@/lib/erp/unit-governance-rpc'
import {
  getMembershipById,
  revokeInvitation,
  createInvitation,
  listInvitationsForUnit,
} from '@/lib/erp/unit-governance-repository'
import { sendEmail } from '@/lib/email'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import * as membershipsRoute from '@/app/api/admin/organization-unit-memberships/route'
import * as membershipByIdRoute from '@/app/api/admin/organization-unit-memberships/[id]/route'
import * as transferRoute from '@/app/api/admin/organization-unit-memberships/[id]/transfer/route'
import * as invitationsRoute from '@/app/api/admin/organization-unit-invitations/route'
import * as revokeRoute from '@/app/api/admin/organization-unit-invitations/[id]/revoke/route'
import * as acceptRoute from '@/app/api/invite/unit/accept/route'
import * as eventsRoute from '@/app/api/admin/organization-unit-governance-events/route'

const ORG = '11111111-1111-4111-8111-111111111111'
const ACTOR = '22222222-2222-4222-8222-222222222222'
const CI1 = '33333333-3333-4333-8333-333333333331'
const CI2 = '33333333-3333-4333-8333-333333333332'
const AF1 = '44444444-4444-4444-8444-444444444441'
const HQ1 = '55555555-5555-4555-8555-555555555551'
const MEM1 = '66666666-6666-4666-8666-666666666661'
const USER2 = '77777777-7777-4777-8777-777777777771'
const INV1 = '88888888-8888-4888-8888-888888888881'
const INV_MISSING = '88888888-8888-4888-8888-888888888899'
const EU99 = '99999999-9999-4999-8999-999999999999'

function actor(role: string, home = CI1) {
  return {
    userId: ACTOR,
    email: 'a@x.com',
    organizationId: ORG,
    memberships: [
      {
        id: 'm',
        organization_id: ORG,
        organization_unit_id: home,
        user_id: ACTOR,
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

function guarded(role = 'zone_admin', home = AF1) {
  return {
    actor: actor(role, home),
    organizationId: ORG,
    userId: ACTOR,
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
  id: MEM1,
  organization_id: ORG,
  organization_unit_id: CI1,
  user_id: USER2,
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
        organization_unit_id: CI1,
        user_id: 'u2',
        unit_role: 'member',
      }),
    )
    expect(res.status).toBe(400)
    expect(rpcNominate).not.toHaveBeenCalled()
  })

  it('POST auto-promotion refuse', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue({
      ...guarded('national_admin', CI1),
      actor: actor('national_admin', CI1),
    })
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    const res = await membershipsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships', {
        organization_unit_id: CI1,
        user_id: ACTOR,
        unit_role: 'zone_admin',
      }),
    )
    expect([403, 400]).toContain(res.status)
    expect(rpcNominate).not.toHaveBeenCalled()
  })

  it('POST nominate appelle RPC avec actor serveur (ignore client)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcNominate as any).mockResolvedValue({ id: 'mem-new', error: null })
    const res = await membershipsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships', {
        organization_unit_id: CI1,
        user_id: USER2,
        unit_role: 'national_admin',
      }),
    )
    expect(res.status).toBe(200)
    expect(rpcNominate).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG,
        unitId: CI1,
        userId: USER2,
        role: 'national_admin',
        actorId: ACTOR,
      }),
    )
  })
})

describe('Lot 6 — transfer route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transfert autorisé appelle RPC avec actor serveur', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockImplementation(async (_a: unknown, unitId: string) => ({
      id: unitId,
      unit_type: unitId === CI2 ? 'national_central_church' : 'national_central_church',
      name: unitId,
    }))
    ;(rpcTransfer as any).mockResolvedValue({ id: 'mem-t', error: null })
    const res = await transferRoute.POST(
      mockReq('POST', "http://localhost/api/admin/organization-unit-memberships/" + MEM1 + "/transfer", {
        to_unit_id: CI2,
        unit_role: 'national_admin',
        organization_id: 'evil-org',
        actor_user_id: 'evil-actor',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(200)
    expect(getMembershipById).toHaveBeenCalledWith(ORG, MEM1)
    expect(rpcTransfer).toHaveBeenCalledWith({
      membershipId: MEM1,
      toUnitId: CI2,
      actorId: ACTOR,
      role: 'national_admin',
    })
  })

  it('transfert hors périmètre refusé', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockImplementation(async (_a: unknown, unitId: string) => {
      if (unitId === CI1) {
        return { id: CI1, unit_type: 'national_central_church', name: 'CI' }
      }
      throw new UnitAccessError('Hors périmètre', 403)
    })
    const res = await transferRoute.POST(
      mockReq('POST', "http://localhost/api/admin/organization-unit-memberships/" + MEM1 + "/transfer", {
        to_unit_id: EU99,
      }),
      { params: { id: MEM1 } },
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
      mockReq('PATCH', "http://localhost/api/admin/organization-unit-memberships/" + MEM1, {
        organization_id: 'evil',
        unit_role: 'member',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(400)
    expect(rpcChangeRole).not.toHaveBeenCalled()
    expect(rpcSetStatus).not.toHaveBeenCalled()
  })

  it('changement de rôle autorisé', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcChangeRole as any).mockResolvedValue({ id: MEM1, error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', "http://localhost/api/admin/organization-unit-memberships/" + MEM1, {
        unit_role: 'staff',
        actor_user_id: 'evil',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(200)
    expect(rpcChangeRole).toHaveBeenCalledWith({
      membershipId: MEM1,
      newRole: 'staff',
      actorId: ACTOR,
    })
  })

  it('rôle supérieur / pair refusé (non attribuable)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', "http://localhost/api/admin/organization-unit-memberships/" + MEM1, {
        unit_role: 'zone_admin',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(403)
    expect(rpcChangeRole).not.toHaveBeenCalled()
  })

  it('suspension', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcSetStatus as any).mockResolvedValue({ id: MEM1, error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', "http://localhost/api/admin/organization-unit-memberships/" + MEM1, {
        status: 'suspended',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(200)
    expect(rpcSetStatus).toHaveBeenCalledWith({
      membershipId: MEM1,
      status: 'suspended',
      actorId: ACTOR,
      notes: null,
    })
  })

  it('réactivation', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(getMembershipById as any).mockResolvedValue({ ...memRow, status: 'suspended' })
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcSetStatus as any).mockResolvedValue({ id: MEM1, error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', "http://localhost/api/admin/organization-unit-memberships/" + MEM1, {
        status: 'active',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(200)
    expect(rpcSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', actorId: ACTOR }),
    )
  })

  it('retrait', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(getMembershipById as any).mockResolvedValue(memRow)
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(rpcSetStatus as any).mockResolvedValue({ id: MEM1, error: null })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', "http://localhost/api/admin/organization-unit-memberships/" + MEM1, {
        status: 'removed',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(200)
    expect(rpcSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'removed', actorId: ACTOR }),
    )
  })

  it('dernier world_super_admin protégé (erreur RPC remontée)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('world_super_admin', HQ1))
    ;(getMembershipById as any).mockResolvedValue({
      ...memRow,
      unit_role: 'world_super_admin',
      organization_unit_id: HQ1,
    })
    ;(assertUnitAccess as any).mockResolvedValue({
      id: HQ1,
      unit_type: 'world_headquarters',
      name: 'HQ',
    })
    ;(rpcSetStatus as any).mockResolvedValue({
      id: null,
      error: 'Lot6: cannot suspend/remove last world_super_admin',
    })
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', "http://localhost/api/admin/organization-unit-memberships/" + MEM1, {
        status: 'removed',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/last world_super_admin/i)
  })
})

describe('Lot 6 — invitations list/create/revoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET invitations ?unitId= liste pending (sans token_hash côté repo mock)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(listInvitationsForUnit as any).mockResolvedValue([
      {
        id: INV1,
        email: 'a@b.c',
        proposed_unit_role: 'member',
        status: 'pending',
        expires_at: '2030-01-01T00:00:00.000Z',
      },
    ])
    const res = await invitationsRoute.GET(
      mockReq(
        'GET',
        `http://localhost/api/admin/organization-unit-invitations?unitId=${CI1}`,
      ),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.invitations).toHaveLength(1)
    expect(listInvitationsForUnit).toHaveBeenCalledWith(ORG, CI1)
    expect(assertUnitAccess).toHaveBeenCalled()
  })

  it('GET invitations unitId invalide → 400', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded())
    const res = await invitationsRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-unit-invitations?unitId=not-uuid'),
    )
    expect(res.status).toBe(400)
    expect(listInvitationsForUnit).not.toHaveBeenCalled()
    expect(assertUnitAccess).not.toHaveBeenCalled()
  })

  it('POST create invitation via createInvitation (RPC sous-jacent)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(createInvitation as any).mockResolvedValue({
      invitationId: INV1,
      token: 'plain-token-never-stored',
      expiresAt: '2030-01-08T00:00:00.000Z',
    })
    ;(sendEmail as any).mockResolvedValue({ ok: true, skipped: false })
    const res = await invitationsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations', {
        organization_unit_id: CI1,
        email: 'Invite@Example.COM',
        unit_role: 'member',
        token: 'must-be-rejected-if-read',
        token_hash: 'evil',
        organization_id: 'evil',
      }),
    )
    // token/token_hash/organization_id in body → 400 champs non modifiables
    expect(res.status).toBe(400)
    expect(createInvitation).not.toHaveBeenCalled()

    const resOk = await invitationsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations', {
        organization_unit_id: CI1,
        email: 'Invite@Example.COM',
        unit_role: 'member',
      }),
    )
    expect(resOk.status).toBe(200)
    const body = await resOk.json()
    expect(body.ok).toBe(true)
    expect(body.data.invitation_id).toBe(INV1)
    expect(body.data.email_outcome).toBe('INVITATION_CREATED_EMAIL_SENT')
    expect(body.data.email_sent).toBe(true)
    expect(body.data.message_fr).toBeTruthy()
    expect(JSON.stringify(body)).not.toMatch(/plain-token|token_hash|"token"/)
    expect(createInvitation).toHaveBeenCalledWith({
      orgId: ORG,
      unitId: CI1,
      email: 'invite@example.com',
      proposedRole: 'member',
      invitedBy: ACTOR,
    })
  })

  it('POST invitation — 4 email_outcome + jamais de token en réponse', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    const invPayload = {
      invitationId: INV1,
      token: 'secret-token-must-not-leak',
      expiresAt: '2030-01-08T00:00:00.000Z',
    }
    ;(createInvitation as any).mockResolvedValue(invPayload)

    // 1) email sent
    ;(sendEmail as any).mockResolvedValueOnce({ ok: true, skipped: false, id: 're_1' })
    let res = await invitationsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations', {
        organization_unit_id: CI1,
        email: 'a@b.c',
        unit_role: 'member',
      }),
    )
    let body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.email_outcome).toBe('INVITATION_CREATED_EMAIL_SENT')
    expect(body.data.email_sent).toBe(true)
    expect(JSON.stringify(body)).not.toContain('secret-token')
    expect(body.data).not.toHaveProperty('token')
    expect(body.data).not.toHaveProperty('token_hash')

    // 2) provider unavailable (skipped)
    ;(sendEmail as any).mockResolvedValueOnce({ ok: false, skipped: true })
    res = await invitationsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations', {
        organization_unit_id: CI1,
        email: 'a@b.c',
        unit_role: 'member',
      }),
    )
    body = await res.json()
    expect(body.data.email_outcome).toBe('INVITATION_CREATED_EMAIL_PROVIDER_UNAVAILABLE')
    expect(body.data.email_sent).toBe(false)
    expect(body.data.message_fr).toMatch(/fournisseur/i)

    // 3) delivery failed
    ;(sendEmail as any).mockResolvedValueOnce({ ok: false, skipped: false, error: 'smtp down' })
    res = await invitationsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations', {
        organization_unit_id: CI1,
        email: 'a@b.c',
        unit_role: 'member',
      }),
    )
    body = await res.json()
    expect(body.data.email_outcome).toBe('INVITATION_CREATED_EMAIL_DELIVERY_FAILED')
    expect(body.data.email_sent).toBe(false)

    // 4) create failed
    ;(createInvitation as any).mockRejectedValueOnce(new Error('RPC create boom'))
    res = await invitationsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations', {
        organization_unit_id: CI1,
        email: 'a@b.c',
        unit_role: 'member',
      }),
    )
    body = await res.json()
    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.code).toBe('INVITATION_CREATE_FAILED')
    expect(JSON.stringify(body)).not.toContain('secret-token')
  })

  it('révocation d’invitation autorisée (revokeInvitation → RPC)', async () => {
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded('zone_admin', AF1))
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: INV1,
        organization_unit_id: CI1,
        organization_id: ORG,
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
      id: CI1,
      unit_type: 'national_central_church',
      name: 'CI',
    })
    ;(revokeInvitation as any).mockResolvedValue(undefined)
    const res = await revokeRoute.POST(
      mockReq('POST', "http://localhost/api/admin/organization-unit-invitations/" + INV1 + "/revoke", {
        organization_id: 'evil',
        actor_user_id: 'evil',
      }),
      { params: { id: INV1 } },
    )
    expect(res.status).toBe(200)
    expect(revokeInvitation).toHaveBeenCalledWith({
      orgId: ORG,
      invitationId: INV1,
      actorId: ACTOR,
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
      mockReq('POST', "http://localhost/api/admin/organization-unit-invitations/" + INV_MISSING + "/revoke", {}),
      { params: { id: INV_MISSING } },
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

describe('Lot 6 — UUID invalide → 400 avant Supabase/RPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(requireGuardedAdminUnit as any).mockResolvedValue(guarded())
  })

  it('POST nominate UUID invalide → 400, pas de RPC ni assertUnitAccess', async () => {
    const res = await membershipsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships', {
        organization_unit_id: 'not-a-uuid',
        user_id: 'also-bad',
        unit_role: 'member',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/identifiant invalide/i)
    expect(assertUnitAccess).not.toHaveBeenCalled()
    expect(rpcNominate).not.toHaveBeenCalled()
  })

  it('GET memberships unitId invalide → 400', async () => {
    const res = await membershipsRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-unit-memberships?unitId=not-a-uuid'),
    )
    expect(res.status).toBe(400)
    expect(assertUnitAccess).not.toHaveBeenCalled()
  })

  it('GET governance events unitId invalide → 400', async () => {
    const res = await eventsRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-unit-governance-events?unitId=bad'),
    )
    expect(res.status).toBe(400)
    expect(assertUnitAccess).not.toHaveBeenCalled()
  })

  it('PATCH membership id invalide → 400, pas de lecture membership', async () => {
    const res = await membershipByIdRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-memberships/not-a-uuid', {
        status: 'suspended',
      }),
      { params: { id: 'not-a-uuid' } },
    )
    expect(res.status).toBe(400)
    expect(getMembershipById).not.toHaveBeenCalled()
    expect(rpcSetStatus).not.toHaveBeenCalled()
  })

  it('transfer to_unit_id invalide → 400', async () => {
    const res = await transferRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships/' + MEM1 + '/transfer', {
        to_unit_id: 'not-a-uuid',
      }),
      { params: { id: MEM1 } },
    )
    expect(res.status).toBe(400)
    expect(getMembershipById).not.toHaveBeenCalled()
    expect(rpcTransfer).not.toHaveBeenCalled()
  })

  it('transfer membership id invalide → 400', async () => {
    const res = await transferRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-memberships/bad-id/transfer', {
        to_unit_id: CI2,
      }),
      { params: { id: 'bad-id' } },
    )
    expect(res.status).toBe(400)
    expect(getMembershipById).not.toHaveBeenCalled()
    expect(rpcTransfer).not.toHaveBeenCalled()
  })

  it('revoke invitation id invalide → 400, pas de from() Supabase', async () => {
    const res = await revokeRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-unit-invitations/not-uuid/revoke', {}),
      { params: { id: 'not-uuid' } },
    )
    expect(res.status).toBe(400)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(revokeInvitation).not.toHaveBeenCalled()
  })
})
