/**
 * Lot 4 — Tests API paramètres essentiels organisation.
 * Pattern de mocks aligné sur membres-admin-routes (Lot 3).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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
  requireActiveOwnerOrAdmin: vi.fn(),
}))

import * as organizationRoute from '@/app/api/admin/organization/route'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  resolveAdminOrganizationForRequest,
  requireActiveOwnerOrAdmin,
} from '@/lib/erp/admin-profiles-scope'
import { supabaseAdmin } from '@/lib/supabase'

const ORG_ID = 'org-canon-uuid'

const ORG_ROW = {
  id: ORG_ID,
  name: 'La Chapelle Internationale des Élus du Royaume',
  slug: 'chapelle-du-royaume',
  status: 'active',
  country: 'CI',
  timezone: 'Africa/Abidjan',
  default_locale: 'fr',
  default_currency: 'XOF',
  updated_at: '2026-07-16T00:00:00.000Z',
}

function createMockRequest(method: string, url: string, body?: unknown) {
  const req = new NextRequest(url, {
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
  })
  if (body !== undefined && (method === 'POST' || method === 'PATCH')) {
    // @ts-ignore test double for NextRequest.json
    req.json = vi.fn().mockResolvedValue(body)
  }
  return req
}

function createOrgQueryMock(opts: {
  selectData?: unknown
  selectError?: { message: string } | null
  updateData?: unknown
  updateError?: { message: string } | null
  capture?: { updatePayload?: unknown; eqArgs?: unknown[] }
}) {
  const selectEq = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.selectData ?? null,
      error: opts.selectError ?? null,
    }),
  })
  const select = vi.fn().mockReturnValue({ eq: selectEq })

  const updateSelectEq = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.updateData ?? null,
      error: opts.updateError ?? null,
    }),
  })
  const updateSelect = vi.fn().mockReturnValue({ eq: updateSelectEq })
  const update = vi.fn().mockImplementation((payload: unknown) => {
    if (opts.capture) opts.capture.updatePayload = payload
    return {
      eq: vi.fn().mockImplementation((...args: unknown[]) => {
        if (opts.capture) opts.capture.eqArgs = args
        return { select: updateSelect }
      }),
    }
  })

  // Chain: .update().eq().select().maybeSingle() — also support .select().eq().maybeSingle()
  // Actual route: update().eq().select().maybeSingle()
  const updateEq = vi.fn().mockImplementation((...args: unknown[]) => {
    if (opts.capture) opts.capture.eqArgs = args
    return {
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: opts.updateData ?? null,
          error: opts.updateError ?? null,
        }),
      }),
    }
  })
  const updateFn = vi.fn().mockImplementation((payload: unknown) => {
    if (opts.capture) opts.capture.updatePayload = payload
    return { eq: updateEq }
  })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table !== 'organizations') {
      return {}
    }
    return {
      select,
      update: updateFn,
    }
  })

  return { from, select, selectEq, updateFn, updateEq }
}

describe('Lot 4 — GET /api/admin/organization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminOrganizationForRequest as any).mockResolvedValue(ORG_ID)
    ;(requireActiveOwnerOrAdmin as any).mockResolvedValue(undefined)
  })

  it('1. GET 401 sans admin', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const req = createMockRequest('GET', 'http://localhost/api/admin/organization')
    const res = await organizationRoute.GET(req)
    expect(res.status).toBe(401)
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it('2. GET organisation absente → 404 contrôlé', async () => {
    const err = Object.assign(new Error('Organisation canonique slug=chapelle-du-royaume absente.'), {
      code: 'canonical_organization_error',
    })
    ;(resolveAdminOrganizationForRequest as any).mockRejectedValue(err)
    const req = createMockRequest('GET', 'http://localhost/api/admin/organization')
    const res = await organizationRoute.GET(req)
    expect(res.status).toBe(404)
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it('3. GET 403 si owner/admin échoue', async () => {
    ;(requireActiveOwnerOrAdmin as any).mockRejectedValue(
      Object.assign(new Error('Autorisation organisationnelle insuffisante.'), {
        code: 'admin_profile_scope_error',
        status: 403,
      }),
    )
    const req = createMockRequest('GET', 'http://localhost/api/admin/organization')
    const res = await organizationRoute.GET(req)
    expect(res.status).toBe(403)
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it('4. GET service_role non appelé avant les gardes', async () => {
    const order: string[] = []
    ;(isAdminRequest as any).mockImplementation(() => {
      order.push('isAdminRequest')
      return true
    })
    ;(resolveAdminOrganizationForRequest as any).mockImplementation(async () => {
      order.push('resolve')
      return ORG_ID
    })
    ;(requireActiveOwnerOrAdmin as any).mockImplementation(async () => {
      order.push('requireOwnerAdmin')
    })
    const mock = createOrgQueryMock({ selectData: ORG_ROW })
    ;(supabaseAdmin as any).from = vi.fn().mockImplementation((table: string) => {
      order.push('from:' + table)
      return mock.from(table)
    })

    const req = createMockRequest('GET', 'http://localhost/api/admin/organization')
    await organizationRoute.GET(req)
    expect(order.indexOf('isAdminRequest')).toBeLessThan(order.indexOf('resolve'))
    expect(order.indexOf('resolve')).toBeLessThan(order.indexOf('requireOwnerAdmin'))
    expect(order.indexOf('requireOwnerAdmin')).toBeLessThan(order.indexOf('from:organizations'))
  })

  it('5. GET requête bornée par .eq(id, organizationId)', async () => {
    const mock = createOrgQueryMock({ selectData: ORG_ROW })
    ;(supabaseAdmin as any).from = mock.from
    const req = createMockRequest('GET', 'http://localhost/api/admin/organization')
    await organizationRoute.GET(req)
    expect(mock.from).toHaveBeenCalledWith('organizations')
    expect(mock.selectEq).toHaveBeenCalledWith('id', ORG_ID)
  })

  it('6. GET 200 champs publics uniquement', async () => {
    const mock = createOrgQueryMock({ selectData: ORG_ROW })
    ;(supabaseAdmin as any).from = mock.from
    const req = createMockRequest('GET', 'http://localhost/api/admin/organization')
    const res = await organizationRoute.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data).toEqual({
      id: ORG_ID,
      name: ORG_ROW.name,
      slug: ORG_ROW.slug,
      status: ORG_ROW.status,
      country: ORG_ROW.country,
      timezone: ORG_ROW.timezone,
      default_locale: ORG_ROW.default_locale,
      default_currency: ORG_ROW.default_currency,
      updated_at: ORG_ROW.updated_at,
    })
    expect(json.data).not.toHaveProperty('created_by')
    expect(json.data).not.toHaveProperty('logo_url')
  })

  it('7. GET aucun id organisation client utilisé', async () => {
    const mock = createOrgQueryMock({ selectData: ORG_ROW })
    ;(supabaseAdmin as any).from = mock.from
    const req = createMockRequest(
      'GET',
      'http://localhost/api/admin/organization?organization_id=evil&id=evil',
    )
    await organizationRoute.GET(req)
    expect(resolveAdminOrganizationForRequest).toHaveBeenCalledWith(true)
    expect(mock.selectEq).toHaveBeenCalledWith('id', ORG_ID)
    expect(mock.selectEq).not.toHaveBeenCalledWith('id', 'evil')
  })
})

describe('Lot 4 — PATCH /api/admin/organization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
    ;(resolveAdminOrganizationForRequest as any).mockResolvedValue(ORG_ID)
    ;(requireActiveOwnerOrAdmin as any).mockResolvedValue(undefined)
  })

  it('8. PATCH 401 sans admin', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const req = createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
      name: 'X',
    })
    const res = await organizationRoute.PATCH(req)
    expect(res.status).toBe(401)
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it('9. PATCH 403 rôle insuffisant', async () => {
    ;(requireActiveOwnerOrAdmin as any).mockRejectedValue(
      Object.assign(new Error('Autorisation organisationnelle insuffisante.'), {
        code: 'admin_profile_scope_error',
        status: 403,
      }),
    )
    const capture: { updatePayload?: unknown } = {}
    const mock = createOrgQueryMock({ updateData: ORG_ROW, capture })
    ;(supabaseAdmin as any).from = mock.from
    const req = createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
      name: 'X',
    })
    const res = await organizationRoute.PATCH(req)
    expect(res.status).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it('10. PATCH payload vide → 400', async () => {
    const mock = createOrgQueryMock({ updateData: ORG_ROW })
    ;(supabaseAdmin as any).from = mock.from
    const req = createMockRequest('PATCH', 'http://localhost/api/admin/organization', {})
    const res = await organizationRoute.PATCH(req)
    expect(res.status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it('11. PATCH champ inconnu → 400', async () => {
    const mock = createOrgQueryMock({ updateData: ORG_ROW })
    ;(supabaseAdmin as any).from = mock.from
    const req = createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
      slogan: 'x',
    })
    const res = await organizationRoute.PATCH(req)
    expect(res.status).toBe(400)
  })

  it('12. PATCH rejet id', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', { id: 'x' }),
    )
    expect(res.status).toBe(400)
  })

  it('13. PATCH rejet slug', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', { slug: 'evil' }),
    )
    expect(res.status).toBe(400)
  })

  it('14. PATCH rejet status', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', { status: 'archived' }),
    )
    expect(res.status).toBe(400)
  })

  it('15. PATCH rejet organization_id', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        organization_id: 'evil',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('16. PATCH rejet organizationId', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        organizationId: 'evil',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('17. PATCH name vide/invalide → 400', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', { name: '   ' }),
    )
    expect(res.status).toBe(400)
  })

  it('18. PATCH country Côte d’Ivoire accepté', async () => {
    const capture: { updatePayload?: unknown; eqArgs?: unknown[] } = {}
    const mock = createOrgQueryMock({
      updateData: { ...ORG_ROW, country: "Côte d'Ivoire" },
      capture,
    })
    ;(supabaseAdmin as any).from = mock.from
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        country: "Côte d'Ivoire",
      }),
    )
    expect(res.status).toBe(200)
    expect(capture.updatePayload).toEqual({ country: "Côte d'Ivoire" })
  })

  it('19. PATCH timezone invalide → 400', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        timezone: 'Not/A_Real_Zone',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('20. PATCH Africa/Abidjan accepté', async () => {
    const capture: { updatePayload?: unknown } = {}
    const mock = createOrgQueryMock({
      updateData: { ...ORG_ROW, timezone: 'Africa/Abidjan' },
      capture,
    })
    ;(supabaseAdmin as any).from = mock.from
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        timezone: 'Africa/Abidjan',
      }),
    )
    expect(res.status).toBe(200)
    expect(capture.updatePayload).toEqual({ timezone: 'Africa/Abidjan' })
  })

  it('21. PATCH locale normalisée', async () => {
    const capture: { updatePayload?: unknown } = {}
    const mock = createOrgQueryMock({
      updateData: { ...ORG_ROW, default_locale: 'fr' },
      capture,
    })
    ;(supabaseAdmin as any).from = mock.from
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        default_locale: 'FR',
      }),
    )
    expect(res.status).toBe(200)
    expect(capture.updatePayload).toEqual({ default_locale: 'fr' })
  })

  it('22. PATCH devise normalisée en XOF', async () => {
    const capture: { updatePayload?: unknown } = {}
    const mock = createOrgQueryMock({
      updateData: { ...ORG_ROW, default_currency: 'XOF' },
      capture,
    })
    ;(supabaseAdmin as any).from = mock.from
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        default_currency: 'xof',
      }),
    )
    expect(res.status).toBe(200)
    expect(capture.updatePayload).toEqual({ default_currency: 'XOF' })
  })

  it('23. PATCH devise invalide → 400', async () => {
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        default_currency: 'EURO',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('24. PATCH update borné par organisation canonique', async () => {
    const capture: { eqArgs?: unknown[] } = {}
    const mock = createOrgQueryMock({ updateData: ORG_ROW, capture })
    ;(supabaseAdmin as any).from = mock.from
    await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', { name: 'Org' }),
    )
    expect(capture.eqArgs).toEqual(['id', ORG_ID])
  })

  it('25. PATCH aucun champ protégé transmis à update', async () => {
    const capture: { updatePayload?: any } = {}
    const mock = createOrgQueryMock({ updateData: ORG_ROW, capture })
    ;(supabaseAdmin as any).from = mock.from
    await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        name: 'Org',
        country: 'CI',
        timezone: 'Africa/Abidjan',
        default_locale: 'fr',
        default_currency: 'XOF',
      }),
    )
    const p = capture.updatePayload
    expect(p).toEqual({
      name: 'Org',
      country: 'CI',
      timezone: 'Africa/Abidjan',
      default_locale: 'fr',
      default_currency: 'XOF',
    })
    expect(p).not.toHaveProperty('id')
    expect(p).not.toHaveProperty('slug')
    expect(p).not.toHaveProperty('status')
    expect(p).not.toHaveProperty('organization_id')
  })

  it('26. PATCH 404 si aucune ligne mise à jour', async () => {
    const mock = createOrgQueryMock({ updateData: null })
    ;(supabaseAdmin as any).from = mock.from
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', { name: 'Org' }),
    )
    expect(res.status).toBe(404)
  })

  it('27. PATCH succès 200', async () => {
    const mock = createOrgQueryMock({
      updateData: { ...ORG_ROW, name: 'Nouvelle Org' },
    })
    ;(supabaseAdmin as any).from = mock.from
    const res = await organizationRoute.PATCH(
      createMockRequest('PATCH', 'http://localhost/api/admin/organization', {
        name: 'Nouvelle Org',
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.name).toBe('Nouvelle Org')
    expect(json.data.slug).toBe('chapelle-du-royaume')
  })
})
