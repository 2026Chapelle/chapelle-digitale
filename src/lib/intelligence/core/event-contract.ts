/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Helpers PURS d'accès au contrat d'événements (lecture / normalisation).
 */

import {
  EVENT_CONTRACT,
  FIRST_PARTY_EVENTS,
  type EventAvailability,
  type EventCategory,
  type EventContractEntry,
  type FirstPartyEventName,
} from '../types/events'

/** Retourne l'entrée de contrat pour un événement canonique. */
export function getEventContract(name: FirstPartyEventName): EventContractEntry {
  return EVENT_CONTRACT[name]
}

/** Tous les événements d'une catégorie donnée. */
export function eventsByCategory(category: EventCategory): EventContractEntry[] {
  return FIRST_PARTY_EVENTS.map((n) => EVENT_CONTRACT[n]).filter(
    (e) => e.category === category,
  )
}

/** Tous les événements d'un niveau de disponibilité (available / partial / gap). */
export function eventsByAvailability(availability: EventAvailability): EventContractEntry[] {
  return FIRST_PARTY_EVENTS.map((n) => EVENT_CONTRACT[n]).filter(
    (e) => e.availability === availability,
  )
}

/** Événements NON captés aujourd'hui (à instrumenter dans une phase ultérieure). */
export function eventGaps(): EventContractEntry[] {
  return eventsByAvailability('gap')
}

/**
 * Résumé de couverture (evidence-first) : combien d'événements canoniques sont
 * disponibles / partiels / manquants. Sert au shell "DATA BEFORE DECORATION".
 */
export function coverageSummary(): Record<EventAvailability, number> & { total: number } {
  const summary = { available: 0, partial: 0, gap: 0, total: FIRST_PARTY_EVENTS.length }
  for (const name of FIRST_PARTY_EVENTS) {
    summary[EVENT_CONTRACT[name].availability] += 1
  }
  return summary
}
