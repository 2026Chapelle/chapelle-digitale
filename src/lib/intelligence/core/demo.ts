/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Données de DÉMONSTRATION explicites.
 *
 * RÈGLE ABSOLUE : aucun nombre fictif ne doit sembler provenir de la production.
 * Tout ce qui sort d'ici porte `source: 'demo'` ⇒ `demo: true` (garanti par
 * makeEnvelope). Le shell affiche un bandeau "DONNÉES DE DÉMONSTRATION".
 */

import { makeEnvelope } from './metric-envelope'
import type { MetricEnvelope } from '../types/metrics'

/** Libellé UI à afficher partout où de la donnée de démo apparaît. */
export const DEMO_BADGE_FR = 'DONNÉES DE DÉMONSTRATION'
export const DEMO_BADGE_EN = 'DEMO DATA'

/**
 * Jeu d'enveloppes de démonstration déterministe (aucune horloge implicite :
 * l'instant est injecté). Toutes marquées demo par construction.
 */
export function demoEnvelopes(syncedAtIso: string): MetricEnvelope[] {
  return [
    makeEnvelope({
      source: 'demo',
      metric: 'sessions',
      value: 0,
      unit: 'count',
      freshness: 'NEAR_REALTIME',
      syncedAt: syncedAtIso,
    }),
    makeEnvelope({
      source: 'demo',
      metric: 'conversion_rate',
      value: 0,
      unit: 'ratio',
      freshness: 'SYNCED',
      syncedAt: syncedAtIso,
    }),
    makeEnvelope({
      source: 'demo',
      metric: 'seo_clicks',
      value: 0,
      unit: 'count',
      freshness: 'SEO_DELAYED',
      syncedAt: syncedAtIso,
    }),
  ]
}
