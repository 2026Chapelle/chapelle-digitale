/**
 * Héritage des paramètres d'unité :
 * locale → nationale → zone → organisation mondiale.
 * Valeurs null sur l'unité courante tombent sur l'ancêtre puis l'org.
 *
 * city est structurelle (organization_units) — jamais héritée ici.
 */

export type UnitSettingsRow = {
  organization_unit_id: string
  timezone: string | null
  default_locale: string | null
  default_currency: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  local_display_name: string | null
}

export type OrgLocaleDefaults = {
  timezone: string | null
  default_locale: string | null
  default_currency: string | null
}

export type InheritField =
  | 'timezone'
  | 'default_locale'
  | 'default_currency'
  | 'contact_email'
  | 'contact_phone'
  | 'address'
  | 'local_display_name'

const INHERIT_FIELDS: readonly InheritField[] = [
  'timezone',
  'default_locale',
  'default_currency',
  'contact_email',
  'contact_phone',
  'address',
  'local_display_name',
] as const

/** Exposé pour tests : city n'est pas héritable. */
export function inheritFieldsList(): readonly InheritField[] {
  return INHERIT_FIELDS
}

/**
 * @param chainSettings settings des unités ordonnées du plus local au plus haut (local, national, zone, HQ)
 * @param orgDefaults repli organisation mondiale
 */
export function resolveInheritedUnitSettings(
  chainSettings: UnitSettingsRow[],
  orgDefaults: OrgLocaleDefaults | null,
): Record<InheritField, string | null> & { sources: Record<InheritField, string> } {
  const out: Record<InheritField, string | null> = {
    timezone: null,
    default_locale: null,
    default_currency: null,
    contact_email: null,
    contact_phone: null,
    address: null,
    local_display_name: null,
  }
  const sources: Record<InheritField, string> = {
    timezone: 'none',
    default_locale: 'none',
    default_currency: 'none',
    contact_email: 'none',
    contact_phone: 'none',
    address: 'none',
    local_display_name: 'none',
  }

  for (const field of INHERIT_FIELDS) {
    for (const row of chainSettings) {
      const v = row[field]
      if (typeof v === 'string' && v.trim()) {
        out[field] = v
        sources[field] = row.organization_unit_id
        break
      }
    }
  }

  // Repli org mondiale pour locale / timezone / currency seulement
  if (!out.timezone && orgDefaults?.timezone) {
    out.timezone = orgDefaults.timezone
    sources.timezone = 'organization'
  }
  if (!out.default_locale && orgDefaults?.default_locale) {
    out.default_locale = orgDefaults.default_locale
    sources.default_locale = 'organization'
  }
  if (!out.default_currency && orgDefaults?.default_currency) {
    out.default_currency = orgDefaults.default_currency
    sources.default_currency = 'organization'
  }

  return { ...out, sources }
}

/**
 * Construit la chaîne d'IDs ancêtres à partir du materialized_path :
 * /hq/af/ci/local/ → [local, ci, af, hq] (local first).
 */
export function ancestorUnitIdsFromPath(materializedPath: string, unitId: string): string[] {
  const parts = materializedPath
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
  if (!parts.includes(unitId)) {
    return [unitId]
  }
  // reverse: local → ... → world
  return [...parts].reverse()
}
