/**
 * CITADELLE INTELLIGENCE HUB — HUB-2 (First-party attribution)
 * Normalisation PURE de la source d'acquisition (grain = session, first-touch).
 *
 * Pourquoi une normalisation à la LECTURE : `analytics_sessions.source` est figé à
 * l'insertion (first-touch), mais detectSource() ne sait pas produire :
 *  - 'internal' (une nav interne Citadelle rouvre une session referrer=citadelle → 'referral') ;
 *  - 'chapelle' (referrer chapelleduroyaume.org → 'referral') ;
 *  - il replie tous les moteurs de recherche dans 'google', et laisse fuir des
 *    valeurs utm_source arbitraires (slice 32).
 * On raffine donc via l'hôte du `referrer` stocké, sans jamais deviner une source
 * non prouvée. Priorité UTM-first respectée : un canal spécifique déjà déterminé
 * (whatsapp/facebook/…) n'est PAS réécrit par l'hôte.
 */

import { isAttributionSource, type AttributionSource } from '../types/attribution'

/** Source normalisée = canal d'acquisition, plus deux buckets techniques. */
export type NormalizedSource = AttributionSource | 'internal' | 'unknown'

/** Canaux "spécifiques" : s'ils sont déjà déterminés, l'hôte ne les réécrit pas. */
const SPECIFIC_CHANNELS: ReadonlySet<string> = new Set([
  'whatsapp',
  'facebook',
  'instagram',
  'youtube',
  'google',
  'tiktok',
  'twitter',
  'telegram',
  'email',
])

export interface NormalizeOptions {
  /** Hôtes considérés comme INTERNES (Citadelle elle-même) ⇒ 'internal', exclu de l'attribution. */
  internalHosts?: ReadonlyArray<string>
  /** Domaine du site frère Chapelle ⇒ 'chapelle'. */
  chapelleDomain?: string
}

const DEFAULT_INTERNAL_HOSTS = ['citadelle.chapelleduroyaume.org', 'localhost', '127.0.0.1']
const DEFAULT_CHAPELLE_DOMAIN = 'chapelleduroyaume.org'

/** Extrait l'hôte (minuscule) d'une URL/referrer. '' si vide/illisible. */
export function parseHost(referrer: string | null | undefined): string {
  const r = (referrer ?? '').trim()
  if (!r) return ''
  try {
    return new URL(r).hostname.toLowerCase()
  } catch {
    // referrer parfois déjà réduit à un hôte, ou malformé
    const m = r.toLowerCase().match(/^([a-z0-9.-]+\.[a-z]{2,})/)
    return m ? m[1] : ''
  }
}

/**
 * Normalise (storedSource, referrer) → NormalizedSource. PURE.
 * - canal spécifique déjà déterminé (UTM-first) → conservé ;
 * - referral/direct de faible signal → raffiné via l'hôte : interne→'internal', chapelle→'chapelle' ;
 * - source vide/nulle → 'unknown' (JAMAIS 'direct') ;
 * - valeur utm arbitraire hors référentiel → 'other'.
 */
export function normalizeAcquisitionSource(
  storedSource: string | null | undefined,
  referrer: string | null | undefined,
  opts: NormalizeOptions = {},
): NormalizedSource {
  const internalHosts = opts.internalHosts ?? DEFAULT_INTERNAL_HOSTS
  const chapelleDomain = opts.chapelleDomain ?? DEFAULT_CHAPELLE_DOMAIN
  const s = (storedSource ?? '').trim().toLowerCase()
  const host = parseHost(referrer)

  // 1) UTM-first : un canal spécifique déjà déterminé gagne, l'hôte ne le réécrit pas.
  if (SPECIFIC_CHANNELS.has(s)) return s as NormalizedSource

  // 2) Raffinage par hôte pour les buckets de faible signal (referral / direct / chapelle stocké).
  if (host) {
    if (internalHosts.includes(host)) return 'internal'
    if (host === chapelleDomain || host.endsWith('.' + chapelleDomain)) return 'chapelle'
  }

  // 3) Buckets restants.
  if (s === 'referral') return 'referral'
  if (s === 'direct') return 'direct'
  if (s === 'chapelle') return 'chapelle'
  if (!s) return 'unknown'
  if (isAttributionSource(s)) return s
  return 'other'
}

