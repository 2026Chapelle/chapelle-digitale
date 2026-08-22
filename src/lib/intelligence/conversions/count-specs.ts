/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Spécifications de comptage PURES pour les conversions (aucune DB, testables).
 *
 * Chaque spec cible une table de store EXISTANT + une colonne d'horodatage RÉELLE,
 * vérifiée dans le schéma (aucune nouvelle table, aucune source inventée) :
 *  - analytics_events.created_at (type='pageview')
 *  - profiles.created_at
 *  - audio_listening_events.occurred_at (event_type play_start/resume)
 *  - module_completions.completed_at (immuable)
 *  - event_registrations.created_at (type in inscription/participation ; 'rappel' EXCLU)
 *  - priere_demandes.created_at
 *  - dons.date_creation (statut='complete' — seul état écrit par le webhook Chariow)
 *
 * L'exécution réelle (service_role) est isolée dans reader.ts.
 */

import type { CountFilter, CountSpec } from '../adapters/count-specs'
import type { ConversionCounts } from './categories'

/** Bornes temporelles injectées (ISO 8601) — aucune horloge implicite ici. */
export interface ConversionCountWindow {
  /** Début du jour UTC (00:00Z), ≈ Abidjan/GMT (TZ du public principal). */
  sinceTodayIso: string
}

export type ConversionCountKey = keyof ConversionCounts

const gte = (col: string, val: string): CountFilter => ({ op: 'gte', col, val })

/** Construit toutes les specs de comptage des conversions. PURE. */
export function conversionCountSpecs(
  w: ConversionCountWindow,
): Record<ConversionCountKey, CountSpec> {
  return {
    pageViews: {
      table: 'analytics_events',
      filters: [
        { op: 'eq', col: 'type', val: 'pageview' },
        gte('created_at', w.sinceTodayIso),
      ],
    },
    signups: {
      table: 'profiles',
      filters: [gte('created_at', w.sinceTodayIso)],
    },
    podcastPlays: {
      table: 'audio_listening_events',
      filters: [
        { op: 'in', col: 'event_type', vals: ['play_start', 'play_resume'] },
        gte('occurred_at', w.sinceTodayIso),
      ],
    },
    moduleCompletions: {
      table: 'module_completions',
      filters: [gte('completed_at', w.sinceTodayIso)],
    },
    eventRegistrations: {
      table: 'event_registrations',
      filters: [
        { op: 'in', col: 'type', vals: ['inscription', 'participation'] },
        gte('created_at', w.sinceTodayIso),
      ],
    },
    prayerRequests: {
      table: 'priere_demandes',
      filters: [gte('created_at', w.sinceTodayIso)],
    },
    donationsConfirmed: {
      table: 'dons',
      filters: [
        { op: 'eq', col: 'statut', val: 'complete' },
        gte('date_creation', w.sinceTodayIso),
      ],
    },
  }
}
