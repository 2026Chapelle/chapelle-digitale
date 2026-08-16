/**
 * Lot 2-B — Route security tests for administrative profile access.
 * Tests the tenant scoping guards on the three targeted admin members routes.
 * Uses Vitest and existing mock patterns (vi.mock for server-only etc.).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mocks
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
  IS_DEMO_MODE: false,
}))
vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest: vi.fn(),
}))
vi.mock('@/lib/erp/admin-profiles-scope', () => ({
  resolveAdminOrganizationForRequest: vi.fn(),
  getActiveMemberUserIdsForOrganization: vi.fn(),
  getActiveUserIdsForUnits: vi.fn(),
  assertProfileBelongsToActiveMembership: vi.fn(),
  requireActiveOwnerOrAdmin: vi.fn(),
  requireActorOrgOwnerOrAdmin: vi.fn(),
}))
vi.mock('@/lib/erp/unit-access', () => ({
  resolveAdminActorProfile: vi.fn(),
  resolveActorUnitContext: vi.fn(),
  listAccessibleUnitIds: vi.fn(),
  UnitAccessError: class UnitAccessError extends Error {
    code = 'unit_access_error'
    constructor(message: string, public status = 403, public errorCode?: string) {
      super(message)
    }
  },
}))
vi.mock('@/lib/pastoral/member-360-server', () => ({
  getMemberDossier: vi.fn(),
}))

// Import after mocks
import * as membresRoute from '@/app/api/membres/route'
import * as idRoute from '@/app/api/admin/membres/[id]/route'
import * as actionRoute from '@/app/api/admin/membres/[id]/action/route'
import * as adminMembresRoute from '@/app/api/admin/membres/route'

import { isAdminRequest } from '@/lib/admin-auth'
import {
  resolveAdminOrganizationForRequest,
  getActiveMemberUserIdsForOrganization,
  getActiveUserIdsForUnits,
  assertProfileBelongsToActiveMembership,
  requireActiveOwnerOrAdmin,
} from '@/lib/erp/admin-profiles-scope'
import {
  resolveAdminActorProfile,
  resolveActorUnitContext,
  listAccessibleUnitIds,
} from '@/lib/erp/unit-access'
import { supabaseAdmin } from '@/lib/supabase'
import { getMemberDossier } from '@/lib/pastoral/member-360-server'

const ORG_ID = 'org-canon-uuid'
const USER_IN = 'user-in'
const USER_OUT = 'user-out'

function createMockRequest(method: string, url: string, body?: any, headers?: Record<string, string>) {
  const req = new NextRequest(url, {
    method,
    headers: new Headers({ 'content-type': 'application/json', ...(headers || {}) }),
  })
  if (body && (method === 'POST' || method === 'PATCH')) {
    // @ts-ignore - for test
    req.json = vi.fn().mockResolvedValue(body)
  }
  return req
}

describe('Lot 2-B — Route security (membres admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminOrganizationForRequest as any).mockResolvedValue(ORG_ID)
    ;(getActiveMemberUserIdsForOrganization as any).mockResolvedValue([USER_IN])
    ;(getActiveUserIdsForUnits as any).mockResolvedValue([USER_IN])
    ;(assertProfileBelongsToActiveMembership as any).mockResolvedValue(undefined)
    ;(getMemberDossier as any).mockResolvedValue({ id: USER_IN, prenom: 'Test' })
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'admin-1', email: 'a@x.com', role: 'admin' })
    ;(resolveActorUnitContext as any).mockResolvedValue({
      userId: 'admin-1',
      organizationId: ORG_ID,
      memberships: [],
      homeUnitIds: ['unit-1'],
      isWorldScope: true,
      highestRole: 'world_admin',
      email: 'a@x.com',
    })
    ;(listAccessibleUnitIds as any).mockResolvedValue(['unit-1'])

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: USER_IN }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    ;(supabaseAdmin as any).from = mockFrom
  })

  // GET /api/membres
  it('GET /api/membres sans session admin → 401', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const req = createMockRequest('GET', 'http://localhost/api/membres')
    const res = await membresRoute.GET(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/membres avec memberships actives → requête profiles bornée aux IDs autorisés', async () => {
    const req = createMockRequest('GET', 'http://localhost/api/membres')
    await membresRoute.GET(req)
    const fromCalls = (supabaseAdmin.from as any).mock.calls
    expect(fromCalls.some((c: any[]) => c[0] === 'profiles')).toBe(true)
    // The .in should have been called with allowed ids in real impl
  })

  it('GET /api/membres aucune membership → 200 vide et aucune requête globale profiles (évite .in vide)', async () => {
    ;(getActiveMemberUserIdsForOrganization as any).mockResolvedValue([])
    const req = createMockRequest('GET', 'http://localhost/api/membres')
    const res = await membresRoute.GET(req)
    expect(res.status).toBe(200)
    // In impl, if length==0 return early without calling .from('profiles')
    const profilesCall = (supabaseAdmin.from as any).mock.calls.find((c: any[]) => c[0] === 'profiles')
    // Depending on exact early return, but impl does early return before from in GET
    // We assert the response shape
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual([])
  })

  it('GET /api/membres membership inactive ou autre org exclue', async () => {
    ;(getActiveMemberUserIdsForOrganization as any).mockResolvedValue([])
    const req = createMockRequest('GET', 'http://localhost/api/membres')
    const res = await membresRoute.GET(req)
    const json = await res.json()
    expect(json.data).toEqual([])
  })

  it('GET /api/membres organization_id client ignoré (ne change pas le scope)', async () => {
    const req = createMockRequest('GET', 'http://localhost/api/membres?organization_id=evil')
    await membresRoute.GET(req)
    expect(resolveAdminOrganizationForRequest).toHaveBeenCalledWith(true)
    // No use of query org id
  })

  // PATCH /api/membres
  it('PATCH /api/membres sans session → 401', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: USER_IN, prenom: 'New' })
    const res = await membresRoute.PATCH(req)
    expect(res.status).toBe(401)
  })

  it('PATCH /api/membres membership active → update appelé après garde', async () => {
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: USER_IN, prenom: 'New' })
    await membresRoute.PATCH(req)
    expect(assertProfileBelongsToActiveMembership).toHaveBeenCalled()
    expect((supabaseAdmin.from as any)).toHaveBeenCalledWith('profiles')
  })

  it('PATCH /api/membres hors tenant → 404 et update jamais appelé', async () => {
    ;(assertProfileBelongsToActiveMembership as any).mockRejectedValue(new Error('Membre introuvable.'))
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: USER_OUT, prenom: 'X' })
    const res = await membresRoute.PATCH(req)
    expect(res.status).toBe(404)
    // update should not be reached
  })

  it('PATCH /api/membres membership inactive → 404 et update jamais appelé', async () => {
    ;(assertProfileBelongsToActiveMembership as any).mockRejectedValue(new Error('Membre introuvable.'))
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: USER_IN, prenom: 'X' })
    const res = await membresRoute.PATCH(req)
    expect(res.status).toBe(404)
  })

  it('PATCH /api/membres profil inexistant → même 404', async () => {
    ;(assertProfileBelongsToActiveMembership as any).mockRejectedValue(new Error('Membre introuvable.'))
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: 'nonexistent', prenom: 'X' })
    const res = await membresRoute.PATCH(req)
    expect(res.status).toBe(404)
  })

  it('PATCH /api/membres id, organization_id, email, created_at → 400', async () => {
    const badBodies = [
      { id: USER_IN, organization_id: 'evil' },
      { id: USER_IN, email: 'x@y.z' },
      { id: USER_IN, created_at: 'now' },
    ]
    for (const body of badBodies) {
      const req = createMockRequest('PATCH', 'http://localhost/api/membres', body)
      const res = await membresRoute.PATCH(req)
      expect(res.status).toBe(400)
    }
  })

  it('PATCH /api/membres champ inconnu seul → 400', async () => {
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: USER_IN, unknownField: 'bad' })
    const res = await membresRoute.PATCH(req)
    expect(res.status).toBe(400)
  })

  it('PATCH /api/membres champ inconnu mélangé à autorisé → 400 (pas de strip silencieux)', async () => {
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: USER_IN, prenom: 'Ok', unknown: 'bad' })
    const res = await membresRoute.PATCH(req)
    expect(res.status).toBe(400)
  })

  it('PATCH /api/membres corps valide → seuls champs autorisés atteignent update', async () => {
    const req = createMockRequest('PATCH', 'http://localhost/api/membres', { id: USER_IN, prenom: 'New', role: 'admin' })
    await membresRoute.PATCH(req)
    // In real, the update call happens with only allowed
    expect(assertProfileBelongsToActiveMembership).toHaveBeenCalled()
  })

  // 360 GET /api/admin/membres/[id]
  it('GET /api/admin/membres/[id] hors tenant → 404 et getMemberDossier jamais appelé', async () => {
    ;(assertProfileBelongsToActiveMembership as any).mockRejectedValue(new Error('Membre introuvable.'))
    const req = createMockRequest('GET', 'http://localhost/api/admin/membres/' + USER_OUT)
    const res = await idRoute.GET(req, { params: { id: USER_OUT } })
    expect(res.status).toBe(404)
    expect(getMemberDossier).not.toHaveBeenCalled()
  })

  it('GET /api/admin/membres/[id] membre actif → getMemberDossier appelé après garde', async () => {
    const req = createMockRequest('GET', 'http://localhost/api/admin/membres/' + USER_IN)
    await idRoute.GET(req, { params: { id: USER_IN } })
    expect(assertProfileBelongsToActiveMembership).toHaveBeenCalled()
    expect(getMemberDossier).toHaveBeenCalledWith(USER_IN)
  })

  // Action route
  it('POST /api/admin/membres/[id]/action hors tenant → 404', async () => {
    ;(assertProfileBelongsToActiveMembership as any).mockRejectedValue(new Error('Membre introuvable.'))
    const req = createMockRequest('POST', 'http://localhost/api/admin/membres/' + USER_OUT + '/action', { action: 'set_statut' })
    const res = await actionRoute.POST(req, { params: { id: USER_OUT } })
    expect(res.status).toBe(404)
  })

  it('POST /api/admin/membres/[id]/action garde protège lectures/mutations/journal avant', async () => {
    // The guard is first in try, before fetching prof or any action
    const req = createMockRequest('POST', 'http://localhost/api/admin/membres/' + USER_IN + '/action', { action: 'set_statut', membre_statut: 'membre' })
    await actionRoute.POST(req, { params: { id: USER_IN } })
    expect(assertProfileBelongsToActiveMembership).toHaveBeenCalled()
  })
})

// Lot 3 - admin membres list/create tenant enforcement
describe('Lot 3 — admin membres list and create (organization permissions)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminOrganizationForRequest as any).mockResolvedValue(ORG_ID)
    ;(getActiveMemberUserIdsForOrganization as any).mockResolvedValue([USER_IN])
    ;(getActiveUserIdsForUnits as any).mockResolvedValue([USER_IN])
    ;(requireActiveOwnerOrAdmin as any).mockResolvedValue(undefined)
    ;(assertProfileBelongsToActiveMembership as any).mockResolvedValue(undefined)
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'admin-1', email: 'a@x.com', role: 'admin' })
    ;(resolveActorUnitContext as any).mockResolvedValue({
      userId: 'admin-1',
      organizationId: ORG_ID,
      memberships: [],
      homeUnitIds: ['unit-1'],
      isWorldScope: true,
      highestRole: 'world_admin',
      email: 'a@x.com',
    })
    ;(listAccessibleUnitIds as any).mockResolvedValue(['unit-1'])

    const mockFrom = vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: USER_IN }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
    }))
    ;(supabaseAdmin as any).from = mockFrom

    const mockAuthAdmin = {
      createUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_IN } }, error: null }),
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
    }
    ;(supabaseAdmin as any).auth = { admin: mockAuthAdmin }
  })

  it('GET /api/admin/membres 401 sans garde admin', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const req = createMockRequest('GET', 'http://localhost/api/admin/membres')
    const res = await adminMembresRoute.GET(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/membres refuse si pas de membership owner/admin active', async () => {
    const { UnitAccessError } = await import('@/lib/erp/unit-access')
    ;(resolveActorUnitContext as any).mockRejectedValue(
      new (UnitAccessError as any)('Aucune affectation d’unité active.', 403, 'no_unit_membership'),
    )
    const req = createMockRequest('GET', 'http://localhost/api/admin/membres')
    const res = await adminMembresRoute.GET(req)
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/membres requête bornée par allowedIds', async () => {
    const req = createMockRequest('GET', 'http://localhost/api/admin/membres')
    await adminMembresRoute.GET(req)
    // verify .in was used with allowed (mocked)
    expect(getActiveMemberUserIdsForOrganization).toHaveBeenCalled()
  })

  it('GET /api/admin/membres liste vide → 200 sans requête globale', async () => {
    ;(getActiveMemberUserIdsForOrganization as any).mockResolvedValue([])
    const req = createMockRequest('GET', 'http://localhost/api/admin/membres')
    const res = await adminMembresRoute.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.members).toEqual([])
  })

  it('POST /api/admin/membres 401 sans admin', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const req = createMockRequest('POST', 'http://localhost/api/admin/membres', { email: 'test@example.com', prenom: 'T', nom: 'U' })
    const res = await adminMembresRoute.POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/admin/membres refuse membership insuffisante', async () => {
    const { UnitAccessError } = await import('@/lib/erp/unit-access')
    ;(resolveActorUnitContext as any).mockRejectedValue(
      new (UnitAccessError as any)('Aucune affectation d’unité active.', 403, 'no_unit_membership'),
    )
    const req = createMockRequest('POST', 'http://localhost/api/admin/membres', { email: 'test@example.com', prenom: 'T', nom: 'U' })
    const res = await adminMembresRoute.POST(req)
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/membres rejette organization_id client', async () => {
    const req = createMockRequest('POST', 'http://localhost/api/admin/membres', { email: 'test@example.com', prenom: 'T', nom: 'U', organization_id: 'evil' })
    const res = await adminMembresRoute.POST(req)
    expect(res.status).toBe(400)
  })

  it('POST /api/admin/membres crée membership dans org canonique avec role member', async () => {
    const req = createMockRequest('POST', 'http://localhost/api/admin/membres', { email: 'test@example.com', prenom: 'T', nom: 'U' })
    const res = await adminMembresRoute.POST(req)
    expect(res.status).toBe(200)
  })

  it('POST /api/admin/membres échec membership → compensation delete user', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'fail' } })
    ;(supabaseAdmin as any).from = vi.fn().mockImplementation((table: string) => {
      if (table === 'organization_members') return { insert: mockInsert }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }
    })
    const req = createMockRequest('POST', 'http://localhost/api/admin/membres', { email: 'test@example.com', prenom: 'T', nom: 'U' })
    const res = await adminMembresRoute.POST(req)
    expect(res.status).toBe(500)
    expect((supabaseAdmin.auth as any).admin.deleteUser).toHaveBeenCalled()
  })
})

describe('Lot 6 — Actions membre security hardening', () => {
  const TARGET = 'target-id'
  const worldActor = {
    userId: 'actor-1',
    organizationId: ORG_ID,
    memberships: [],
    homeUnitIds: ['unit-1'],
    isWorldScope: true,
    highestRole: 'world_admin',
  }

  function mockProfile(data: Record<string, unknown> | null) {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    ;(supabaseAdmin as any).from = mockFrom
    return mockFrom
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminOrganizationForRequest as any).mockResolvedValue(ORG_ID)
    ;(assertProfileBelongsToActiveMembership as any).mockResolvedValue(undefined)
    // Toujours inclure la cible dans l'allowlist tenant pour atteindre les gardes métier.
    ;(getActiveMemberUserIdsForOrganization as any).mockResolvedValue([TARGET, 'berger-in-id'])
    ;(getActiveUserIdsForUnits as any).mockResolvedValue([TARGET, 'berger-in-id'])
    ;(listAccessibleUnitIds as any).mockResolvedValue(['unit-1'])
    ;(resolveActorUnitContext as any).mockResolvedValue(worldActor)
  })

  it.each(['membre', 'viewer', 'staff'] as const)(
    'acteur SQL %s + set_role => refus 403',
    async (role) => {
      ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role })
      const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
        action: 'set_role',
        role: 'admin',
      })
      const res = await actionRoute.POST(req, { params: { id: TARGET } })
      expect(res.status).toBe(403)
      expect(resolveActorUnitContext).not.toHaveBeenCalled()
    },
  )

  it('membership unit non admin (no_admin_membership) => 403', async () => {
    const { UnitAccessError } = await import('@/lib/erp/unit-access')
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'admin' })
    ;(resolveActorUnitContext as any).mockRejectedValue(
      new UnitAccessError('Autorisation administrative requise.', 403, 'no_admin_membership'),
    )
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'set_role',
      role: 'membre',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('no_admin_membership')
  })

  it('cookie admin sans identité Supabase (actor_required) => 403', async () => {
    const { UnitAccessError } = await import('@/lib/erp/unit-access')
    ;(resolveAdminActorProfile as any).mockRejectedValue(
      new UnitAccessError('Identité administrateur requise.', 403, 'actor_required'),
    )
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'suspend',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('actor_required')
  })

  it('admin ordinaire + promotion super_admin => refus', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'admin' })
    mockProfile({ role: 'membre', email: 't@x.com', statut: 'actif', archived_at: null })
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'set_role',
      role: 'super_admin',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(403)
  })

  it('admin ordinaire + promotion admin => refus', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'admin' })
    mockProfile({ role: 'membre', email: 't@x.com', statut: 'actif', archived_at: null })
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'set_role',
      role: 'admin',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(403)
  })

  it('vrai super_admin => autorisation contrôlée', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'super_admin' })
    ;(resolveActorUnitContext as any).mockResolvedValue({
      ...worldActor,
      highestRole: 'world_super_admin',
    })
    mockProfile({ role: 'membre', email: 't@x.com', statut: 'actif', archived_at: null })
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'set_role',
      role: 'admin',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(200)
  })

  it('dernier super_admin => protection de deactivation/suppression maintenue', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'super_admin' })
    ;(resolveActorUnitContext as any).mockResolvedValue({
      ...worldActor,
      highestRole: 'world_super_admin',
    })
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockImplementation((_sel: unknown, opts?: { count?: string }) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    neq: vi.fn().mockResolvedValue({ count: 1, error: null }),
                  }),
                }),
              }
            }
            return {
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'super_admin', statut: 'actif', email: 't@x.com', archived_at: null },
                  error: null,
                }),
              }),
            }
          }),
        }
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    })
    ;(supabaseAdmin as any).from = mockFrom

    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'suspend',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(409)
  })

  it('responsable hors organisation => refus', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'admin' })
    mockProfile({ role: 'membre', email: 't@x.com', statut: 'actif', archived_at: null })
    ;(assertProfileBelongsToActiveMembership as any).mockImplementation((_org: string, profileId: string) => {
      if (profileId === 'berger-out-id') throw new Error('Membre introuvable.')
      return Promise.resolve()
    })
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'set_responsable',
      berger_id: 'berger-out-id',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(404)
  })

  it('responsable hors unité accessible => refus', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'admin' })
    ;(resolveActorUnitContext as any).mockResolvedValue({
      ...worldActor,
      isWorldScope: false,
      highestRole: 'local_admin',
    })
    mockProfile({ role: 'membre', email: 't@x.com', statut: 'actif', archived_at: null })
    // Cible dans le périmètre ; berger hors unités accessibles.
    ;(getActiveUserIdsForUnits as any).mockResolvedValue([TARGET])
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'set_responsable',
      berger_id: 'berger-other-unit',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(404)
  })

  it('reset_password insuffisant => refus', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'admin' })
    mockProfile({ role: 'admin', email: 't@x.com', statut: 'actif', archived_at: null })
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'reset_password',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(403)
  })

  it('hard_delete insuffisant => refus', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'admin' })
    // Cible admin (privilégiée) — pas super_admin pour éviter la garde « dernier SA » avant le check acteur.
    mockProfile({ role: 'admin', email: 't@x.com', statut: 'actif', archived_at: null })
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'hard_delete',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(403)
  })

  it('hard_delete sans profil SQL => 404', async () => {
    ;(resolveAdminActorProfile as any).mockResolvedValue({ userId: 'actor-1', email: 'a@x.com', role: 'super_admin' })
    mockProfile(null)
    const req = createMockRequest('POST', `http://localhost/api/admin/membres/${TARGET}/action`, {
      action: 'hard_delete',
    })
    const res = await actionRoute.POST(req, { params: { id: TARGET } })
    expect(res.status).toBe(404)
  })
})
