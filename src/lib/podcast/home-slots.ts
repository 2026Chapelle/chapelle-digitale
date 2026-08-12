/**
 * PODCAST-0A — Résolution des emplacements podcast de la page d'accueil.
 *
 * Objectif : supprimer la duplication entre « Accueil → L'Instant Citadelle » et
 * « Accueil → Premium ». Ces deux emplacements doivent être EXPLICITES et
 * INDÉPENDANTS, jamais alimentés par une même requête « tous les podcasts publiés ».
 *
 * Sans migration SQL : la sélection est pilotée par le champ `data` (jsonb) du bloc
 * d'accueil `podcast` (table existante `cms_homepage_blocks`), au format :
 *   { "instant_ids": ["<uuid>", ...], "premium_ids": ["<uuid>", ...] }
 *
 * Si le bloc ne configure rien, un repli déterministe garantit malgré tout deux
 * épisodes DISTINCTS (jamais le même dans les deux cartes) — donc zéro duplication
 * même sans action admin.
 *
 * Lib pure (aucune I/O) → testable unitairement.
 */

/** Forme minimale attendue d'un épisode pour la résolution des emplacements. */
export interface HomeSlotEpisode {
  id: string
  audioUrl?: string | null
  /**
   * PODCAST-0B (optionnel) — destinations éditoriales natives de l'épisode.
   * Quand présentes, elles priment sur le repli déterministe mais RESTENT
   * subordonnées à la config explicite du bloc d'accueil (instant_ids/premium_ids).
   * Absentes (lignes legacy) → comportement PODCAST-0A strictement inchangé.
   */
  destinations?: string[] | null
}

/** Vrai si l'épisode déclare explicitement la destination `dest`. */
function targets(ep: HomeSlotEpisode, dest: string): boolean {
  return Array.isArray(ep.destinations) && ep.destinations.includes(dest)
}

/** Configuration éditoriale portée par `cms_homepage_blocks.data` (bloc `podcast`). */
export interface PodcastHomeSlotConfig {
  instantIds: string[]
  premiumIds: string[]
}

export interface ResolvedHomeSlots<T> {
  /** Épisode diffusé dans « Accueil → L'Instant Citadelle » (lecture libre). */
  instant: T | null
  /** Épisode diffusé dans « Accueil → Premium » (jamais identique à `instant`). */
  premium: T | null
}

const EMPTY_CONFIG: PodcastHomeSlotConfig = { instantIds: [], premiumIds: [] }

/** Lit un tableau de chaînes défensivement (ignore null/non-string/vides). */
function readIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * Extrait la config des emplacements depuis le `data` d'un bloc d'accueil `podcast`.
 * Tolère les deux conventions de nommage (`instant_ids` / `instantIds`).
 * Ne jette jamais : renvoie une config vide si la donnée est absente ou malformée.
 */
export function parsePodcastSlotConfig(blockData: unknown): PodcastHomeSlotConfig {
  if (!blockData || typeof blockData !== 'object') return EMPTY_CONFIG
  const d = blockData as Record<string, unknown>
  const instantIds = readIdArray(d.instant_ids ?? d.instantIds)
  const premiumIds = readIdArray(d.premium_ids ?? d.premiumIds)
  return { instantIds, premiumIds }
}

/** Premier épisode dont l'id figure dans `ids` (dans l'ordre de `ids`), en excluant `excludeId`. */
function firstConfigured<T extends HomeSlotEpisode>(
  byId: Map<string, T>,
  ids: string[],
  excludeId?: string,
): T | null {
  for (const id of ids) {
    if (id === excludeId) continue
    const ep = byId.get(id)
    if (ep) return ep
  }
  return null
}

/**
 * Résout les deux emplacements d'accueil de façon explicite et disjointe.
 *
 * Priorité pour CHAQUE emplacement :
 *   1. premier id configuré (bloc `podcast.data`) présent dans `episodes` ;
 *   2. repli déterministe (voir ci-dessous) ;
 * avec garantie stricte : `premium` n'est jamais l'épisode déjà retenu pour `instant`.
 *
 * Replis (aucune config) :
 *   • instant  = premier épisode ayant un `audioUrl` (l'écoute libre du jour), sinon le premier ;
 *   • premium  = premier épisode ≠ instant ayant un `audioUrl`, sinon le premier épisode ≠ instant.
 *
 * L'ordre de `episodes` est respecté (l'appelant le trie déjà par date décroissante).
 */
export function resolvePodcastHomeSlots<T extends HomeSlotEpisode>(
  episodes: T[],
  config?: PodcastHomeSlotConfig | null,
): ResolvedHomeSlots<T> {
  const list = Array.isArray(episodes) ? episodes.filter((e) => e && e.id) : []
  if (list.length === 0) return { instant: null, premium: null }

  const byId = new Map<string, T>()
  for (const ep of list) if (!byId.has(ep.id)) byId.set(ep.id, ep)

  const cfg = config ?? EMPTY_CONFIG

  // --- Instant ---
  // Priorité : 1) config explicite du bloc d'accueil (admin) ; 2) destination
  // éditoriale native `home_instant` (PODCAST-0B) ; 3) repli déterministe 0-A.
  const instant =
    firstConfigured(byId, cfg.instantIds) ||
    list.find((e) => targets(e, 'home_instant')) ||
    list.find((e) => e.audioUrl) ||
    list[0] ||
    null

  const instantId = instant?.id

  // --- Premium (toujours distinct de instant) ---
  // Priorité analogue : config → destination `home_premium` → repli 0-A.
  const premium =
    firstConfigured(byId, cfg.premiumIds, instantId) ||
    list.find((e) => e.id !== instantId && targets(e, 'home_premium')) ||
    list.find((e) => e.id !== instantId && e.audioUrl) ||
    list.find((e) => e.id !== instantId) ||
    null

  return { instant, premium }
}
