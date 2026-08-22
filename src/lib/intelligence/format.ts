/**
 * CITADELLE INTELLIGENCE — 5A · Formatage GELÉ (signatures) des métriques.
 *
 * ⚠️ STUB DE COORDINATION — le chantier 2 remplit l'implémentation exacte.
 * Point unique de vérité pour l'affichage : un nombre (0 inclus) ne s'affiche QUE
 * si availability==='real' ; sinon → NO_VALUE_PLACEHOLDER (« — »). Les signatures
 * ci-dessous sont stables : les onglets (SEO inclus) les importent dès maintenant.
 */

import { MetricAvailability, NO_VALUE_PLACEHOLDER, rendersRealNumber } from './availability'

export type MetricUnitFmt = 'count' | 'percent01' | 'position' | 'seconds' | 'minutes' | 'currency_xof'

/**
 * Formate une valeur métrique en respectant la disponibilité.
 * - availability !== 'real' ⇒ placeholder « — » (jamais un 0 trompeur).
 * - 'real' ⇒ nombre formaté FR selon l'unité (0 réel affiché tel quel).
 * STUB : implémentation détaillée fournie par le chantier 2.
 */
export function formatMetric(
  value: number | null | undefined,
  availability: MetricAvailability,
  _unit: MetricUnitFmt = 'count',
): string {
  if (!rendersRealNumber(availability) || value === null || value === undefined) {
    return NO_VALUE_PLACEHOLDER
  }
  return new Intl.NumberFormat('fr-FR').format(value)
}
