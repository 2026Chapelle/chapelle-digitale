/**
 * CITADELLE INTELLIGENCE HUB — HUB-1 (First-party analytics)
 * Spécifications de comptage PURES pour la Vue générale.
 *
 * Ces specs décrivent EXACTEMENT quelle table et quels filtres interrogent les
 * stores EXISTANTS (aucune nouvelle table). Elles sont pures ⇒ testables sans DB,
 * ce qui verrouille les pièges relevés par l'audit :
 *  - la valeur stockée est `type='pageview'` (PAS 'page_view') ;
 *  - l'audio se filtre sur `occurred_at` (pas created_at) ;
 *  - les complétions se comptent sur `module_completions.completed_at` (immuable),
 *    jamais sur video_progress.completed (mutable → recompte au re-visionnage).
 *
 * L'exécution réelle (service_role) est isolée dans supabase-reader.ts.
 */

/** Bornes temporelles (ISO 8601) injectées — aucune horloge implicite ici. */
export interface CountWindow {
  /** Instant courant. */
  nowIso: string
  /** Début du jour UTC (00:00Z) en ISO — ≈ Abidjan/GMT (TZ du public principal),
   *  déterministe et indépendant du fuseau du serveur. */
  sinceTodayIso: string
  /** Seuil "en ligne maintenant" = now - 90s (3 × heartbeat 30s). */
  onlineSinceIso: string
}

export type CountFilter =
  | { op: 'eq'; col: string; val: string }
  | { op: 'in'; col: string; vals: string[] }
  | { op: 'gte'; col: string; val: string }

export interface CountSpec {
  /** Table du store existant (schéma public). */
  table: string
  filters: CountFilter[]
}

/** Clés de comptage de la Vue générale. */
export type OverviewCountKey =
  | 'pageViewsToday'
  | 'activeSessionsNow' // sessions actives (pas utilisateurs : inclut l'anonyme, 1/onglet)
  | 'signupsToday'
  | 'podcastStartsToday'
  | 'lessonCompletionsToday'

export type OverviewCounts = Record<OverviewCountKey, number>

/**
 * Construit les specs de comptage pour une fenêtre donnée. PURE.
 * Chaque spec = un `count(*, head:true)` filtré (aucune ligne transférée, 0 PII).
 */
export function overviewCountSpecs(w: CountWindow): Record<OverviewCountKey, CountSpec> {
  return {
    // Visites : analytics_events, type='pageview' (valeur stockée réelle), aujourd'hui.
    pageViewsToday: {
      table: 'analytics_events',
      filters: [
        { op: 'eq', col: 'type', val: 'pageview' },
        { op: 'gte', col: 'created_at', val: w.sinceTodayIso },
      ],
    },
    // Sessions actives : sessions vues dans la fenêtre "en ligne" (heartbeat).
    // NB : compte des SESSIONS (analytics_sessions), pas des utilisateurs distincts
    // (inclut l'anonyme ; une personne multi-onglets = plusieurs sessions).
    activeSessionsNow: {
      table: 'analytics_sessions',
      filters: [{ op: 'gte', col: 'last_seen', val: w.onlineSinceIso }],
    },
    // Inscriptions : profiles créés aujourd'hui (source canonique via trigger handle_new_user).
    signupsToday: {
      table: 'profiles',
      filters: [{ op: 'gte', col: 'created_at', val: w.sinceTodayIso }],
    },
    // Écoutes podcast : audio_listening_events play_start/resume, filtre sur occurred_at.
    podcastStartsToday: {
      table: 'audio_listening_events',
      filters: [
        { op: 'in', col: 'event_type', vals: ['play_start', 'play_resume'] },
        { op: 'gte', col: 'occurred_at', val: w.sinceTodayIso },
      ],
    },
    // Progressions parcours : module_completions.completed_at (immuable, dédupliqué par unique).
    lessonCompletionsToday: {
      table: 'module_completions',
      filters: [{ op: 'gte', col: 'completed_at', val: w.sinceTodayIso }],
    },
  }
}
