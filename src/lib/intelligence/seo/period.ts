/**
 * CITADELLE INTELLIGENCE HUB — SEO
 * Construction PURE des fenêtres temporelles SEO (courante + précédente).
 *
 * Search Console livre par jour, avec ~2-3 j de retard. On raisonne donc en
 * dates UTC (YYYY-MM-DD). Le « maintenant » est TOUJOURS injecté (nowMs) pour
 * rester déterministe et testable — aucune horloge implicite.
 */

import type { SeoPeriod, SeoPeriodKey } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Nombre de jours couverts par une clé de période. */
export const PERIOD_DAYS: Readonly<Record<SeoPeriodKey, number>> = {
  '7d': 7,
  '28d': 28,
  '90d': 90,
}

/** Date UTC (YYYY-MM-DD) d'un instant. */
function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Fenêtre SEO. `to` est fixé à J-`lagDays` (défaut 2) car GSC ne dispose pas
 * encore des jours les plus récents ; la fenêtre précédente est de même durée,
 * contiguë et antérieure — pour une comparaison honnête période/période.
 */
export function buildSeoPeriod(
  key: SeoPeriodKey,
  nowMs: number,
  lagDays = 2,
): SeoPeriod {
  const days = PERIOD_DAYS[key]
  const toMs = nowMs - lagDays * DAY_MS
  const fromMs = toMs - (days - 1) * DAY_MS
  const prevToMs = fromMs - DAY_MS
  const prevFromMs = prevToMs - (days - 1) * DAY_MS
  return {
    key,
    from: isoDate(fromMs),
    to: isoDate(toMs),
    prevFrom: isoDate(prevFromMs),
    prevTo: isoDate(prevToMs),
  }
}

/** Garde-fou de parsing d'une clé de période (défaut 28d). */
export function parsePeriodKey(value: unknown): SeoPeriodKey {
  return value === '7d' || value === '28d' || value === '90d' ? value : '28d'
}
