/**
 * Core ERP — contrats de permissions multi-tenant (non branchés).
 *
 * Ne remplace PAS src/lib/permissions.ts (RBAC produit / profiles.role).
 * Sert de pont futur entre membership SaaS et le RBAC existant.
 */

import type { OrganizationId, OrganizationMembershipRole, ErpUserId } from '../organization/types'

/**
 * Clés de permission ERP futures (périmètre organisation / gouvernance SaaS).
 * Volontairement minimal — pas de matrice complète dans le Lot 0.5.
 */
export type ErpPermissionKey =
  | 'erp.org.read'
  | 'erp.org.update'
  | 'erp.memberships.read'
  | 'erp.memberships.manage'
  | 'erp.settings.read'
  | 'erp.settings.update'
  | 'erp.audit.read'

export type PermissionDecisionSource =
  | 'organization_membership'
  | 'existing_rbac'
  | 'platform_override'
  | 'denied'

export interface OrganizationPermissionContext {
  userId: ErpUserId
  organizationId: OrganizationId
  membershipRole: OrganizationMembershipRole | null
  /** profiles.role existant — informatif, source RBAC produit. */
  existingProfileRole?: string | null
  /** profiles.membre_statut existant — axe spirituel, jamais admin SaaS. */
  existingMemberStatus?: string | null
}

export interface PermissionDecision {
  allowed: boolean
  reason: string
  source: PermissionDecisionSource
}

/** Évaluateur futur : pas d'implémentation dans ce lot. */
export interface OrganizationPermissionEvaluator {
  evaluate(ctx: OrganizationPermissionContext, permission: ErpPermissionKey): PermissionDecision
}
