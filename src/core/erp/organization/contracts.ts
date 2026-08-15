/**
 * Core ERP — contrats de services organisation (interfaces uniquement).
 * Aucune implémentation Supabase / I/O dans le Lot 0.5.
 */

import type {
  ActiveOrganizationContext,
  ActiveOrganizationResolutionInput,
  ErpUserId,
  Organization,
  OrganizationId,
  OrganizationMembership,
} from './types'

/** Persistance future des organisations. */
export interface OrganizationRepository {
  findById(id: OrganizationId): Promise<Organization | null>
  findBySlug(slug: string): Promise<Organization | null>
  listForUser(userId: ErpUserId): Promise<Organization[]>
  findDefaultForUser(userId: ErpUserId): Promise<Organization | null>
}

/** Persistance future des adhésions organisation. */
export interface OrganizationMembershipRepository {
  findMembership(
    organizationId: OrganizationId,
    userId: ErpUserId,
  ): Promise<OrganizationMembership | null>
  listByOrganization(organizationId: OrganizationId): Promise<OrganizationMembership[]>
  listByUser(userId: ErpUserId): Promise<OrganizationMembership[]>
  hasActiveMembership(organizationId: OrganizationId, userId: ErpUserId): Promise<boolean>
}

/** Résolution future de l'organisation active (cookie / slug / default). */
export interface ActiveOrganizationResolver {
  resolve(input: ActiveOrganizationResolutionInput): Promise<ActiveOrganizationContext | null>
}
