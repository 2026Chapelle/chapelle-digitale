/**
 * ERP Lot 1 — mapping pur SQL (snake_case) → contrats Core (camelCase).
 * Aucune requête, aucun client Supabase.
 */

import type {
  Organization,
  OrganizationId,
  OrganizationMembership,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  OrganizationStatus,
  ErpUserId,
} from '@/core/erp'
import {
  isOrganizationMembershipRole,
  isOrganizationMembershipStatus,
  isOrganizationStatus,
} from '@/core/erp'

/** Ligne SQL attendue pour public.organizations (lecture). */
export interface OrganizationSqlRow {
  id: string
  name: string
  slug: string
  status: string
  country: string | null
  timezone: string
  default_locale: string
  default_currency: string
  logo_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Ligne SQL attendue pour public.organization_members (lecture). */
export interface OrganizationMembershipSqlRow {
  id: string
  organization_id: string
  user_id: string
  membership_role: string
  status: string
  is_default: boolean
  joined_at: string
  created_at: string
  updated_at: string
}

function asIsoTimestamp(value: string): string {
  // Postgres/Supabase renvoie souvent déjà un ISO ; conserver tel quel si non vide.
  return value
}

export function mapOrganizationRow(row: OrganizationSqlRow): Organization | null {
  if (!row.id || !row.name || !row.slug) return null
  if (!isOrganizationStatus(row.status)) return null
  return {
    id: row.id as OrganizationId,
    name: row.name,
    slug: row.slug,
    status: row.status as OrganizationStatus,
    country: row.country,
    timezone: row.timezone,
    defaultLocale: row.default_locale,
    defaultCurrency: row.default_currency,
    logoUrl: row.logo_url,
    createdBy: (row.created_by as ErpUserId | null) ?? null,
    createdAt: asIsoTimestamp(row.created_at),
    updatedAt: asIsoTimestamp(row.updated_at),
  }
}

export function mapOrganizationMembershipRow(
  row: OrganizationMembershipSqlRow,
): OrganizationMembership | null {
  if (!row.id || !row.organization_id || !row.user_id) return null
  if (!isOrganizationMembershipRole(row.membership_role)) return null
  if (!isOrganizationMembershipStatus(row.status)) return null
  return {
    id: row.id,
    organizationId: row.organization_id as OrganizationId,
    userId: row.user_id as ErpUserId,
    membershipRole: row.membership_role as OrganizationMembershipRole,
    status: row.status as OrganizationMembershipStatus,
    isDefault: !!row.is_default,
    joinedAt: asIsoTimestamp(row.joined_at),
    createdAt: asIsoTimestamp(row.created_at),
    updatedAt: asIsoTimestamp(row.updated_at),
  }
}
