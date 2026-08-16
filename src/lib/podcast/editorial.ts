/**
 * PODCAST-0B — Modèle éditorial podcast (lib pure, aucune I/O → testable).
 *
 * Chaque épisode `cms_podcasts` porte désormais nativement (migration
 * 20260812153000_podcast_0b_editorial) :
 *   • `serie`        — l'ÉMISSION (ex. « L'Instant Citadelle »), indépendante de l'accès ;
 *   • `access_level` — public | member | premium (donnée ÉDITORIALE, pas un gate RLS) ;
 *   • `destinations` — emplacements éditoriaux explicites (catalog, home_instant, …) ;
 *   • `is_featured`  — flag « À LA UNE ».
 *
 * COMPAT LEGACY : ces fonctions lisent des lignes qui PEUVENT ne pas encore porter
 * les colonnes (déploiement partiel / prod pré-migration). Elles ne jettent jamais
 * et retombent sur des defaults sûrs → aucune régression PODCAST-0A.
 *
 * SÉCURITÉ : `access_level` est une MÉTADONNÉE ÉDITORIALE (affichage, tri, badge), pas un
 * verrou en soi — la RLS `cms_podcasts_read` laisse `anon`/`authenticated` lire les lignes
 * `status='published'`. L'ENFORCEMENT RÉEL est assuré côté serveur par PODCAST-SEC
 * (/api/podcast/[id]/play : identité vérifiée + URL signée jamais exposée au client) et,
 * pour `premium`, par l'entitlement canonique PODCAST-5B/5C (`has_podcast_premium_access`,
 * fail-closed). Le champ ci-dessous alimente l'UI ; il ne remplace jamais ce gate.
 */

// ── Niveaux d'accès ─────────────────────────────────────────────────────────
export type PodcastAccessLevel = 'public' | 'member' | 'premium'
export const PODCAST_ACCESS_LEVELS: readonly PodcastAccessLevel[] = ['public', 'member', 'premium'] as const
export const DEFAULT_ACCESS_LEVEL: PodcastAccessLevel = 'member'

export const ACCESS_LEVEL_LABELS: Record<PodcastAccessLevel, string> = {
  public: 'Public',
  member: 'Membre',
  premium: 'Premium',
}

// ── Destinations éditoriales ────────────────────────────────────────────────
export type PodcastDestination = 'catalog' | 'home_instant' | 'home_premium' | 'featured'
export const PODCAST_DESTINATIONS: readonly PodcastDestination[] = [
  'catalog',
  'home_instant',
  'home_premium',
  'featured',
] as const

export const DESTINATION_LABELS: Record<PodcastDestination, string> = {
  catalog: 'Catalogue /podcast',
  home_instant: "Accueil — L'Instant Citadelle",
  home_premium: 'Accueil — Premium',
  featured: 'À la une',
}

// ── Forme normalisée d'un épisode côté éditorial ────────────────────────────
export interface PodcastEditorial {
  serie: string | null
  accessLevel: PodcastAccessLevel
  destinations: string[]
  isFeatured: boolean
}

/** Normalise une chaîne d'accès en niveau reconnu (repli `member`). */
export function normalizeAccessLevel(value: unknown): PodcastAccessLevel {
  return typeof value === 'string' && (PODCAST_ACCESS_LEVELS as readonly string[]).includes(value)
    ? (value as PodcastAccessLevel)
    : DEFAULT_ACCESS_LEVEL
}

/** Lit un tableau de destinations défensivement (ignore null/non-string/vides, dédoublonne). */
export function normalizeDestinations(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const v of value) {
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

/** Nettoie une série (chaîne non vide, ou null). */
export function normalizeSerie(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

/**
 * Extrait le modèle éditorial d'une ligne brute `cms_podcasts`.
 * Tolère l'absence totale des colonnes (lignes legacy) → defaults sûrs.
 */
export function normalizePodcastEditorial(row: Record<string, unknown> | null | undefined): PodcastEditorial {
  const r = row ?? {}
  return {
    serie: normalizeSerie(r.serie),
    accessLevel: normalizeAccessLevel(r.access_level),
    destinations: normalizeDestinations(r.destinations),
    isFeatured: r.is_featured === true,
  }
}

/** Vrai si l'épisode cible une destination éditoriale donnée. */
export function hasDestination(ed: PodcastEditorial, dest: PodcastDestination | string): boolean {
  return ed.destinations.includes(dest)
}

/**
 * Un épisode est en « écoute libre sur l'accueil » s'il est public OU explicitement
 * placé dans l'emplacement Instant de l'accueil (lecture gratuite de L'Instant Citadelle).
 */
export function isFreeInstant(ed: PodcastEditorial): boolean {
  return ed.accessLevel === 'public' || hasDestination(ed, 'home_instant')
}

// ── Sélection éditoriale (socle « LA VOIX DU ROYAUME », pur & testable) ──────

/** Contrat minimal d'un épisode enrichi pour la sélection éditoriale. */
export interface EditorialEpisode {
  id: string
  editorial: PodcastEditorial
}

/**
 * « À la une » : premier épisode `is_featured`, sinon premier portant la
 * destination `featured`, sinon null. Respecte l'ordre fourni par l'appelant.
 */
export function selectFeaturedEpisode<T extends EditorialEpisode>(episodes: T[]): T | null {
  const list = Array.isArray(episodes) ? episodes.filter((e) => e && e.id) : []
  return (
    list.find((e) => e.editorial.isFeatured) ||
    list.find((e) => hasDestination(e.editorial, 'featured')) ||
    null
  )
}

/** Épisodes d'une émission donnée (comparaison exacte, insensible à la casse). */
export function filterBySerie<T extends EditorialEpisode>(episodes: T[], serie: string): T[] {
  const target = serie.trim().toLowerCase()
  if (!target || target === 'all') return episodes
  return episodes.filter((e) => (e.editorial.serie ?? '').toLowerCase() === target)
}

/** Émissions distinctes présentes (dans l'ordre d'apparition) → onglets/rubriques réels. */
export function listSeries<T extends EditorialEpisode>(episodes: T[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const e of episodes) {
    const s = e.editorial.serie
    if (s && !seen.has(s)) {
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

/** Épisodes ciblant une destination donnée (carrousels d'accueil, catalogue…). */
export function filterByDestination<T extends EditorialEpisode>(
  episodes: T[],
  dest: PodcastDestination | string,
): T[] {
  return episodes.filter((e) => hasDestination(e.editorial, dest))
}
