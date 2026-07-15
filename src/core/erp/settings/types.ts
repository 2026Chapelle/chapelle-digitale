/**
 * Core ERP — paramètres d'organisation (types futurs uniquement).
 *
 * Ne recopie pas cms_settings / giving_widget_settings.
 * Ne crée pas de page admin.
 */

import type { OrganizationId } from '../organization/types'

export interface OrganizationBrandingSettings {
  displayName: string
  logoUrl: string | null
  primaryColor: string | null
}

export interface OrganizationLocaleSettings {
  country: string | null
  defaultLocale: string
  timezone: string
  defaultCurrency: string
}

export interface OrganizationNotificationSettings {
  emailEnabled: boolean
  pushEnabled: boolean
  digestEnabled: boolean
}

/** Réglages pastoraux génériques — volontairement peu détaillés. */
export interface OrganizationPastoralSettings {
  newcomerFollowUpEnabled: boolean
  defaultIntegrationTrack: string | null
}

export interface OrganizationSettings {
  organizationId: OrganizationId
  branding: OrganizationBrandingSettings
  locale: OrganizationLocaleSettings
  notifications: OrganizationNotificationSettings
  pastoral: OrganizationPastoralSettings
  updatedAt: string
}

/** Lecture / écriture future des settings org (interface seule). */
export interface OrganizationSettingsRepository {
  get(organizationId: OrganizationId): Promise<OrganizationSettings | null>
  upsert(settings: OrganizationSettings): Promise<OrganizationSettings>
}
