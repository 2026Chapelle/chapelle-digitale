import { describe, it, expect } from 'vitest'
import {
  roleRank,
  roleFitsUnitType,
  isInvitableRole,
  canManageSubjectRole,
  isSelfPromotion,
  isSelfSensitiveDemotion,
  normalizeEmail,
  INVITATION_TTL_MS,
} from '@/lib/erp/unit-governance-rules'
import { assignableRolesFor, canAssignRoleOnUnit, type ActorUnitContext } from '@/lib/erp/unit-access'

function actor(role: string): ActorUnitContext {
  return {
    userId: 'a1',
    email: 'a@x.com',
    organizationId: 'org',
    memberships: [
      {
        id: 'm1',
        organization_id: 'org',
        organization_unit_id: 'u1',
        user_id: 'a1',
        unit_role: role as any,
        status: 'active',
        is_primary: true,
      },
    ],
    homeUnitIds: ['u1'],
    isWorldScope: role.startsWith('world_'),
    highestRole: role as any,
  }
}

describe('Lot 6 — governance rules pure', () => {
  it('ordre d’autorité', () => {
    expect(roleRank('viewer')).toBeLessThan(roleRank('member'))
    expect(roleRank('local_admin')).toBeLessThan(roleRank('zone_admin'))
    expect(roleRank('world_admin')).toBeLessThan(roleRank('world_super_admin'))
  })

  it('compatibilité rôle/type', () => {
    expect(roleFitsUnitType('zone_admin', 'continental_zone')).toBe(true)
    expect(roleFitsUnitType('zone_admin', 'local_church')).toBe(false)
    expect(roleFitsUnitType('local_admin', 'local_church')).toBe(true)
    expect(roleFitsUnitType('staff', 'continental_zone')).toBe(true)
  })

  it('world_super_admin non invitable', () => {
    expect(isInvitableRole('world_super_admin')).toBe(false)
    expect(isInvitableRole('zone_admin')).toBe(true)
  })

  it('auto-promotion et auto-rétrogradation sensible', () => {
    expect(isSelfPromotion('u', 'u', 'local_admin', 'zone_admin')).toBe(true)
    expect(isSelfPromotion('u', 'v', 'local_admin', 'zone_admin')).toBe(false)
    expect(isSelfSensitiveDemotion('u', 'u', 'local_admin', 'member')).toBe(true)
    expect(isSelfSensitiveDemotion('u', 'u', 'staff', 'member')).toBe(false)
  })

  it('peer management : world_admin ne gère pas world_admin', () => {
    expect(canManageSubjectRole('world_admin', 'world_admin').ok).toBe(false)
    expect(canManageSubjectRole('world_super_admin', 'world_admin').ok).toBe(true)
  })

  it('zone_admin n’assigne pas zone_admin ni world', () => {
    const roles = assignableRolesFor(actor('zone_admin'))
    expect(roles).not.toContain('zone_admin')
    expect(roles).not.toContain('world_admin')
    expect(roles).toContain('national_admin')
  })

  it('canAssignRoleOnUnit combine assignable + type', () => {
    expect(canAssignRoleOnUnit(actor('zone_admin'), 'national_admin', 'national_central_church')).toBe(
      true,
    )
    expect(canAssignRoleOnUnit(actor('zone_admin'), 'national_admin', 'continental_zone')).toBe(false)
  })

  it('TTL invitation 7 jours', () => {
    expect(INVITATION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('normalizeEmail', () => {
    expect(normalizeEmail('  A@B.C  ')).toBe('a@b.c')
  })
})
