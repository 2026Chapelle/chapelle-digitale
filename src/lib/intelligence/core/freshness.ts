/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Helpers PURS de fraîcheur. Aucun I/O, aucune horloge implicite : le "maintenant"
 * est toujours injecté (nowMs) pour rester déterministe et testable.
 */

import {
  FRESHNESS_MAX_STALENESS_MS,
  FRESHNESS_ORDER,
  type Freshness,
} from '../types/freshness'

/** Âge (ms) d'une mesure par rapport à un instant de référence. */
export function stalenessMs(measuredAtIso: string, nowMs: number): number {
  const measured = Date.parse(measuredAtIso)
  if (Number.isNaN(measured)) return Number.POSITIVE_INFINITY
  return Math.max(0, nowMs - measured)
}

/** true si la mesure dépasse la fenêtre de tolérance de son niveau de fraîcheur. */
export function isStale(
  freshness: Freshness,
  measuredAtIso: string,
  nowMs: number,
): boolean {
  return stalenessMs(measuredAtIso, nowMs) > FRESHNESS_MAX_STALENESS_MS[freshness]
}

/** true seulement pour le niveau strictement temps réel. */
export function isRealtime(freshness: Freshness): boolean {
  return freshness === 'REALTIME'
}

/**
 * Compare deux niveaux : renvoie le PLUS retardé (le "pire") des deux.
 * Utile quand une vue combine plusieurs sources : elle ne peut pas être plus
 * fraîche que sa source la plus lente.
 */
export function worstFreshness(a: Freshness, b: Freshness): Freshness {
  return FRESHNESS_ORDER[a] >= FRESHNESS_ORDER[b] ? a : b
}

/** Réduit une liste de niveaux au plus retardé ; défaut REALTIME si vide. */
export function combineFreshness(levels: ReadonlyArray<Freshness>): Freshness {
  return levels.reduce<Freshness>((acc, cur) => worstFreshness(acc, cur), 'REALTIME')
}
