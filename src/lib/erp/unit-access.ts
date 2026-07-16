/**
 * Lot 5 — résolution acteur + périmètre unité (serveur).
 *
 * Pile : cookie admin (appelant) + profileId réel + memberships unit actives.
 * L'existence d'un autre owner/admin ne constitue JAMAIS l'autorisation de l'appelant.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import {
  isPathDescendantOrSelf,
  isWorldUnitRole,
  roleSeesDescendants,
  type OrganizationUnitRole,
  type OrganizationUnitType,
  ADMIN_UNIT_ROLES,
} from '@/core/erp/unit'
import { requireOrganizationId } from '@/lib/pastoral/newcomer-organization-id'

export class UnitAccessError extends Error {
  readonly code = 'unit_access_error' as const
  constructor(
    message: string,
    public readonly status: number = 403,
    public readonly errorCode?: string,
  ) {
    super(message)
    this.name = 'UnitAccessError'
  }
}

export type UnitMembershipRow = {
  id: string
  organization_id: string
  organization_unit_id: string
  user_id: string
  unit_role: OrganizationUnitRole
  status: string
  is_primary: boolean
  unit?: {
    id: string
    name: string
    slug: string
    unit_type: OrganizationUnitType
    status: string
    materialized_path: string
    depth: number
    parent_id: string | null
    continent_code: string | null
    country_code: string | null
  } | null
}

export type ActorUnitContext = {
  userId: string
  email: string | null
  organizationId: string
  memberships: UnitMembershipRow[]
  /** Unités racines d'affectation (primary en premier). */
  homeUnitIds: string[]
  /** true si au moins un rôle world_* actif. */
  isWorldScope: boolean
  highestRole: OrganizationUnitRole | null
}

type DbClient = { from: (table: string) => any }

/**
 * Résout l'identité réelle via session Supabase (Route Handler).
 * Ne se contente PAS du cookie admin (`cier_admin` n'est jamais l'identité).
 *
 * Chaîne : createRouteClient → auth.getUser() → profiles via service_role.
 */
export async function resolveAdminActorProfile(): Promise<{
  userId: string
  email: string | null
  role: string | null
}> {
  const sp = await getVerifiedRouteProfile()
  if (!sp?.uid) {
    throw new UnitAccessError('Identité administrateur requise.', 403, 'actor_required')
  }
  return {
    userId: sp.uid,
    email: sp.email,
    role: sp.role || null,
  }
}

export async function loadActorUnitMemberships(
  organizationId: unknown,
  userId: string,
  client: DbClient = supabaseAdmin as any,
): Promise<UnitMembershipRow[]> {
  const orgId = requireOrganizationId(organizationId)

  const { data, error } = await client
    .from('organization_unit_members')
    .select(
      'id, organization_id, organization_unit_id, user_id, unit_role, status, is_primary, unit:organization_units(id, name, slug, unit_type, status, materialized_path, depth, parent_id, continent_code, country_code)',
    )
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    throw new UnitAccessError(error.message, 500)
  }

  return (Array.isArray(data) ? data : []) as UnitMembershipRow[]
}

export async function resolveActorUnitContext(
  organizationId: unknown,
  userId: string,
  client: DbClient = supabaseAdmin as any,
): Promise<ActorUnitContext> {
  const orgId = requireOrganizationId(organizationId)
  const memberships = await loadActorUnitMemberships(orgId, userId, client)

  if (memberships.length === 0) {
    throw new UnitAccessError('Aucune affectation d’unité active.', 403, 'no_unit_membership')
  }

  const adminish = memberships.filter((m) =>
    (ADMIN_UNIT_ROLES as readonly string[]).includes(m.unit_role),
  )
  const usable = adminish.length > 0 ? adminish : memberships

  const isWorldScope = usable.some((m) => isWorldUnitRole(m.unit_role))
  const primary = usable.find((m) => m.is_primary) || usable[0]
  const homeUnitIds = Array.from(
    new Set(usable.map((m) => m.organization_unit_id).filter(Boolean)),
  )
  if (primary?.organization_unit_id) {
    homeUnitIds.sort((a, b) =>
      a === primary.organization_unit_id ? -1 : b === primary.organization_unit_id ? 1 : 0,
    )
  }

  const roleRank: Record<string, number> = {
    world_super_admin: 100,
    world_admin: 90,
    zone_admin: 70,
    national_admin: 50,
    local_admin: 40,
    staff: 20,
    member: 10,
    viewer: 5,
  }
  let highestRole: OrganizationUnitRole | null = null
  let best = -1
  for (const m of usable) {
    const r = roleRank[m.unit_role] ?? 0
    if (r > best) {
      best = r
      highestRole = m.unit_role
    }
  }

  return {
    userId,
    email: null,
    organizationId: orgId,
    memberships: usable,
    homeUnitIds,
    isWorldScope,
    highestRole,
  }
}

/**
 * Liste les unit ids accessibles (propre + descendants si rôle le permet).
 */
export async function listAccessibleUnitIds(
  actor: ActorUnitContext,
  client: DbClient = supabaseAdmin as any,
): Promise<string[]> {
  if (actor.isWorldScope) {
    const { data, error } = await client
      .from('organization_units')
      .select('id')
      .eq('organization_id', actor.organizationId)
      .eq('status', 'active')
    if (error) throw new UnitAccessError(error.message, 500)
    return (data || []).map((r: any) => r.id as string).filter(Boolean)
  }

  const paths = actor.memberships
    .map((m) => m.unit?.materialized_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)

  if (paths.length === 0) {
    return [...actor.homeUnitIds]
  }

  const { data, error } = await client
    .from('organization_units')
    .select('id, materialized_path')
    .eq('organization_id', actor.organizationId)
    .eq('status', 'active')

  if (error) throw new UnitAccessError(error.message, 500)

  const allowed = new Set<string>()
  for (const row of data || []) {
    const path = row.materialized_path as string
    const id = row.id as string
    for (const m of actor.memberships) {
      const homePath = m.unit?.materialized_path
      if (!homePath) continue
      if (roleSeesDescendants(m.unit_role)) {
        if (isPathDescendantOrSelf(homePath, path)) allowed.add(id)
      } else if (id === m.organization_unit_id) {
        allowed.add(id)
      }
    }
  }
  return Array.from(allowed)
}

