/**
 * CITADELLE INTELLIGENCE — 5A · Vocabulaire GELÉ de DISPONIBILITÉ des métriques.
 *
 * Règles canoniques (partagées par tout le hub) :
 *   REAL_ZERO   != UNAVAILABLE
 *   REAL_ZERO   != NO_DATA
 *   NO_DATA     != ZERO
 *   NOT_APPLICABLE != ZERO
 *
 * - REAL           : la source établit une valeur numérique réelle (0 réel inclus).
 * - NO_DATA        : source CONNECTÉE mais aucune observation sur la période (≠ 0).
 * - UNAVAILABLE    : instrumentation/connexion absente — on ne peut pas savoir.
 * - NOT_APPLICABLE : la métrique n'a pas de sens dans ce contexte (ex. CTR sans dénominateur).
 * - DEMO           : donnée de démonstration explicite (jamais confondue avec la prod).
 *
 * Un nombre (y compris 0) ne s'affiche QUE pour REAL. Les autres → placeholder « — ».
 */

export type MetricAvailability = 'real' | 'no_data' | 'unavailable' | 'not_applicable' | 'demo'

export const METRIC_AVAILABILITIES: ReadonlyArray<MetricAvailability> = [
  'real',
  'no_data',
  'unavailable',
  'not_applicable',
  'demo',
]

/** Placeholder canonique quand aucune valeur réelle n'est affichable. */
export const NO_VALUE_PLACEHOLDER = '—'

/** Libellés FR courts par disponibilité (badges). */
export const AVAILABILITY_LABEL_FR: Record<MetricAvailability, string> = {
  real: 'Réel',
  no_data: 'Aucune donnée',
  unavailable: 'Indisponible',
  not_applicable: 'Non applicable',
  demo: 'Démo',
}

/** Explication FR (tooltip / sous-texte) par disponibilité. */
export const AVAILABILITY_HINT_FR: Record<MetricAvailability, string> = {
  real: 'Valeur réelle mesurée par la source.',
  no_data: 'Source connectée, mais aucune donnée sur cette période.',
  unavailable: 'Aucune source fiable ne mesure cette métrique.',
  not_applicable: "Cette métrique n'a pas de sens dans ce contexte.",
  demo: 'Donnée de démonstration — non issue de la production.',
}

/** Couleur indicative par disponibilité (charte cockpit). */
export const AVAILABILITY_COLOR: Record<MetricAvailability, string> = {
  real: '#4ade80',
  no_data: '#9ca3af',
  unavailable: '#9ca3af',
  not_applicable: '#9ca3af',
  demo: '#fbbf24',
}

/** Un nombre réel (0 inclus) est-il affichable pour cette disponibilité ? */
export function rendersRealNumber(a: MetricAvailability): boolean {
  return a === 'real'
}
