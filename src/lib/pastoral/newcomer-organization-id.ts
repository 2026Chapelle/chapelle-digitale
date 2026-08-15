/**
 * Lot 2-A — validateur d'organizationId pour le domaine newcomer_intakes.
 *
 * Type nominal (brand) pour empêcher de passer une chaîne vide / non string
 * comme scope tenant. Aucun I/O. Aucune fusion avec membership_role / profiles.role.
 */

import type { OrganizationId } from '@/core/erp'

/** OrganizationId garanti non vide (scope tenant obligatoire). */
export type ScopedOrganizationId = OrganizationId & {
  readonly __brand: 'ScopedOrganizationId'
}

export class OrganizationIdError extends Error {
  readonly code = 'organization_id_required' as const
  constructor(message = 'organizationId requis et non vide.') {
    super(message)
    this.name = 'OrganizationIdError'
  }
}

/**
 * Refuse null / undefined / non-string / blanc.
 * Ne valide pas le format UUID (la FK SQL reste la source d'autorité).
 */
export function requireOrganizationId(value: unknown): ScopedOrganizationId {
  if (typeof value !== 'string') {
    throw new OrganizationIdError('organizationId requis et non vide.')
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new OrganizationIdError('organizationId requis et non vide.')
  }
  return trimmed as ScopedOrganizationId
}

/** Retire toute clé organization_id / organization_unit_id d'un payload entrant (client non autorité). */
export function stripClientOrganizationId<T extends Record<string, unknown>>(
  payload: T,
): Omit<T, 'organization_id' | 'organizationId' | 'organization_unit_id' | 'organizationUnitId'> {
  const {
    organization_id: _snake,
    organizationId: _camel,
    organization_unit_id: _unitSnake,
    organizationUnitId: _unitCamel,
    ...rest
  } = payload as T & {
    organization_id?: unknown
    organizationId?: unknown
    organization_unit_id?: unknown
    organizationUnitId?: unknown
  }
  return rest
}
