import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVerifiedRouteProfile: vi.fn(),
  resolveAdminOrganizationForRequest: vi.fn(),
  resolveActorUnitContext: vi.fn(),
}))

const { getVerifiedRouteProfile, resolveAdminOrganizationForRequest, resolveActorUnitContext } = mocks

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: (...args: unknown[]) => getVerifiedRouteProfile(...args),
}))

vi.mock('@/lib/erp/admin-profiles-scope', () => ({
  resolveAdminOrganizationForRequest: (...args: unknown[]) => resolveAdminOrganizationForRequest(...args),
}))

vi.mock('@/lib/erp/unit-access', () => ({
  canManageWorldSettings: (actor: { highestRole?: string | null }) =>
    actor.highestRole === 'world_admin' || actor.highestRole === 'world_super_admin',
  resolveActorUnitContext: (...args: unknown[]) => resolveActorUnitContext(...args),
}))

import { resolveEditorialWorkspaceAccess } from '../permissions'

beforeEach(() => {
  vi.clearAllMocks()
  getVerifiedRouteProfile.mockResolvedValue({
    uid: 'user_01',
    role: 'editorial_manager',
    email: 'editor@example.com',
    profile: {},
  })
  resolveAdminOrganizationForRequest.mockResolvedValue('org_01')
  resolveActorUnitContext.mockResolvedValue({
    userId: 'user_01',
    email: 'editor@example.com',
    organizationId: 'org_01',
    memberships: [],
    homeUnitIds: ['unit_01'],
    isWorldScope: false,
    highestRole: 'staff',
  })
})

describe('resolveEditorialWorkspaceAccess', () => {
  it('allows delegated editorial managers without requiring world admin scope', async () => {
    const response = await resolveEditorialWorkspaceAccess(
      new NextRequest('http://localhost/api/admin/intelligence/editorial'),
      'write',
    )

    expect(response).not.toBeInstanceOf(Response)
    if (response instanceof Response) {
      throw new Error('Expected a resolved access payload.')
    }

    expect(response.organizationId).toBe('org_01')
    expect(response.userId).toBe('user_01')
    expect(resolveAdminOrganizationForRequest).toHaveBeenCalled()
    expect(resolveActorUnitContext).toHaveBeenCalledWith('org_01', 'user_01')
  })
})
