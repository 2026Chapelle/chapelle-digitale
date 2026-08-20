/**
 * CITADELLE INTELLIGENCE HUB — HUB-2 (First-party attribution)
 * Agrégations PURES : comptage par source et taux de conversion sûr.
 */

import type { NormalizedSource } from './normalize'

/** Compte les occurrences par source (ignore null = non attribué). */
export function tallyBySource(
  sources: ReadonlyArray<NormalizedSource | null>,
): Map<NormalizedSource, number> {
  const m = new Map<NormalizedSource, number>()
  for (const s of sources) {
    if (s === null) continue
    m.set(s, (m.get(s) ?? 0) + 1)
  }
  return m
}

/** Nombre de conversions NON attribuées (source null). */
export function countUnattributed(sources: ReadonlyArray<NormalizedSource | null>): number {
  return sources.reduce((n, s) => (s === null ? n + 1 : n), 0)
}

/**
 * Taux de conversion sûr : null si dénominateur 0 (jamais NaN/Infinity/faux 0%).
 * Renvoie un ratio 0..1.
 */
export function conversionRate(conversions: number, visits: number): number | null {
  if (!Number.isFinite(visits) || visits <= 0) return null
  return conversions / visits
}
