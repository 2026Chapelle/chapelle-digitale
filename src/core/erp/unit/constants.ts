import type { OrganizationUnitRole, OrganizationUnitType } from './types'

export const ORGANIZATION_UNIT_TYPES = [
  'world_headquarters',
  'continental_zone',
  'national_central_church',
  'local_church',
] as const satisfies readonly OrganizationUnitType[]

export const ORGANIZATION_UNIT_ROLES = [
  'world_super_admin',
  'world_admin',
  'zone_admin',
  'national_admin',
  'local_admin',
  'staff',
  'member',
  'viewer',
] as const satisfies readonly OrganizationUnitRole[]

export const WORLD_ROLES: readonly OrganizationUnitRole[] = [
  'world_super_admin',
  'world_admin',
]

export const ADMIN_UNIT_ROLES: readonly OrganizationUnitRole[] = [
  'world_super_admin',
  'world_admin',
  'zone_admin',
  'national_admin',
  'local_admin',
]

export function isOrganizationUnitType(v: unknown): v is OrganizationUnitType {
  return typeof v === 'string' && (ORGANIZATION_UNIT_TYPES as readonly string[]).includes(v)
}

export function isOrganizationUnitRole(v: unknown): v is OrganizationUnitRole {
  return typeof v === 'string' && (ORGANIZATION_UNIT_ROLES as readonly string[]).includes(v)
}

export function isWorldUnitRole(role: OrganizationUnitRole): boolean {
  return (WORLD_ROLES as readonly string[]).includes(role)
}

/** Rôles autorisés à gérer des descendants. */
export function roleSeesDescendants(role: OrganizationUnitRole): boolean {
  return (
    role === 'world_super_admin' ||
    role === 'world_admin' ||
    role === 'zone_admin' ||
    role === 'national_admin'
  )
}

export function expectedChildType(parentType: OrganizationUnitType): OrganizationUnitType | null {
  switch (parentType) {
    case 'world_headquarters':
      return 'continental_zone'
    case 'continental_zone':
      return 'national_central_church'
    case 'national_central_church':
      return 'local_church'
    default:
      return null
  }
}

export function expectedDepth(unitType: OrganizationUnitType): number {
  switch (unitType) {
    case 'world_headquarters':
      return 0
    case 'continental_zone':
      return 1
    case 'national_central_church':
      return 2
    case 'local_church':
      return 3
  }
}

/**
 * Path descendant : candidate est self ou sous-arbre de ancestor.
 * Équivalent SQL: equality OR candidate LIKE rtrim(ancestor,'/') || '/%'
 * (frontière de segment — évite l'ambiguïté /ab/ vs /abc/).
 */
export function isPathDescendantOrSelf(ancestorPath: string, candidatePath: string): boolean {
  if (!ancestorPath || !candidatePath) return false
  const base = ancestorPath.replace(/\/+$/, '')
  return (
    candidatePath === ancestorPath ||
    (base.length > 0 &&
      (candidatePath === base + '/' || candidatePath.startsWith(base + '/')))
  )
}
