/**
 * CITADELLE INTELLIGENCE HUB — HUB-3 (Campagnes & UTM durables)
 * Normalisation PURE des parametres UTM. Reutilisee a l'ingestion (ecriture
 * first-touch) ET a la lecture. Aucune I/O.
 *
 * Regles (audit) : trim -> vide=null -> strip controle/HTML -> scrub PII
 * (email + numero de telephone brut) -> casing -> borne de longueur -> re-vide=null.
 * Les campagnes datees type `culte_20260823` (lettres + chiffres) sont PRESERVEES ;
 * seuls les tokens 100% numeriques longueur 7-15 (telephone) sont ecartes.
 */

import { ATTRIBUTION_MEDIUMS, type AttributionMedium } from '../types/attribution'

export interface UtmNormalizeOptions {
  max: number
  lowercase: boolean
}

const ANGLE_BRACKETS = /[<>]/g
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/
const PHONE_SEPARATORS = /[\s+()\-.]/g

/** Retire les caracteres de controle C0/C1 (un token UTM doit rester imprimable). */
function stripControlChars(v: string): string {
  let out = ''
  for (const ch of v) {
    const c = ch.codePointAt(0) ?? 0
    if ((c >= 0x00 && c <= 0x1f) || (c >= 0x7f && c <= 0x9f)) continue
    out += ch
  }
  return out
}

/** true si la valeur ressemble a une donnee personnelle (email ou telephone brut). */
function looksLikePii(v: string): boolean {
  if (EMAIL_RE.test(v)) return true
  const digitsOnly = v.replace(PHONE_SEPARATORS, '')
  // Numero brut = 7 a 15 chiffres SANS lettre (preserve 'culte_20260823').
  return /^\d{7,15}$/.test(digitsOnly)
}

/** Normalise une valeur UTM brute. Renvoie une chaine bornee & sure, ou null. */
export function normalizeUtmValue(
  raw: unknown,
  opts: UtmNormalizeOptions,
): string | null {
  if (typeof raw !== 'string') return null
  let v = raw.trim()
  if (!v) return null
  v = stripControlChars(v).replace(ANGLE_BRACKETS, '').trim()
  if (!v) return null
  if (looksLikePii(v)) return null // ne JAMAIS persister de PII
  if (opts.lowercase) v = v.toLowerCase()
  v = v.slice(0, opts.max).trim()
  return v || null
}

// Longueurs alignees sur les caps existants (detectSource slice 32 ; str category 64).
export const normalizeUtmSource = (raw: unknown) => normalizeUtmValue(raw, { max: 32, lowercase: true })
export const normalizeUtmMedium = (raw: unknown) => normalizeUtmValue(raw, { max: 32, lowercase: true })
export const normalizeUtmCampaign = (raw: unknown) => normalizeUtmValue(raw, { max: 64, lowercase: true })
export const normalizeUtmContent = (raw: unknown) => normalizeUtmValue(raw, { max: 64, lowercase: false }) // crea : casse significative
export const normalizeUtmTerm = (raw: unknown) => normalizeUtmValue(raw, { max: 64, lowercase: true })

/** Normalise les 5 champs UTM d'un corps de requete (ingestion first-touch). */
export interface NormalizedUtm {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
}
export function normalizeUtmBundle(utm: Record<string, unknown> | null | undefined): NormalizedUtm {
  const u = utm ?? {}
  return {
    source: normalizeUtmSource(u.source),
    medium: normalizeUtmMedium(u.medium),
    campaign: normalizeUtmCampaign(u.campaign),
    content: normalizeUtmContent(u.content),
    term: normalizeUtmTerm(u.term),
  }
}

/**
 * Classe un `utm_medium` brut vers l'ensemble ferme AttributionMedium. Le brut reste
 * stocke ; ceci est une DERIVATION de lecture (defaut sur 'unknown').
 */
export function deriveMedium(rawMedium: string | null | undefined): AttributionMedium {
  const m = (rawMedium ?? '').trim().toLowerCase()
  if (!m) return 'unknown'
  if (['cpc', 'ppc', 'paid', 'paidsearch', 'display', 'banner', 'ads', 'ad'].includes(m)) return 'paid'
  if (['social', 'channel', 'video', 'reel', 'story', 'post'].includes(m)) return 'social'
  if (['organic', 'seo', 'search'].includes(m)) return 'organic'
  if (['email', 'newsletter', 'mail', 'e-mail'].includes(m)) return 'email'
  if (['referral', 'ref', 'qr', 'link'].includes(m)) return 'referral'
  if (['direct', 'none'].includes(m)) return 'direct'
  // valeur presente mais non classee -> sink documente
  return (ATTRIBUTION_MEDIUMS as readonly string[]).includes(m) ? (m as AttributionMedium) : 'unknown'
}
