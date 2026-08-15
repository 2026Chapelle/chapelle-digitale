/**
 * ERP Lot 1 — infrastructure (session Supabase, mappers legacy).
 * Le Core reste sans import Supabase.
 */

export {
  mapOrganizationRow,
  mapOrganizationMembershipRow,
  type OrganizationSqlRow,
  type OrganizationMembershipSqlRow,
} from './organization-mapper'

export {
  mapProfileRoleToMembershipRole,
  mapProfileStatutToMembershipStatus,
  mapProfileStatutToIsDefault,
} from './map-profile-to-membership'

export { createOrganizationRepository } from './organization-repository'
export { createOrganizationMembershipRepository } from './organization-membership-repository'
export { createSessionActiveOrganizationResolver } from './active-organization-resolver'

export {
  ErpAuthError,
  ErpDataError,
  type ErpSessionClient,
} from './auth-client'

export {
  resolveAdminActorProfile,
  resolveActorUnitContext,
  listAccessibleUnitIds,
  assertUnitAccess,
  canManageWorldSettings,
  canUnlockBranding,
  canEditPastoralTemplate,
  assignableRolesFor,
  roleFitsUnitType,
  canAssignRoleOnUnit,
  effectivePermissionsSnapshot,
  UnitAccessError,
  type ActorUnitContext,
} from './unit-access'

export {
  requireGuardedAdminUnit,
  mapUnitGuardError,
} from './admin-unit-guard'

export {
  resolveInheritedUnitSettings,
  ancestorUnitIdsFromPath,
  inheritFieldsList,
  type UnitSettingsRow,
  type OrgLocaleDefaults,
  type InheritField,
} from './unit-settings-inheritance'

export {
  ROLE_RANK,
  INVITABLE_ROLES,
  INVITATION_TTL_MS,
  roleRank,
  roleFitsUnitType as governanceRoleFitsUnitType,
  isInvitableRole,
  canAssignRole,
  canManageSubjectRole,
  isSensitiveAdminRole,
  isSelfPromotion,
  isSelfSensitiveDemotion,
  normalizeEmail,
  isUuid,
} from './unit-governance-rules'

export {
  hashInviteToken,
  generateInviteToken,
  rpcNominate,
  rpcSetStatus,
  rpcChangeRole,
  rpcTransfer,
  rpcAcceptInvitation,
  rpcCreateInvitation,
  rpcRevokeInvitation,
} from './unit-governance-rpc'

export {
  listMembershipsForUnit,
  getMembershipById,
  listGovernanceEvents,
  createInvitation,
  revokeInvitation,
  listInvitationsForUnit,
  getInvitationByTokenHash,
  getUnitPublicLabel,
  countActiveWorldSuperAdmins,
} from './unit-governance-repository'
