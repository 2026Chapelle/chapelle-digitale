/**
 * Core ERP — OrganizationContext (Lot 0.6-A).
 *
 * Enrichit ActiveOrganizationContext (Lot 0.5) sans le remplacer.
 * Aucun secret, token, cookie, session brute ou client réseau.
 */

import type { ActiveOrganizationContext } from '../organization/types'
import type { ErpPermissionKey } from '../permissions/types'
import type { OrganizationSettings } from '../settings/types'

/**
 * Contexte organisationnel applicatif.
 * Réutilise intégralement ActiveOrganizationContext (org, membership, source, resolvedAt)
 * et ajoute uniquement un snapshot de permissions + settings fournis par l'appelant.
 *
 * Les permissions ne sont PAS calculées selon membershipRole.
 */
export interface OrganizationContext extends ActiveOrganizationContext {
  permissions: readonly ErpPermissionKey[]
  settings: OrganizationSettings
}

/** Entrée de construction — permissions fournies explicitement (déjà résolues ailleurs). */
export interface OrganizationContextBuildInput {
  organization: ActiveOrganizationContext['organization']
  membership: ActiveOrganizationContext['membership']
  source: ActiveOrganizationContext['source']
  resolvedAt: string
  permissions: readonly ErpPermissionKey[]
  settings: OrganizationSettings
}

/** Codes d'échec fermés de la factory (pas de string libre). */
export type OrganizationContextBuildFailureReason =
  | 'resolved_at_required'
  | 'organization_not_active'
  | 'membership_not_active'
  | 'membership_organization_mismatch'
  | 'settings_organization_mismatch'

export type OrganizationContextBuildResult =
  | { ok: true; context: OrganizationContext }
  | { ok: false; reason: OrganizationContextBuildFailureReason }
