/**
 * Core ERP Lot 5 — types unités hiérarchiques (purs).
 *
 * OrganizationUnit = structure uniquement.
 * Paramètres opérationnels (timezone, locale, currency, contact, address)
 * → OrganizationUnitSettings (SSOT).
 */

import type { OrganizationId, ErpUserId } from '../organization/types'

export type OrganizationUnitId = string

export type OrganizationUnitType =
  | 'world_headquarters'
  | 'continental_zone'
  | 'national_central_church'
  | 'local_church'

export type OrganizationUnitStatus = 'active' | 'suspended' | 'archived'

export type OrganizationUnitRole =
  | 'world_super_admin'
  | 'world_admin'
  | 'zone_admin'
  | 'national_admin'
  | 'local_admin'
  | 'staff'
  | 'member'
  | 'viewer'

/** Unité structurelle — pas de timezone/locale/currency/contact/address. */
export interface OrganizationUnit {
  id: OrganizationUnitId
  organizationId: OrganizationId
  parentId: OrganizationUnitId | null
  unitType: OrganizationUnitType
  name: string
  slug: string
  status: OrganizationUnitStatus
  continentCode: string | null
  countryCode: string | null
  city: string | null
  materializedPath: string
  depth: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationUnitMembership {
  id: string
  organizationId: OrganizationId
  organizationUnitId: OrganizationUnitId
  userId: ErpUserId
  unitRole: OrganizationUnitRole
  status: 'invited' | 'active' | 'suspended' | 'removed'
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

/** Paramètres opérationnels d'une unité (SSOT). */
export interface OrganizationUnitSettings {
  organizationUnitId: OrganizationUnitId
  organizationId: OrganizationId
  localDisplayName: string | null
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  timezone: string | null
  defaultLocale: string | null
  defaultCurrency: string | null
  notifEmailEnabled: boolean
  notifPushEnabled: boolean
  notifDigestEnabled: boolean
  notifNewcomerAlert: boolean
  notifFollowupAlert: boolean
  notifNewMemberAlert: boolean
  notifEscalateNational: boolean
  notifEscalateZone: boolean
  updatedAt: string
}

export type { OrganizationId, ErpUserId }
