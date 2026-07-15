/**
 * Core ERP Citadelle — point d'entrée public.
 *
 * Contrats TypeScript purs pour la fondation multi-tenant SaaS.
 * Non branché au runtime (routes, middleware, UI) dans le Lot 0.5.
 *
 * @example
 * import type { Organization, OrganizationMembership, ActiveOrganizationContext } from '@/core/erp'
 */

// Organization
export type {
  OrganizationId,
  ErpUserId,
  OrganizationStatus,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  Organization,
  OrganizationMembership,
  ActiveOrganizationSource,
  ActiveOrganizationContext,
  ActiveOrganizationResolutionInput,
  OrganizationRepository,
  OrganizationMembershipRepository,
  ActiveOrganizationResolver,
} from './organization'

export {
  ORGANIZATION_STATUSES,
  ORGANIZATION_MEMBERSHIP_ROLES,
  ORGANIZATION_MEMBERSHIP_STATUSES,
  CHAPELLE_ORGANIZATION_SLUG,
  isOrganizationStatus,
  isOrganizationMembershipRole,
  isOrganizationMembershipStatus,
  isActiveOrganizationMembership,
} from './organization'

// Permissions ERP (pont futur — ne remplace pas @/lib/permissions)
export type {
  ErpPermissionKey,
  PermissionDecisionSource,
  OrganizationPermissionContext,
  PermissionDecision,
  OrganizationPermissionEvaluator,
} from './permissions'

// Audit
export type {
  AuditActorType,
  AuditAction,
  AuditEntityType,
  AuditActor,
  AuditEntry,
  AuditWriter,
} from './audit'

// Settings
export type {
  OrganizationBrandingSettings,
  OrganizationLocaleSettings,
  OrganizationNotificationSettings,
  OrganizationPastoralSettings,
  OrganizationSettings,
  OrganizationSettingsRepository,
} from './settings'
