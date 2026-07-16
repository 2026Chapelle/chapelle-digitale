/**
 * Lot 6 — règles pures de gouvernance unitaire (sans I/O).
 */
import type { OrganizationUnitRole, OrganizationUnitType } from '@/core/erp/unit'
import { assignableRolesFor, type ActorUnitContext } from '@/lib/erp/unit-access'

export const ROLE_RANK: Record<OrganizationUnitRole, number> = {
  viewer: 1,
  member: 2,
  staff: 3,
  local_admin: 4,
  national_admin: 5,
  zone_admin: 6,
  world_admin: 7,
  world_super_admin: 8,
}

export const INVITABLE_ROLES: readonly OrganizationUnitRole[] = [
  'world_admin',
  'zone_admin',
  'national_admin',
  'local_admin',
  'staff',
  'member',
  'viewer',
] as const

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function roleRank(role: string | null | undefined): number {
  if (!role || !(role in ROLE_RANK)) return 0
  return ROLE_RANK[role as OrganizationUnitRole]
}

export function roleFitsUnitType(role: OrganizationUnitRole, unitType: OrganizationUnitType): boolean {
  if (role === 'world_super_admin' || role === 'world_admin') return unitType === 'world_headquarters'
  if (role === 'zone_admin') return unitType === 'continental_zone'
  if (role === 'national_admin') return unitType === 'national_central_church'
  if (role === 'local_admin') return unitType === 'local_church'
  return role === 'staff' || role === 'member' || role === 'viewer'
}

export function isInvitableRole(role: string): role is OrganizationUnitRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role)
}

export function canAssignRole(actor: ActorUnitContext, role: OrganizationUnitRole): boolean {
  return assignableRolesFor(actor).includes(role)
}

/** Gestion d'un sujet par l'acteur (hors dernier-super). */
export function canManageSubjectRole(
  actorRole: OrganizationUnitRole | null,
  subjectRole: OrganizationUnitRole,
): { ok: boolean; code?: string } {
  if (!actorRole) return { ok: false, code: 'no_actor_role' }
  const ar = roleRank(actorRole)
  const sr = roleRank(subjectRole)
  if (sr > ar) return { ok: false, code: 'superior' }
  if (sr === ar && actorRole !== 'world_super_admin') return { ok: false, code: 'peer' }
  return { ok: true }
}

export function isSensitiveAdminRole(role: OrganizationUnitRole): boolean {
  return roleRank(role) >= 4
}

export function isSelfPromotion(
  actorId: string,
  subjectId: string,
  fromRole: OrganizationUnitRole | null,
  toRole: OrganizationUnitRole,
): boolean {
  if (actorId !== subjectId) return false
  return roleRank(toRole) > roleRank(fromRole)
}

export function isSelfSensitiveDemotion(
  actorId: string,
  subjectId: string,
  fromRole: OrganizationUnitRole,
  toRoleOrStatus: OrganizationUnitRole | 'removed' | 'suspended',
): boolean {
  if (actorId !== subjectId) return false
  if (!isSensitiveAdminRole(fromRole)) return false
  if (toRoleOrStatus === 'removed' || toRoleOrStatus === 'suspended') return true
  return roleRank(toRoleOrStatus) < 4
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
