/**
 * Core ERP — contrat d'audit unifié (futur).
 *
 * Ne modifie ni activity_logs ni sensitive_access_logs.
 * Journal conceptuel pour gouvernance multi-org (Lot ultérieur).
 */

import type { ErpUserId, OrganizationId } from '../organization/types'

export type AuditActorType = 'user' | 'service' | 'system' | 'platform_admin'

/** Actions d'audit génériques (extensibles plus tard). */
export type AuditAction =
  | 'organization.create'
  | 'organization.update'
  | 'organization.suspend'
  | 'membership.invite'
  | 'membership.activate'
  | 'membership.suspend'
  | 'membership.role_change'
  | 'membership.remove'
  | 'settings.update'
  | 'audit.export'
  | string

export type AuditEntityType =
  | 'organization'
  | 'organization_membership'
  | 'organization_settings'
  | 'profile'
  | 'system'
  | string

export interface AuditActor {
  userId: ErpUserId | null
  organizationId: OrganizationId | null
  actorType: AuditActorType
}

export interface AuditEntry {
  id: string
  organizationId: OrganizationId | null
  actor: AuditActor
  action: AuditAction
  entityType: AuditEntityType
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

/** Écriture future d'entrées d'audit (pas de persistance Lot 0.5). */
export interface AuditWriter {
  write(entry: Omit<AuditEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<void>
}
