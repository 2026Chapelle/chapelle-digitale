import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const requireGuardedAdminUnit = vi.fn()
const canManageWorldSettings = vi.fn((actor: { memberships?: Array<{ unit_role: string }> }) =>
  actor.memberships?.some((m) => m.unit_role === 'world_super_admin' || m.unit_role === 'world_admin') ?? false,
)
vi.mock('@/lib/erp', () => ({
  requireGuardedAdminUnit: (arg: any) => requireGuardedAdminUnit(arg),
  mapUnitGuardError: (err: unknown) => (err instanceof Response ? err : new Response('error', { status: 500 })),
  canManageWorldSettings: (actor: any) => canManageWorldSettings(actor),
}))

const from = vi.fn()
vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}))

import { GET, POST, PATCH } from '@/app/api/admin/intelligence/goals/route'

function chain(result: unknown): any {
  const p = Promise.resolve(result)
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return p.then.bind(p)
        if (prop === 'maybeSingle') return () => p
        return () => chain(result)
      },
    },
  )
}

function req(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/admin/intelligence/goals', body === undefined
    ? { method }
    : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  requireGuardedAdminUnit.mockResolvedValue({
    actor: { memberships: [{ unit_role: 'world_super_admin' }], highestRole: 'world_super_admin', organizationId: 'org-1' },
    organizationId: 'org-1',
    userId: 'author-1',
    email: 'admin@example.com',
  })
  from.mockImplementation(() => ({
    select: () => chain({ data: [], error: null }),
  }))
})

describe('GET /api/admin/intelligence/goals', () => {
  it('non-authorized admin guard stops the request', async () => {
    requireGuardedAdminUnit.mockResolvedValueOnce(new NextResponse('unauthorized', { status: 401 }))
    const res = await GET(req('GET'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/admin/intelligence/goals', () => {
  it('rejects a non-world admin', async () => {
    requireGuardedAdminUnit.mockResolvedValueOnce({
      actor: { memberships: [{ unit_role: 'staff' }], highestRole: 'staff' },
      organizationId: 'org-1',
      userId: 'author-1',
      email: 'admin@example.com',
    })
    const res = await POST(req('POST', { metricKey: 'visits', targetValue: 10, periodStart: '2026-08-01', periodEnd: '2026-08-31' }))
    expect(res.status).toBe(403)
  })

  it('rejects target <= 0', async () => {
    const res = await POST(req('POST', { metricKey: 'visits', targetValue: 0, periodStart: '2026-08-01', periodEnd: '2026-08-31' }))
    expect(res.status).toBe(400)
  })

  it('rejects invalid period ordering', async () => {
    const res = await POST(req('POST', { metricKey: 'visits', targetValue: 10, periodStart: '2026-08-31', periodEnd: '2026-08-01' }))
    expect(res.status).toBe(400)
  })

  it('creates a canonical goal for the canonical organization', async () => {
    from.mockImplementation((table: string) => {
      if (table === 'intelligence_goals') {
        return {
          select: () => chain({ data: null, error: null }),
          insert: () => ({ select: () => chain({ data: { id: 'goal-1' }, error: null }) }),
        }
      }
      return { select: () => chain({ data: { id: 'org-1' }, error: null }) }
    })
    const res = await POST(req('POST', {
      metricKey: 'visits',
      targetValue: 10,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('createdBy')
    expect(JSON.stringify(json)).not.toContain('updatedBy')
  })

  it('prevents duplicate canonical goals', async () => {
    from.mockImplementation((table: string) => {
      if (table === 'intelligence_goals') {
        return {
          select: () => chain({ data: [{ id: 'goal-1' }], error: null }),
        }
      }
      return { select: () => chain({ data: { id: 'org-1' }, error: null }) }
    })
    const res = await POST(req('POST', {
      metricKey: 'visits',
      targetValue: 10,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
    }))
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/admin/intelligence/goals', () => {
  it('archives an existing goal instead of deleting it', async () => {
    from.mockImplementation((table: string) => {
      if (table === 'intelligence_goals') {
        return {
          select: () =>
            chain({
              data: {
                id: 'goal-1',
                organization_id: 'org-1',
                metric_key: 'visits',
                target_value: 100,
                period_start: '2026-08-01',
                period_end: '2026-08-31',
                status: 'ACTIVE',
                created_at: '2026-08-01T00:00:00.000Z',
                updated_at: '2026-08-01T00:00:00.000Z',
                created_by: 'author-1',
                updated_by: 'author-1',
              },
              error: null,
            }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () =>
                  chain({
                    data: {
                      id: 'goal-1',
                      organization_id: 'org-1',
                      metric_key: 'visits',
                      target_value: 100,
                      period_start: '2026-08-01',
                      period_end: '2026-08-31',
                      status: 'ARCHIVED',
                      created_at: '2026-08-01T00:00:00.000Z',
                      updated_at: '2026-08-02T00:00:00.000Z',
                      created_by: 'author-1',
                      updated_by: 'author-1',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }
      }
      return { select: () => chain({ data: { id: 'org-1' }, error: null }) }
    })
    const res = await PATCH(req('PATCH', { id: 'goal-1', status: 'ARCHIVED' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('createdBy')
    expect(JSON.stringify(json)).not.toContain('updatedBy')
  })
})
