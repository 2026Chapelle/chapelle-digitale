/**
 * Core ERP Citadelle — point d'entrée public.
 *
 * Contrats TypeScript purs pour la fondation multi-tenant SaaS.
 * Non branché au runtime (routes, middleware, UI).
 *
 * @example
 * import type {
 *   Organization,
 *   OrganizationMembership,
 *   ActiveOrganizationContext,
 *   OrganizationContext,
 *   CurrentOrganizationProvider,
 * } from '@/core/erp'
 */

// Organization (Lot 0.5)
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
  resolveActiveOrganizationFromData,
  createActiveOrganizationResolver,
} from './organization'

export type {
  ResolveActiveOrganizationData,
  ActiveOrganizationDataLoader,
} from './organization'

// Permissions ERP — contrats uniquement (Lot 0.5), pas d'évaluateur
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

// Context (Lot 0.6-A) — enrichit ActiveOrganizationContext
export type {
  OrganizationContext,
  OrganizationContextBuildInput,
  OrganizationContextBuildResult,
  CurrentOrganizationProvider,
} from './context'

export { buildOrganizationContext } from './context'

// Units (Lot 5)
export type {
  OrganizationUnitId,
  OrganizationUnitType,
  OrganizationUnitStatus,
  OrganizationUnitRole,
  OrganizationUnit,
  OrganizationUnitMembership,
  OrganizationUnitSettings,
} from './unit'

export {
  ORGANIZATION_UNIT_TYPES,
  ORGANIZATION_UNIT_ROLES,
  WORLD_ROLES,
  ADMIN_UNIT_ROLES,
  isOrganizationUnitType,
  isOrganizationUnitRole,
  isWorldUnitRole,
  roleSeesDescendants,
  expectedChildType,
  expectedDepth,
  isPathDescendantOrSelf,
} from './unit'
