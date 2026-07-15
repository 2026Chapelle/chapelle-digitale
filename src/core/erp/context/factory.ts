/**
 * Core ERP — factory pure d'OrganizationContext (Lot 0.6-A).
 *
 * Valide les invariants d'activation. Ne calcule aucun droit selon membershipRole.
 */

import { isActiveOrganizationMembership } from '../organization/constants'
import type { OrganizationContextBuildInput, OrganizationContextBuildResult } from './types'

/**
 * Construit un OrganizationContext si les invariants minimaux sont respectés.
 * Pure : aucun I/O, aucun calcul de permissions.
 */
export function buildOrganizationContext(
  input: OrganizationContextBuildInput,
): OrganizationContextBuildResult {
  const { organization, membership, source, resolvedAt, permissions, settings } = input

  if (!resolvedAt || typeof resolvedAt !== 'string' || resolvedAt.trim() === '') {
    return { ok: false, reason: 'resolved_at_required' }
  }

  if (organization.status !== 'active') {
    return { ok: false, reason: 'organization_not_active' }
  }

  if (!isActiveOrganizationMembership(membership)) {
    return { ok: false, reason: 'membership_not_active' }
  }

  if (membership.organizationId !== organization.id) {
    return { ok: false, reason: 'membership_organization_mismatch' }
  }

  if (settings.organizationId !== organization.id) {
    return { ok: false, reason: 'settings_organization_mismatch' }
  }

  // Copie défensive : l'appelant ne peut pas muter le snapshot via le tableau d'entrée
  const permissionsSnapshot = Object.freeze([...permissions])

  return {
    ok: true,
    context: {
      organization,
      membership,
      source,
      resolvedAt,
      permissions: permissionsSnapshot,
      settings,
    },
  }
}
