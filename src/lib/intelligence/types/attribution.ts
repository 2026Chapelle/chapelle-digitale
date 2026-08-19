/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Modèle d'ATTRIBUTION (parcours d'acquisition).
 *
 * Contraintes (RGPD / minimisation) : pas de fingerprinting intrusif. On réutilise
 * la surface d'attribution SANCTIONNÉE existante : `detectSource()` de
 * src/lib/analytics-server.ts (classification UTM/referrer → canal, sans appel
 * externe). Le `session` reste opaque ; jamais de PII brute dans une touche.
 *
 * Exemple de chaîne : WhatsApp → Chapelle → Citadelle → Inscription → Live → Parcours.
 */

/**
 * Canaux d'acquisition. Aligné sur le vocabulaire de `detectSource()`
 * (analytics-server.ts) pour éviter toute divergence.
 */
export const ATTRIBUTION_SOURCES = [
  'whatsapp',
  'facebook',
  'instagram',
  'youtube',
  'google',
  'tiktok',
  'twitter',
  'telegram',
  'email',
  'referral',
  'direct',
  'other', // sink pour toute valeur UTM non reconnue par detectSource() (utm_source arbitraire)
] as const

export type AttributionSource = (typeof ATTRIBUTION_SOURCES)[number]

/** Médium marketing (UTM medium normalisé). */
export const ATTRIBUTION_MEDIUMS = [
  'social',
  'organic',
  'referral',
  'email',
  'paid',
  'direct',
  'unknown',
] as const

export type AttributionMedium = (typeof ATTRIBUTION_MEDIUMS)[number]

/**
 * Une touche d'attribution : un point de contact horodaté dans le parcours.
 * `session` est opaque (clé de session, pas d'identité). Aucune PII directe.
 */
export interface AttributionTouchpoint {
  source: AttributionSource
  medium: AttributionMedium
  campaign?: string | null
  content?: string | null // utm_content / créa
  entry_page: string // chemin d'entrée (path only)
  session: string // clé de session opaque
  occurred_at: string // ISO 8601
}

/** Types d'événements de conversion suivis par le Hub. */
export const CONVERSION_TYPES = [
  'signup',
  'live_attendance',
  'parcours_enrollment',
  'donation',
  'premium',
] as const

export type ConversionType = (typeof CONVERSION_TYPES)[number]

export interface ConversionEvent {
  type: ConversionType
  session: string // clé de session opaque
  occurred_at: string // ISO 8601
  value?: number | null // ex : montant FCFA pour donation
}

/**
 * Chaîne d'attribution consolidée pour une session : la suite ordonnée des touches
 * jusqu'à une éventuelle conversion. Modèle "first/last touch" dérivable côté service.
 */
export interface AttributionChain {
  session: string
  touchpoints: ReadonlyArray<AttributionTouchpoint>
  conversion?: ConversionEvent | null
}

export function isAttributionSource(value: unknown): value is AttributionSource {
  return typeof value === 'string' && (ATTRIBUTION_SOURCES as readonly string[]).includes(value)
}
