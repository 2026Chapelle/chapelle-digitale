/**
 * Core ERP — constantes et garde-fous purs (organization).
 */

import type {
  OrganizationMembership,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  OrganizationStatus,
} from './types'

export const ORGANIZATION_STATUSES = ['active', 'suspended', 'archived'] as const satisfies readonly OrganizationStatus[]

export const ORGANIZATION_MEMBERSHIP_ROLES = [
  'owner',
  'admin',
  'staff',
  'member',
] as const satisfies readonly OrganizationMembershipRole[]

export const ORGANIZATION_MEMBERSHIP_STATUSES = [
  'invited',
  'active',
  'suspended',
  'removed',
] as const satisfies readonly OrganizationMembershipStatus[]

/** Slug de l'organisation initiale Chapelle (seed Lot 1 futur — référence pure). */
export const CHAPELLE_ORGANIZATION_SLUG = 'chapelle-du-royaume' as const

export function isOrganizationStatus(value: unknown): value is OrganizationStatus {
  return typeof value === 'string' && (ORGANIZATION_STATUSES as readonly string[]).includes(value)
}

export function isOrganizationMembershipRole(value: unknown): value is OrganizationMembershipRole {
  return typeof value === 'string' && (ORGANIZATION_MEMBERSHIP_ROLES as readonly string[]).includes(value)
}

export function isOrganizationMembershipStatus(value: unknown): value is OrganizationMembershipStatus {
  return typeof value === 'string' && (ORGANIZATION_MEMBERSHIP_STATUSES as readonly string[]).includes(value)
}

/**
 * Membership « actif » au sens SaaS : status active uniquement.
 * Ne regarde pas profiles.role ni membre_statut.
 */
export function isActiveOrganizationMembership(
  membership: Pick<OrganizationMembership, 'status'> | null | undefined,
): boolean {
  return !!membership && membership.status === 'active'
}
