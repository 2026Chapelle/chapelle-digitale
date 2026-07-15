/**
 * Core ERP — types organisation (purs, sans I/O).
 *
 * Organization = tenant SaaS (Église / ministère client).
 * Ne remplace ni nation, ni antenne, ni plateforme, ni groupe/cellule.
 */

/** Identifiant opaque d'organisation (UUID string en pratique). */
export type OrganizationId = string

/** Identifiant utilisateur (aligné profiles.id / auth.users). */
export type ErpUserId = string

export type OrganizationStatus = 'active' | 'suspended' | 'archived'

export type OrganizationMembershipRole = 'owner' | 'admin' | 'staff' | 'member'

export type OrganizationMembershipStatus = 'invited' | 'active' | 'suspended' | 'removed'

/**
 * Entité cliente SaaS. Les dates sont des chaînes ISO 8601
 * (convention dépôt : profiles.date_inscription, timestamps JSON).
 */
export interface Organization {
  id: OrganizationId
  name: string
  slug: string
  status: OrganizationStatus
  country: string | null
  timezone: string
  defaultLocale: string
  defaultCurrency: string
  logoUrl: string | null
  createdBy: ErpUserId | null
  createdAt: string
  updatedAt: string
}

/**
 * Adhésion d'un utilisateur à une organisation.
 * `membershipRole` ≠ `profiles.role` ≠ `profiles.membre_statut`.
 */
export interface OrganizationMembership {
  id: string
  organizationId: OrganizationId
  userId: ErpUserId
  membershipRole: OrganizationMembershipRole
  status: OrganizationMembershipStatus
  isDefault: boolean
  joinedAt: string
  createdAt: string
  updatedAt: string
}

/**
 * Comment l'organisation active a été résolue.
 * Aucune implémentation runtime dans le Lot 0.5.
 */
export type ActiveOrganizationSource =
  | 'default_membership'
  | 'validated_cookie'
  | 'explicit_slug'
  | 'platform_override'

/** Contexte d'organisation active (contrat pour résolveurs futurs). */
export interface ActiveOrganizationContext {
  organization: Organization
  membership: OrganizationMembership
  source: ActiveOrganizationSource
  resolvedAt: string
}

/** Entrée minimale pour un futur ActiveOrganizationResolver. */
export interface ActiveOrganizationResolutionInput {
  userId: ErpUserId | null
  requestedOrganizationId?: OrganizationId | null
  requestedSlug?: string | null
  cookieOrganizationId?: OrganizationId | null
  platformOverrideOrganizationId?: OrganizationId | null
}
