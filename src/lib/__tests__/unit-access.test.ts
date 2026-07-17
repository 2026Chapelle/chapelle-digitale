/**
 * Lot 5 — tests pure path + matrice de rôles (sans I/O).
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: vi.fn() } }))
vi.mock('@/lib/supabase-server', () => ({ getServerProfile: vi.fn() }))

import {
  isPathDescendantOrSelf,
  expectedChildType,
  expectedDepth,
  isWorldUnitRole,
  roleSeesDescendants,
  isOrganizationUnitRole,
  isOrganizationUnitType,
} from '@/core/erp/unit'
import { assignableRolesFor, type ActorUnitContext } from '@/lib/erp/unit-access'

describe('Lot 5 — hierarchy pure helpers', () => {
  it('path descendant or self', () => {
    const hq = '/u1/'
    const af = '/u1/u2/'
    const ci = '/u1/u2/u3/'
    const other = '/u9/'
    expect(isPathDescendantOrSelf(hq, hq)).toBe(true)
    expect(isPathDescendantOrSelf(hq, af)).toBe(true)
    expect(isPathDescendantOrSelf(hq, ci)).toBe(true)
    expect(isPathDescendantOrSelf(af, ci)).toBe(true)
    expect(isPathDescendantOrSelf(ci, af)).toBe(false)
    expect(isPathDescendantOrSelf(hq, other)).toBe(false)
  })

  it('parent → child type rules', () => {
    expect(expectedChildType('world_headquarters')).toBe('continental_zone')
    expect(expectedChildType('continental_zone')).toBe('national_central_church')
    expect(expectedChildType('national_central_church')).toBe('local_church')
    expect(expectedChildType('local_church')).toBeNull()
  })

  it('depths', () => {
    expect(expectedDepth('world_headquarters')).toBe(0)
    expect(expectedDepth('local_church')).toBe(3)
  })

  it('world roles and descendants', () => {
    expect(isWorldUnitRole('world_super_admin')).toBe(true)
    expect(isWorldUnitRole('local_admin')).toBe(false)
    expect(roleSeesDescendants('zone_admin')).toBe(true)
    expect(roleSeesDescendants('local_admin')).toBe(false)
  })

  it('type/role guards', () => {
    expect(isOrganizationUnitType('continental_zone')).toBe(true)
    expect(isOrganizationUnitType('evil')).toBe(false)
    expect(isOrganizationUnitRole('national_admin')).toBe(true)
    expect(isOrganizationUnitRole('owner')).toBe(false)
  })

  it('assignable roles — no self-promotion to world_super_admin', () => {
    const actor = {
      highestRole: 'world_admin',
      memberships: [],
      homeUnitIds: [],
      isWorldScope: true,
      userId: 'u',
      email: null,
      organizationId: 'o',
    } as ActorUnitContext
    const roles = assignableRolesFor(actor)
    expect(roles).not.toContain('world_super_admin')
    expect(roles).toContain('zone_admin')
  })

  it('local admin cannot assign national_admin', () => {
    const actor = {
      highestRole: 'local_admin',
      memberships: [],
      homeUnitIds: [],
      isWorldScope: false,
      userId: 'u',
      email: null,
      organizationId: 'o',
    } as ActorUnitContext
    expect(assignableRolesFor(actor)).toEqual(['staff', 'member', 'viewer'])
  })

  it('auto-promotion refusée : world_admin ne peut pas assigner world_super_admin', () => {
    const roles = assignableRolesFor({
      highestRole: 'world_admin',
      memberships: [],
      homeUnitIds: ['hq'],
      isWorldScope: true,
      userId: 'u',
      email: null,
      organizationId: 'o',
    } as ActorUnitContext)
    expect(roles).not.toContain('world_super_admin')
  })

  it('path sœur (autre branche) non descendant', () => {
    const af = '/hq/af/'
    const eu = '/hq/eu/'
    const ci = '/hq/af/ci/'
    expect(isPathDescendantOrSelf(af, eu)).toBe(false)
    expect(isPathDescendantOrSelf(af, ci)).toBe(true)
    expect(isPathDescendantOrSelf(eu, ci)).toBe(false)
  })

  it('path anti-ambiguïté /ab/ vs /abc/ (frontière rtrim + /%)', () => {
    // égalité
    expect(isPathDescendantOrSelf('/ab/', '/ab/')).toBe(true)
    expect(isPathDescendantOrSelf('/ab', '/ab')).toBe(true)
    // descendant sous segment
    expect(isPathDescendantOrSelf('/ab/', '/ab/c/')).toBe(true)
    expect(isPathDescendantOrSelf('/ab', '/ab/c/')).toBe(true)
    expect(isPathDescendantOrSelf('/ab', '/ab/')).toBe(true)
    // pas de faux positif préfixe nu
    expect(isPathDescendantOrSelf('/ab/', '/abc/')).toBe(false)
    expect(isPathDescendantOrSelf('/ab', '/abc/')).toBe(false)
    expect(isPathDescendantOrSelf('/ab', '/abc')).toBe(false)
    expect(isPathDescendantOrSelf('/hq/af/', '/hq/afx/')).toBe(false)
  })
})
