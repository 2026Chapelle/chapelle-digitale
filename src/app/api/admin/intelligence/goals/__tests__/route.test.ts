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

const listGoalsForOrganization = vi.fn()
const createGoalForOrganization = vi.fn()
const patchGoalForOrganization = vi.fn()
const findDuplicateGoal = vi.fn()
const getGoalForOrganization = vi.fn()
vi.mock('@/lib/intelligence/goals', async () => {
  const actual = await vi.importActual<typeof import('@/lib/intelligence/goals')>('@/lib/intelligence/goals')
  return {
    ...actual,
    listGoalsForOrganization: (organizationId: string) => listGoalsForOrganization(organizationId),
    createGoalForOrganization: (input: unknown) => createGoalForOrganization(input),
    patchGoalForOrganization: (...args: unknown[]) => patchGoalForOrganization(...args),
    findDuplicateGoal: (...args: unknown[]) => findDuplicateGoal(...args),
    getGoalForOrganization: (...args: unknown[]) => getGoalForOrganization(...args),
    sanitizeGoalForPerformance: (goal: unknown) => goal,
    toGoalRecord: (row: unknown) => row,
  }
})

import { GET, PATCH, POST } from '../route'

function req(method: string, body?: unknown) {
  return new NextRequest(
    'http://localhost/api/admin/intelligence/goals',
    body === undefined
      ? { method }
      : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
  )
}

const canonicalGoal = {
  id: 'goal-1',
  organizationId: 'org-1',
  metricKey: 'visits' as const,
  targetValue: 10,
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  status: 'ACTIVE' as const,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  createdBy: 'member-1',
  updatedBy: 'member-2',
}

beforeEach(() => {
  vi.clearAllMocks()
  requireGuardedAdminUnit.mockResolvedValue({
    actor: { memberships: [{ unit_role: 'world_super_admin' }], highestRole: 'world_super_admin', organizationId: 'org-1' },
    organizationId: 'org-1',
    userId: 'author-1',
    email: 'admin@example.com',
  })
  listGoalsForOrganization.mockResolvedValue([canonicalGoal])
  createGoalForOrganization.mockResolvedValue(canonicalGoal)
  patchGoalForOrganization.mockResolvedValue(canonicalGoal)
  findDuplicateGoal.mockResolvedValue(null)
  getGoalForOrganization.mockResolvedValue(canonicalGoal)
})

describe('GET /api/admin/intelligence/goals', () => {
  it('redacts actor identifiers from goal list responses', async () => {
    const res = await GET(req('GET'))

    expect(res.status).toBe(200)
    expect(listGoalsForOrganization).toHaveBeenCalledWith('org-1')
    const json = await res.json()
    const goal = json.data.goals[0]
    expect(goal.createdBy).toBeUndefined()
    expect(goal.updatedBy).toBeUndefined()
    expect(JSON.stringify(json)).not.toContain('member-1')
    expect(JSON.stringify(json)).not.toContain('member-2')
    expect(json.data.organizationId).toBe('org-1')
  })

  it('keeps the guarded organization scope intact', async () => {
    requireGuardedAdminUnit.mockResolvedValueOnce({
      actor: { memberships: [{ unit_role: 'world_super_admin' }], highestRole: 'world_super_admin', organizationId: 'org-2' },
      organizationId: 'org-2',
      userId: 'author-1',
      email: 'admin@example.com',
    })

    const res = await GET(req('GET'))

    expect(res.status).toBe(200)
    expect(listGoalsForOrganization).toHaveBeenCalledWith('org-2')
    const json = await res.json()
    expect(json.data.organizationId).toBe('org-2')
  })

  it('rejects an unauthorized guard', async () => {
    requireGuardedAdminUnit.mockResolvedValueOnce(new NextResponse('unauthorized', { status: 401 }))
    const res = await GET(req('GET'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/admin/intelligence/goals', () => {
  it('redacts actor identifiers from created goals', async () => {
    const res = await POST(
      req('POST', {
        metricKey: 'visits',
        targetValue: 10,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      }),
    )

    expect(res.status).toBe(200)
    expect(createGoalForOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        createdBy: 'author-1',
        updatedBy: 'author-1',
      }),
    )
    const json = await res.json()
    expect(json.data.goal.createdBy).toBeUndefined()
    expect(json.data.goal.updatedBy).toBeUndefined()
    expect(JSON.stringify(json)).not.toContain('member-1')
    expect(JSON.stringify(json)).not.toContain('member-2')
  })

  it('rejects a non-world admin', async () => {
    requireGuardedAdminUnit.mockResolvedValueOnce({
      actor: { memberships: [{ unit_role: 'staff' }], highestRole: 'staff' },
      organizationId: 'org-1',
      userId: 'author-1',
      email: 'admin@example.com',
    })
    const res = await POST(
      req('POST', { metricKey: 'visits', targetValue: 10, periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    )
    expect(res.status).toBe(403)
  })

  it('rejects target <= 0', async () => {
    const res = await POST(
      req('POST', { metricKey: 'visits', targetValue: 0, periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    )
    expect(res.status).toBe(400)
  })

  it('rejects invalid period ordering', async () => {
    const res = await POST(
      req('POST', { metricKey: 'visits', targetValue: 10, periodStart: '2026-08-31', periodEnd: '2026-08-01' }),
    )
    expect(res.status).toBe(400)
  })

  it('prevents duplicate canonical goals', async () => {
    findDuplicateGoal.mockResolvedValueOnce({ id: 'goal-dup' })
    const res = await POST(
      req('POST', {
        metricKey: 'visits',
        targetValue: 10,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      }),
    )
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/admin/intelligence/goals', () => {
  it('redacts actor identifiers from updated goals', async () => {
    const res = await PATCH(req('PATCH', { id: 'goal-1', status: 'ARCHIVED' }))

    expect(res.status).toBe(200)
    expect(getGoalForOrganization).toHaveBeenCalledWith('org-1', 'goal-1')
    expect(patchGoalForOrganization).toHaveBeenCalledWith(
      'org-1',
      'goal-1',
      { metricKey: undefined, targetValue: undefined, periodStart: undefined, periodEnd: undefined, status: 'ARCHIVED' },
      'author-1',
    )
    const json = await res.json()
    expect(json.data.goal.createdBy).toBeUndefined()
    expect(json.data.goal.updatedBy).toBeUndefined()
    expect(JSON.stringify(json)).not.toContain('member-1')
    expect(JSON.stringify(json)).not.toContain('member-2')
  })

  it('rejects cross-org goal lookup through the guarded organization scope', async () => {
    getGoalForOrganization.mockResolvedValueOnce(null)
    const res = await PATCH(req('PATCH', { id: 'goal-2', status: 'ARCHIVED' }))
    expect(res.status).toBe(404)
  })
})
