/**
 * Lot 5 — sécurité routes (mocks) : acteur, payloads, périmètres, membres, newcomers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn() },
  IS_DEMO_MODE: false,
}))
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: vi.fn() }))
vi.mock('@/lib/erp/admin-profiles-scope', () => ({
  resolveAdminOrganizationForRequest: vi.fn(),
  getActiveMemberUserIdsForOrganization: vi.fn(),
  getActiveUserIdsForUnits: vi.fn(),
  assertProfileBelongsToActiveMembership: vi.fn(),
  requireActorOrgOwnerOrAdmin: vi.fn(),
}))
vi.mock('@/lib/erp/unit-access', () => {
  class UnitAccessError extends Error {
    readonly code = 'unit_access_error' as const
    constructor(
      message: string,
      public status: number = 403,
      public errorCode?: string,
    ) {
      super(message)
      this.name = 'UnitAccessError'
    }
  }
  return {
    UnitAccessError,
    resolveAdminActorProfile: vi.fn(),
    resolveActorUnitContext: vi.fn(),
    listAccessibleUnitIds: vi.fn(),
    assertUnitAccess: vi.fn(),
    canManageWorldSettings: vi.fn(),
    canUnlockBranding: vi.fn(),
    canEditPastoralTemplate: vi.fn(),
    assignableRolesFor: vi.fn(() => []),
  }
})
vi.mock('@/lib/pastoral/newcomer-admin-client', () => ({
  getNewcomerIntakesRepository: vi.fn(),
  getNewcomerOrgLookupClient: vi.fn(() => ({})),
  resolveNewcomerAdminOrganizationId: vi.fn(),
}))
vi.mock('@/lib/supabase-server', () => ({ getServerProfile: vi.fn() }))
vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: vi.fn(),
  getSessionProfile: vi.fn(),
}))

import { isAdminRequest } from '@/lib/admin-auth'
import {
  resolveAdminOrganizationForRequest,
  getActiveMemberUserIdsForOrganization,
  getActiveUserIdsForUnits,
} from '@/lib/erp/admin-profiles-scope'
import {
  resolveAdminActorProfile,
  resolveActorUnitContext,
  listAccessibleUnitIds,
  assertUnitAccess,
  UnitAccessError,
  canManageWorldSettings,
  canUnlockBranding,
  canEditPastoralTemplate,
} from '@/lib/erp/unit-access'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getNewcomerIntakesRepository,
  resolveNewcomerAdminOrganizationId,
} from '@/lib/pastoral/newcomer-admin-client'
import * as hierarchyRoute from '@/app/api/admin/organization-hierarchy/route'
import * as unitsRoute from '@/app/api/admin/organization-units/route'
import * as unitIdRoute from '@/app/api/admin/organization-units/[id]/route'
import * as unitSettingsRoute from '@/app/api/admin/organization-unit-settings/route'
import * as worldSettingsRoute from '@/app/api/admin/organization-settings/route'
import * as pastoralRoute from '@/app/api/admin/pastoral-settings/route'
import * as adminMembresRoute from '@/app/api/admin/membres/route'
import * as newcomerRoute from '@/app/api/admin/newcomer-intakes/route'

const ORG = 'org-1'
const HQ = 'hq-1'
const AF = 'af-1'
const CI = 'ci-1'
const EU = 'eu-1'
const LOCAL = 'local-1'
const SISTER = 'ci-sister'

function actor(partial: {
  highestRole: string
  isWorldScope?: boolean
  homeUnitIds?: string[]
  userId?: string
}) {
  return {
    userId: partial.userId || 'actor-1',
    email: 'a@x.com',
    organizationId: ORG,
    memberships: [] as any[],
    homeUnitIds: partial.homeUnitIds || [HQ],
    isWorldScope: partial.isWorldScope ?? false,
    highestRole: partial.highestRole,
  }
}

function mockReq(method: string, url: string, body?: unknown) {
  const req = new NextRequest(url, {
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
  })
  if (body !== undefined && (method === 'POST' || method === 'PATCH')) {
    // @ts-ignore
    req.json = vi.fn().mockResolvedValue(body)
  }
  return req
}

function listQuery(data: unknown[]) {
  const q: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null }),
    single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null }),
    then: (ok: any, bad: any) => Promise.resolve({ data, error: null }).then(ok, bad),
  }
  return q
}

describe('Lot 5 — actor and route perimeter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminOrganizationForRequest as any).mockResolvedValue(ORG)
    ;(resolveAdminActorProfile as any).mockResolvedValue({
      userId: 'actor-1',
      email: 'a@x.com',
      role: 'admin',
    })
    ;(canManageWorldSettings as any).mockReturnValue(true)
    ;(canUnlockBranding as any).mockReturnValue(true)
    ;(canEditPastoralTemplate as any).mockReturnValue(true)
  })

  it('cookie admin sans identité Supabase → 403 actor_required', async () => {
    ;(resolveAdminActorProfile as any).mockRejectedValue(
      new UnitAccessError('Identité administrateur requise.', 403, 'actor_required'),
    )
    const res = await hierarchyRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-hierarchy'),
    )
    expect(res.status).toBe(403)
    const j = await res.json()
    expect(j.code).toBe('actor_required')
  })

  it('login page source: compte par défaut si Supabase, avertissement code legacy', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(process.cwd(), 'src/app/(admin)/admin/login/page.tsx'),
      'utf8',
    )
    expect(src).toMatch(/useState<Mode>\(IS_DEMO_MODE \? 'code' : 'account'\)/)
    expect(src).toMatch(/code d(?:'|\&apos;)accès seul ne permet pas/)
    expect(src).toContain('/api/admin/auth-supabase')
    expect(src).toContain('client.auth.signOut()')
    expect(src).toContain('/admin/forgot-password')
  })

  it('401 sans cookie admin', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const res = await hierarchyRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-hierarchy'),
    )
    expect(res.status).toBe(401)
  })

  it('world_super_admin → arbre entier', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_super_admin', isWorldScope: true }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([HQ, AF, CI, EU, LOCAL])
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(
      listQuery([
        { id: HQ, depth: 0 },
        { id: AF, depth: 1 },
        { id: EU, depth: 1 },
      ]),
    )
    const res = await hierarchyRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-hierarchy'),
    )
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.data.units.map((u: any) => u.id).sort()).toEqual([AF, EU, HQ].sort())
  })

  it('world_admin → arbre entier', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_admin', isWorldScope: true }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([HQ, AF, EU])
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(listQuery([{ id: HQ }, { id: AF }, { id: EU }]))
    const res = await hierarchyRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-hierarchy'),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).data.units).toHaveLength(3)
  })

  it('zone_admin → zone et descendants seulement (pas autre continent)', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'zone_admin', isWorldScope: false, homeUnitIds: [AF] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([AF, CI, LOCAL])
    const q = listQuery([{ id: AF }, { id: CI }])
    q.in = vi.fn().mockImplementation((_c: string, ids: string[]) => {
      expect(ids).toEqual([AF, CI, LOCAL])
      expect(ids).not.toContain(EU)
      return q
    })
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(q)
    const res = await hierarchyRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-hierarchy'),
    )
    expect(res.status).toBe(200)
  })

  it('national_admin → nationale et locales seulement', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'national_admin', isWorldScope: false, homeUnitIds: [CI] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([CI, LOCAL])
    const q = listQuery([{ id: CI }, { id: LOCAL }])
    q.in = vi.fn().mockImplementation((_c: string, ids: string[]) => {
      expect(ids).toEqual([CI, LOCAL])
      expect(ids).not.toContain(AF)
      expect(ids).not.toContain(EU)
      return q
    })
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(q)
    const res = await hierarchyRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-hierarchy'),
    )
    expect(res.status).toBe(200)
  })

  it('local_admin → unité seulement (sœur absente)', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([LOCAL])
    const q = listQuery([{ id: LOCAL }])
    q.in = vi.fn().mockImplementation((_c: string, ids: string[]) => {
      expect(ids).toEqual([LOCAL])
      expect(ids).not.toContain(SISTER)
      return q
    })
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(q)
    const res = await hierarchyRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/organization-hierarchy'),
    )
    expect(res.status).toBe(200)
  })

  it('unité hors périmètre → 404 uniforme', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    ;(assertUnitAccess as any).mockRejectedValue(new UnitAccessError('Unité introuvable.', 404))
    const res = await unitIdRoute.GET(
      mockReq('GET', `http://localhost/api/admin/organization-units/${SISTER}`),
      { params: { id: SISTER } },
    )
    expect(res.status).toBe(404)
  })

  it('POST units refuse organization_id, materialized_path, depth', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_super_admin', isWorldScope: true }),
    )
    for (const body of [
      { unit_type: 'continental_zone', parent_id: HQ, name: 'X', organization_id: 'evil' },
      { unit_type: 'continental_zone', parent_id: HQ, name: 'X', materialized_path: '/hack/' },
      { unit_type: 'continental_zone', parent_id: HQ, name: 'X', depth: 0 },
    ]) {
      const res = await unitsRoute.POST(
        mockReq('POST', 'http://localhost/api/admin/organization-units', body),
      )
      expect(res.status).toBe(400)
    }
  })

  it('PATCH unit refuse created_by', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_admin', isWorldScope: true }),
    )
    ;(assertUnitAccess as any).mockResolvedValue({ id: CI })
    const res = await unitIdRoute.PATCH(
      mockReq('PATCH', `http://localhost/api/admin/organization-units/${CI}`, {
        created_by: 'evil',
      }),
      { params: { id: CI } },
    )
    expect(res.status).toBe(400)
  })

  it('PATCH unit refuse timezone/address/contact (SSOT settings)', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_admin', isWorldScope: true }),
    )
    ;(assertUnitAccess as any).mockResolvedValue({ id: CI })
    for (const body of [
      { timezone: 'Africa/Abidjan' },
      { address: 'x' },
      { contact_email: 'a@b.c' },
      { default_locale: 'fr' },
      { default_currency: 'XOF' },
      { contact_phone: '+1' },
    ]) {
      const res = await unitIdRoute.PATCH(
        mockReq('PATCH', `http://localhost/api/admin/organization-units/${CI}`, body),
        { params: { id: CI } },
      )
      expect(res.status).toBe(400)
    }
  })

  it('POST units refuse champs opérationnels (SSOT)', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_super_admin', isWorldScope: true }),
    )
    const res = await unitsRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/organization-units', {
        unit_type: 'continental_zone',
        parent_id: HQ,
        name: 'Zone X',
        timezone: 'UTC',
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/opérationnels|organization-unit-settings/)
  })

  it('city structurelle : units l’accepte, settings la refuse', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const unitsSrc = readFileSync(
      join(process.cwd(), 'src/app/api/admin/organization-units/[id]/route.ts'),
      'utf8',
    )
    const listSrc = readFileSync(
      join(process.cwd(), 'src/app/api/admin/organization-units/route.ts'),
      'utf8',
    )
    const settingsSrc = readFileSync(
      join(process.cwd(), 'src/app/api/admin/organization-unit-settings/route.ts'),
      'utf8',
    )
    expect(unitsSrc).toMatch(/const UNIT_COLS =[\s\S]*\bcity\b/)
    expect(unitsSrc).toMatch(/ALLOWED_PATCH = \[[^\]]*'city'/)
    expect(listSrc).toMatch(/const UNIT_COLS =[\s\S]*\bcity\b/)
    expect(listSrc).not.toMatch(/city:\s*row\.city/)
    // settings refuse city (pas dans ALLOWED / COLS)
    expect(settingsSrc).not.toMatch(/\bcity\b/)

    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_admin', isWorldScope: true }),
    )
    ;(assertUnitAccess as any).mockResolvedValue({
      id: CI,
      materialized_path: `/${HQ}/${AF}/${CI}/`,
    })
    const res = await unitSettingsRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-unit-settings', {
        unitId: CI,
        city: 'Abidjan',
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/non modifiables/)
  })

  it('branding mondial refusé à admin local', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    ;(canManageWorldSettings as any).mockReturnValue(false)
    const res = await worldSettingsRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/organization-settings', {
        display_name: 'Hacked',
      }),
    )
    expect(res.status).toBe(403)
  })

  it('template pastoral verrouillé : step_key non modifiable', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_super_admin', isWorldScope: true }),
    )
    ;(canEditPastoralTemplate as any).mockReturnValue(true)
    const tq: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'tpl-1', locked: false }, error: null }),
    }
    const oq: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { pastoral_locked: false }, error: null }),
    }
    ;(supabaseAdmin as any).from = vi.fn((table: string) => {
      if (table === 'pastoral_journey_templates') return tq
      if (table === 'organization_settings') return oq
      return listQuery([])
    })
    const res = await pastoralRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/pastoral-settings', {
        steps: [{ id: 's1', step_key: 'hacked' }],
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/step_key/)
  })

  it('template pastoral verrouillé réservé mondial (local refuse edit)', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    ;(canEditPastoralTemplate as any).mockReturnValue(false)
    const res = await pastoralRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/pastoral-settings', {
        name: 'X',
      }),
    )
    expect(res.status).toBe(403)
  })
})

describe('Lot 5 — membres unit scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminOrganizationForRequest as any).mockResolvedValue(ORG)
    ;(resolveAdminActorProfile as any).mockResolvedValue({
      userId: 'actor-1',
      email: 'a@x.com',
      role: 'admin',
    })
  })

  it('création refuse membership_role / unit_role client (anti auto-promotion)', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'national_admin', isWorldScope: false, homeUnitIds: [CI] }),
    )
    const res = await adminMembresRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/membres', {
        email: 'x@y.com',
        prenom: 'A',
        nom: 'B',
        membership_role: 'owner',
        unit_role: 'world_super_admin',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('création refuse organization_unit_id client', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    const res = await adminMembresRoute.POST(
      mockReq('POST', 'http://localhost/api/admin/membres', {
        email: 'x@y.com',
        prenom: 'A',
        nom: 'B',
        organization_unit_id: SISTER,
      }),
    )
    expect(res.status).toBe(400)
  })

  it('liste world scope → getActiveMemberUserIdsForOrganization', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'world_admin', isWorldScope: true, homeUnitIds: [HQ] }),
    )
    ;(getActiveMemberUserIdsForOrganization as any).mockResolvedValue([])
    const res = await adminMembresRoute.GET(mockReq('GET', 'http://localhost/api/admin/membres'))
    expect(res.status).toBe(200)
    expect(getActiveMemberUserIdsForOrganization).toHaveBeenCalledWith(ORG)
  })

  it('liste zone → getActiveUserIdsForUnits borné', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'zone_admin', isWorldScope: false, homeUnitIds: [AF] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([AF, CI])
    ;(getActiveUserIdsForUnits as any).mockResolvedValue([])
    const res = await adminMembresRoute.GET(mockReq('GET', 'http://localhost/api/admin/membres'))
    expect(res.status).toBe(200)
    expect(getActiveUserIdsForUnits).toHaveBeenCalledWith(ORG, [AF, CI])
  })
})

describe('Lot 5 — newcomers unit scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminActorProfile as any).mockResolvedValue({
      userId: 'actor-1',
      email: 'a@x.com',
      role: 'admin',
    })
    ;(resolveNewcomerAdminOrganizationId as any).mockResolvedValue(ORG)
  })

  it('GET local → liste bornée unitIds', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([LOCAL])
    const listForOrganization = vi.fn().mockResolvedValue([])
    ;(getNewcomerIntakesRepository as any).mockReturnValue({
      listForOrganization,
      listJourneyFieldsForOrganization: vi.fn().mockResolvedValue([]),
    })
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(listQuery([]))

    const res = await newcomerRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/newcomer-intakes'),
    )
    expect(res.status).toBe(200)
    expect(listForOrganization).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ unitIds: [LOCAL] }),
    )
  })

  it('GET national → descendants unit ids', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'national_admin', isWorldScope: false, homeUnitIds: [CI] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([CI, LOCAL])
    const listForOrganization = vi.fn().mockResolvedValue([])
    ;(getNewcomerIntakesRepository as any).mockReturnValue({
      listForOrganization,
      listJourneyFieldsForOrganization: vi.fn().mockResolvedValue([]),
    })
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(listQuery([]))

    const res = await newcomerRoute.GET(
      mockReq('GET', 'http://localhost/api/admin/newcomer-intakes'),
    )
    expect(res.status).toBe(200)
    expect(listForOrganization).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ unitIds: [CI, LOCAL] }),
    )
  })

  it('GET zone → pays descendants, pas autre continent', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'zone_admin', isWorldScope: false, homeUnitIds: [AF] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([AF, CI, LOCAL])
    const listForOrganization = vi.fn().mockResolvedValue([])
    ;(getNewcomerIntakesRepository as any).mockReturnValue({
      listForOrganization,
      listJourneyFieldsForOrganization: vi.fn().mockResolvedValue([]),
    })
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(listQuery([]))

    await newcomerRoute.GET(mockReq('GET', 'http://localhost/api/admin/newcomer-intakes'))
    const arg = listForOrganization.mock.calls[0][1]
    expect(arg.unitIds).toEqual([AF, CI, LOCAL])
    expect(arg.unitIds).not.toContain(EU)
  })

  it('PATCH refuse organization_unit_id client non autoritaire', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    ;(getNewcomerIntakesRepository as any).mockReturnValue({})
    const res = await newcomerRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/newcomer-intakes', {
        id: 'n1',
        status: 'contacted',
        organization_unit_id: SISTER,
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/non modifiables/)
  })

  it('PATCH hors périmètre → Demande introuvable', async () => {
    ;(resolveActorUnitContext as any).mockResolvedValue(
      actor({ highestRole: 'local_admin', isWorldScope: false, homeUnitIds: [LOCAL] }),
    )
    ;(listAccessibleUnitIds as any).mockResolvedValue([LOCAL])
    ;(getNewcomerIntakesRepository as any).mockReturnValue({
      listForOrganization: vi.fn().mockResolvedValue([]),
    })
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'n1', organization_unit_id: SISTER },
        error: null,
      }),
    })
    const res = await newcomerRoute.PATCH(
      mockReq('PATCH', 'http://localhost/api/admin/newcomer-intakes', {
        id: 'n1',
        status: 'contacted',
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/introuvable/)
  })
})

describe('Lot 5 — hierarchy pure rules (type parent)', () => {
  it('zone sous zone refusée (expectedChildType)', async () => {
    const { expectedChildType } = await import('@/core/erp/unit')
    expect(expectedChildType('continental_zone')).toBe('national_central_church')
    expect(expectedChildType('continental_zone')).not.toBe('continental_zone')
  })

  it('nationale sous siège refusée', async () => {
    const { expectedChildType } = await import('@/core/erp/unit')
    expect(expectedChildType('world_headquarters')).toBe('continental_zone')
    expect(expectedChildType('world_headquarters')).not.toBe('national_central_church')
  })

  it('locale sous zone refusée', async () => {
    const { expectedChildType } = await import('@/core/erp/unit')
    expect(expectedChildType('continental_zone')).not.toBe('local_church')
    expect(expectedChildType('national_central_church')).toBe('local_church')
  })
})
