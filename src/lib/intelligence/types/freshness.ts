/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Contrat de FRAÎCHEUR des données.
 *
 * Principe : une donnée Search Console (synchronisée avec délai) ne doit JAMAIS
 * être affichée comme "temps réel". Chaque métrique porte donc explicitement
 * son niveau de fraîcheur. Pur (aucun I/O), testable.
 */

/** Niveaux de fraîcheur, du plus frais au plus retardé. */
export const FRESHNESS_LEVELS = [
  'REALTIME', // ~ instantané (heartbeat, postgres_changes)
  'NEAR_REALTIME', // quelques secondes / court poll (caches 15–30s)
  'SYNCED', // rafraîchi par lots / cron (snapshots, agrégations)
  'SEO_DELAYED', // délai externe important (Search Console J-2/J-3, YouTube stats)
] as const

export type Freshness = (typeof FRESHNESS_LEVELS)[number]

/**
 * Ordre croissant de "retard". Plus l'indice est élevé, plus la donnée est retardée.
 * Sert à comparer / dégrader une exigence de fraîcheur.
 */
export const FRESHNESS_ORDER: Record<Freshness, number> = {
  REALTIME: 0,
  NEAR_REALTIME: 1,
  SYNCED: 2,
  SEO_DELAYED: 3,
}

/** Libellés FR pour l'UI (jamais de nombre fictif ici, uniquement du texte). */
export const FRESHNESS_LABELS_FR: Record<Freshness, string> = {
  REALTIME: 'Temps réel',
  NEAR_REALTIME: 'Quasi temps réel',
  SYNCED: 'Synchronisé',
  SEO_DELAYED: 'Différé (SEO)',
}

/**
 * Fenêtre de tolérance indicative (ms) au-delà de laquelle une valeur d'un niveau
 * donné est considérée périmée. Purement indicatif pour l'UI ; aucune I/O.
 */
export const FRESHNESS_MAX_STALENESS_MS: Record<Freshness, number> = {
  REALTIME: 60_000, // 1 min
  NEAR_REALTIME: 5 * 60_000, // 5 min
  SYNCED: 24 * 60 * 60_000, // 24 h
  SEO_DELAYED: 4 * 24 * 60 * 60_000, // 4 j
}

export function isFreshness(value: unknown): value is Freshness {
  return typeof value === 'string' && (FRESHNESS_LEVELS as readonly string[]).includes(value)
}
