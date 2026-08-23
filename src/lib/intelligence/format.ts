/**
 * CITADELLE INTELLIGENCE — 5A · Formatage GELÉ (signatures) des métriques.
 *
 * Point UNIQUE de vérité pour l'affichage d'une métrique : un nombre (0 réel inclus)
 * ne s'affiche QUE si availability==='real' ; toute autre disponibilité
 * ('no_data' | 'unavailable' | 'not_applicable' | 'demo') → NO_VALUE_PLACEHOLDER
 * (« — »), jamais un 0 trompeur. Les signatures exportées sont stables : les onglets
 * (SEO inclus) les importent tels quels.
 */

import { MetricAvailability, NO_VALUE_PLACEHOLDER, rendersRealNumber } from './availability'

export type MetricUnitFmt = 'count' | 'percent01' | 'position' | 'seconds' | 'minutes' | 'currency_xof'

/** Groupement FR. */
const NF_FR = new Intl.NumberFormat('fr-FR')

/**
 * Normalise le séparateur de milliers en espace ordinaire.
 * Selon la version d'ICU, fr-FR utilise U+202F (espace fine insécable) ou U+00A0 ;
 * on les ramène à un espace normal pour un rendu déterministe et portable.
 */
function normalizeSpaces(s: string): string {
  return s.replace(/[  ]/g, ' ')
}

/** Compteur entier avec groupement FR : 1234 → « 1 234 » ; 0 → « 0 ». */
export function count(value: number): string {
  return normalizeSpaces(NF_FR.format(Math.round(value)))
}

/** Ratio 0..1 → pourcentage FR à 2 décimales : 0.1234 → « 12.34 % » ; 0 → « 0.00 % ». */
export function percent01(value: number): string {
  return `${(value * 100).toFixed(2)} %`
}

/** Position (ex. SEO) à une décimale : 3.2 → « 3.2 ». */
export function position(value: number): string {
  return value.toFixed(1)
}

/** Montant en francs CFA (XOF) : 1234 → « 1 234 FCFA » (jamais de centimes). */
export function currency_xof(value: number): string {
  return `${normalizeSpaces(NF_FR.format(Math.round(value)))} FCFA`
}

/** Secondes → « m:ss » : 83 → « 1:23 ». */
export function seconds(value: number): string {
  const s = Math.max(0, Math.round(value))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Minutes → « 12 h 34 min » / « 34 min ». */
export function minutes(value: number): string {
  const total = Math.max(0, Math.round(value))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${normalizeSpaces(NF_FR.format(h))} h ${m} min` : `${m} min`
}

/** Applique le formatage d'unité à une valeur RÉELLE déjà validée (0 inclus). */
function formatReal(value: number, unit: MetricUnitFmt): string {
  switch (unit) {
    case 'percent01':
      return percent01(value)
    case 'position':
      return position(value)
    case 'currency_xof':
      return currency_xof(value)
    case 'seconds':
      return seconds(value)
    case 'minutes':
      return minutes(value)
    case 'count':
    default:
      return count(value)
  }
}

/**
 * Formate une valeur métrique en respectant la disponibilité.
 * - availability !== 'real' ⇒ placeholder « — » (jamais un 0 trompeur), quelle que
 *   soit la valeur passée (no_data / unavailable / not_applicable / demo).
 * - 'real' + valeur finie ⇒ nombre formaté FR selon l'unité (0 réel affiché tel quel).
 * - 'real' mais valeur null/undefined/NaN ⇒ « — » (on n'invente pas un 0).
 */
export function formatMetric(
  value: number | null | undefined,
  availability: MetricAvailability,
  unit: MetricUnitFmt = 'count',
): string {
  if (!rendersRealNumber(availability)) return NO_VALUE_PLACEHOLDER
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NO_VALUE_PLACEHOLDER
  }
  return formatReal(value, unit)
}
