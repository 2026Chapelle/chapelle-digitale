/**
 * ERP Lot 1 — mapping pur profils Citadelle legacy → membership SaaS.
 * Hors Core (dépend de profiles.role / profiles.statut).
 * Aucune permission métier calculée.
 */

import type { OrganizationMembershipRole, OrganizationMembershipStatus } from '@/core/erp'

/** Rôles opérationnels / pastoraux prouvés dans les migrations → staff SaaS. */
const STAFF_PROFILE_ROLES = new Set([
  'formateur',
  'responsable_integration',
  'responsable_national',
  'pasteur_national',
  'pasteur',
  'nation_pastor',
  'platform_admin',
  'responsable_antenne',
  'coordinateur',
  'responsable_mahanaim',
  'intercesseur',
  'berger',
  'leader',
  'mentor',
  'missionnaire',
  'crisis_lead',
])

/**
 * profiles.role → OrganizationMembershipRole
 */
export function mapProfileRoleToMembershipRole(
  role: string | null | undefined,
): OrganizationMembershipRole {
  const r = String(role || '').trim()
  if (r === 'super_admin') return 'owner'
  if (r === 'admin') return 'admin'
  if (STAFF_PROFILE_ROLES.has(r)) return 'staff'
  return 'member'
}

/**
 * profiles.statut → OrganizationMembershipStatus
 * Inconnu / null → suspended (conservateur, jamais active implicitement).
 */
export function mapProfileStatutToMembershipStatus(
  statut: string | null | undefined,
): OrganizationMembershipStatus {
  switch (String(statut || '').trim()) {
    case 'actif':
      return 'active'
    case 'en_attente':
      return 'invited'
    case 'inactif':
    case 'suspendu':
      return 'suspended'
    default:
      return 'suspended'
  }
}

/**
 * profiles.statut → is_default
 * Seul « actif » → true.
 */
export function mapProfileStatutToIsDefault(statut: string | null | undefined): boolean {
  return String(statut || '').trim() === 'actif'
}
