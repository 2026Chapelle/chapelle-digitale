/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 3 · CLASSEMENTS NOMMÉS PAR CANAL (PUR).
 *
 * Aucun « meilleur canal » global (composite trompeur). Uniquement des
 * classements NOMMÉS sur UNE métrique comparable :
 *  - `top_traffic_attributed`      → par visites Citadelle attribuées (comparable).
 *  - `top_progressions_attributed` → par progressions attribuées (comparable).
 *  - `top_signup_rate`             → par taux visite → inscription : NON disponible,
 *    car le taux par source est incomparable entre cohortes / échantillons
 *    (attribution first-touch hors fenêtre). On ne classe JAMAIS sur du non fiable.
 *
 * Garde de comparabilité : un classement n'est publié que si au moins
 * `MIN_COMPARABLE_CHANNELS_FOR_RANKING` canaux portent une valeur RÉELLE sur la
 * MÊME métrique. Sinon `available:false` + raison (jamais un classement trompeur).
 *
 * Tri DÉTERMINISTE : valeur décroissante, puis libellé croissant (départage stable).
 */

import type { ChannelCitadelleValue, ChannelRanking, DecisionPeriod, MeasuredValue } from '../contract'
import { MIN_COMPARABLE_CHANNELS_FOR_RANKING } from '../thresholds'

/** Sélecteur d'une colonne CITADELLE comparable (MeasuredValue). */
type ColumnPicker = (c: ChannelCitadelleValue) => MeasuredValue

/**
 * Construit un classement comparable sur UNE colonne Citadelle RÉELLE.
 * Publié uniquement si ≥ seuil de canaux comparables ; sinon NON disponible.
 */
function comparableRanking(
  key: 'top_traffic_attributed' | 'top_progressions_attributed',
  label: string,
  metricLabel: string,
  period: DecisionPeriod,
  citadelle: ReadonlyArray<ChannelCitadelleValue>,
  pick: ColumnPicker,
): ChannelRanking {
  // Comparable = valeur RÉELLE (un 0 réel reste comparable).
  const comparable = citadelle.filter((c) => {
    const m = pick(c)
    return m.availability === 'REAL' && m.value !== null
  })

  if (comparable.length < MIN_COMPARABLE_CHANNELS_FOR_RANKING) {
    return {
      key,
      label,
      metricLabel,
      period,
      available: false,
      reason: `Moins de ${MIN_COMPARABLE_CHANNELS_FOR_RANKING} canaux comparables (métrique réelle sur « ${metricLabel} »).`,
      rows: [],
    }
  }

  const rows = comparable
    .map((c) => ({ source: c.source, label: c.label, value: pick(c).value as number }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))

  return { key, label, metricLabel, period, available: true, rows }
}

/**
 * `buildChannelRankings` — PUR. Renvoie les trois classements nommés dans un ordre
 * stable. Le classement par taux d'inscription est structurellement NON disponible
 * (taux incomparable), conformément à la vérité d'attribution 5A.
 */
export function buildChannelRankings(
  citadelle: ReadonlyArray<ChannelCitadelleValue>,
  period: DecisionPeriod,
): ChannelRanking[] {
  const trafficRanking = comparableRanking(
    'top_traffic_attributed',
    'Trafic Citadelle attribué',
    'Visites Citadelle attribuées',
    period,
    citadelle,
    (c) => c.citadelleVisits,
  )

  const progressionsRanking = comparableRanking(
    'top_progressions_attributed',
    'Progressions attribuées',
    'Progressions Citadelle attribuées',
    period,
    citadelle,
    (c) => c.parcours,
  )

  // Taux visite → inscription : incomparable entre cohortes ⇒ jamais classé.
  const signupRateRanking: ChannelRanking = {
    key: 'top_signup_rate',
    label: "Meilleur taux d'inscription",
    metricLabel: 'Taux visite → inscription',
    period,
    available: false,
    reason:
      'Taux non comparable entre cohortes / échantillons : une inscription est rattachée à sa session first-touch, potentiellement hors de la fenêtre des visites.',
    rows: [],
  }

  return [trafficRanking, progressionsRanking, signupRateRanking]
}
