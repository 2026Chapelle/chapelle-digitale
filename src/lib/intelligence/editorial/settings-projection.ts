import type { EditorialCapacity, EditorialSettings } from './contracts'

export interface EditorialSettingsProjection {
  organizationId: string | null
  timezone: string
  refreshMode: 'manual' | 'daily'
  refreshTimeLocal: string | null
  manualRefreshEnabled: boolean
  weeklyCapacity: EditorialCapacity
}

const EMPTY_CAPACITY: EditorialCapacity = {
  weeklyTotal: 0,
  family: {},
  channel: {},
  contentKind: {},
}

export function buildEditorialSettingsProjection(
  settings: EditorialSettings | null,
): EditorialSettingsProjection {
  if (!settings) {
    return {
      organizationId: null,
      timezone: 'UTC',
      refreshMode: 'manual',
      refreshTimeLocal: null,
      manualRefreshEnabled: true,
      weeklyCapacity: EMPTY_CAPACITY,
    }
  }

  return {
    organizationId: settings.organizationId,
    timezone: settings.timezone,
    refreshMode: settings.refreshMode,
    refreshTimeLocal: settings.refreshTimeLocal,
    manualRefreshEnabled: settings.manualRefreshEnabled,
    weeklyCapacity: settings.weeklyCapacity,
  }
}