/**
 * 404 uniforme hors périmètre (pas de fuite d'existence).
 */
export async function assertUnitAccess(
  actor: ActorUnitContext,
  unitId: string,
  opts?: { write?: boolean },
  client: DbClient = supabaseAdmin as any,
): Promise<{
  id: string
  materialized_path: string
  unit_type: OrganizationUnitType
  name: string
  slug: string
  parent_id: string | null
  depth: number
  continent_code: string | null
  country_code: string | null
  status: string
}> {
  if (!unitId || typeof unitId !== 'string') {
    throw new UnitAccessError('Unité introuvable.', 404)
  }

  const { data, error } = await client
    .from('organization_units')
    .select(
      'id, name, slug, unit_type, status, materialized_path, depth, parent_id, continent_code, country_code, organization_id',
    )
    .eq('id', unitId)
    .eq('organization_id', actor.organizationId)
    .maybeSingle()

  if (error) throw new UnitAccessError(error.message, 500)
  if (!data) throw new UnitAccessError('Unité introuvable.', 404)

  if (actor.isWorldScope) {
    if (opts?.write && actor.highestRole === 'world_admin') {
      // world_admin peut écrire ops unit ; branding locked géré ailleurs
    }
    return data as any
  }

  const allowed = await listAccessibleUnitIds(actor, client)
  if (!allowed.includes(unitId)) {
    throw new UnitAccessError('Unité introuvable.', 404)
  }

  if (opts?.write) {
    const canWrite = actor.memberships.some((m) => {
      if (!(ADMIN_UNIT_ROLES as readonly string[]).includes(m.unit_role)) return false
      const homePath = m.unit?.materialized_path
      if (!homePath) return m.organization_unit_id === unitId
      if (roleSeesDescendants(m.unit_role)) {
        return isPathDescendantOrSelf(homePath, data.materialized_path as string)
      }
      return m.organization_unit_id === unitId
    })
    if (!canWrite) {
      throw new UnitAccessError('Modification non autorisée sur cette unité.', 403)
    }
  }

  return data as any
}

export function canManageWorldSettings(actor: ActorUnitContext): boolean {
  return actor.memberships.some(
    (m) => m.unit_role === 'world_super_admin' || m.unit_role === 'world_admin',
  )
}

export function canUnlockBranding(actor: ActorUnitContext): boolean {
  return actor.memberships.some((m) => m.unit_role === 'world_super_admin')
}

export function canEditPastoralTemplate(actor: ActorUnitContext): boolean {
  return actor.memberships.some(
    (m) => m.unit_role === 'world_super_admin' || m.unit_role === 'world_admin',
  )
}

/** Rôles assignables par l'acteur (pas d'auto-promotion). */
export function assignableRolesFor(actor: ActorUnitContext): OrganizationUnitRole[] {
  const h = actor.highestRole
  if (h === 'world_super_admin') {
    return [
      'world_admin',
      'zone_admin',
      'national_admin',
      'local_admin',
      'staff',
      'member',
      'viewer',
    ]
  }
  if (h === 'world_admin') {
    return ['zone_admin', 'national_admin', 'local_admin', 'staff', 'member', 'viewer']
  }
  if (h === 'zone_admin') {
    return ['national_admin', 'local_admin', 'staff', 'member', 'viewer']
  }
  if (h === 'national_admin') {
    return ['local_admin', 'staff', 'member', 'viewer']
  }
  if (h === 'local_admin') {
    return ['staff', 'member', 'viewer']
  }
  return []
}

/** Compatibilité rôle ↔ type d'unité (Lot 6). */
export function roleFitsUnitType(role: OrganizationUnitRole, unitType: OrganizationUnitType): boolean {
  if (role === 'world_super_admin' || role === 'world_admin') return unitType === 'world_headquarters'
  if (role === 'zone_admin') return unitType === 'continental_zone'
  if (role === 'national_admin') return unitType === 'national_central_church'
  if (role === 'local_admin') return unitType === 'local_church'
  return role === 'staff' || role === 'member' || role === 'viewer'
}

export function canAssignRoleOnUnit(
  actor: ActorUnitContext,
  role: OrganizationUnitRole,
  unitType: OrganizationUnitType,
): boolean {
  return assignableRolesFor(actor).includes(role) && roleFitsUnitType(role, unitType)
}

/** Permissions effectives lisibles pour l’UI (dérivées du contexte acteur). */
export function effectivePermissionsSnapshot(actor: ActorUnitContext): {
  highestRole: OrganizationUnitRole | null
  isWorldScope: boolean
  homeUnitIds: string[]
  assignableRoles: OrganizationUnitRole[]
  canManageWorldSettings: boolean
  canUnlockBranding: boolean
  canEditPastoralTemplate: boolean
} {
  return {
    highestRole: actor.highestRole,
    isWorldScope: actor.isWorldScope,
    homeUnitIds: actor.homeUnitIds,
    assignableRoles: assignableRolesFor(actor),
    canManageWorldSettings: canManageWorldSettings(actor),
    canUnlockBranding: canUnlockBranding(actor),
    canEditPastoralTemplate: canEditPastoralTemplate(actor),
  }
}
