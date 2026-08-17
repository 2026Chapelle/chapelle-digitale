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

import type { PodcastAccessLevel } from './editorial'

/** Forme minimale attendue d'un épisode pour la résolution des emplacements. */
export interface HomeSlotEpisode {
  id: string
  /** PODCAST-SEC : signal sûr de présence d'un média (remplace audioUrl côté client). */
  hasAudio?: boolean
  /** @deprecated PODCAST-SEC : URL média non exposée au client. Toléré pour repli. */
  audioUrl?: string | null
  /**
   * PODCAST-0B (optionnel) — destinations éditoriales natives de l'épisode.
   * Quand présentes, elles priment sur le repli déterministe mais RESTENT
   * subordonnées à la config explicite du bloc d'accueil (instant_ids/premium_ids).
   * Absentes (lignes legacy) → comportement PODCAST-0A strictement inchangé.
   */
  destinations?: string[] | null
  /**
   * PODCAST-MEDIA-REDESIGN (optionnel) — niveau d'accès éditorial de l'épisode.
   * Quand renseigné (mode « access-aware »), il DURCIT le repli automatique :
   *   • la carte « L'Instant Citadelle » (gratuite) ne retient jamais un épisode
   *     `premium` par repli — elle privilégie le public / `home_instant` ;
   *   • la carte « Premium » ne retient par repli QUE de vrais épisodes `premium`
   *     (ou `home_premium`) — sinon elle reste vide (jamais un public déguisé en Premium).
   * Absent (lignes legacy pré-0B) → comportement PODCAST-0A strictement inchangé.
   * NB : la config explicite de l'admin (instant_ids/premium_ids) reste PRIORITAIRE
   * et absolue — l'access_level ne contraint que le repli déterministe.
   */
  accessLevel?: PodcastAccessLevel | null
}

/** Vrai si l'épisode déclare explicitement la destination `dest`. */
function targets(ep: HomeSlotEpisode, dest: string): boolean {
  return Array.isArray(ep.destinations) && ep.destinations.includes(dest)
}

/** Signal audio jouable (PODCAST-SEC : `hasAudio` prime, `audioUrl` toléré en repli). */
function playable(ep: HomeSlotEpisode): boolean {
  return Boolean(ep.hasAudio ?? ep.audioUrl)
}

/** Épisode réellement `premium` (métadonnée éditoriale). */
function isPremiumLevel(ep: HomeSlotEpisode): boolean {
  return ep.accessLevel === 'premium'
}

/** Candidat légitime pour l'emplacement Premium : `premium` OU destination `home_premium`. */
function premiumSlotCandidate(ep: HomeSlotEpisode): boolean {
  return isPremiumLevel(ep) || targets(ep, 'home_premium')
}

/** Candidat pour l'emplacement gratuit « L'Instant » : `public` OU destination `home_instant`. */
function freeInstantCandidate(ep: HomeSlotEpisode): boolean {
  return ep.accessLevel === 'public' || targets(ep, 'home_instant')
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
 *   1. premier id configuré (bloc `podcast.data`) présent dans `episodes` — ABSOLU
 *      (autorité éditoriale de l'admin, jamais contrainte par l'access_level) ;
 *   2. destination éditoriale native `home_instant` / `home_premium` (PODCAST-0B) ;
 *   3. repli déterministe (voir ci-dessous) ;
 * avec garantie stricte : `premium` n'est jamais l'épisode déjà retenu pour `instant`.
 *
 * Repli — mode « access-aware » (au moins un épisode porte un `access_level`,
 * PODCAST-MEDIA-REDESIGN) :
 *   • instant  = premier épisode gratuit (public / `home_instant`) jouable, sinon
 *                gratuit, sinon premier épisode NON premium jouable — jamais un
 *                `premium` déguisé en écoute libre ;
 *   • premium  = premier épisode réellement `premium` (ou `home_premium`) ≠ instant,
 *                sinon `null`. On ne présente JAMAIS un contenu public sous le label
 *                Premium (fin du défaut P0 : disjonction par NIVEAU, pas seulement par id).
 *
 * Repli — mode legacy (aucun `access_level` présent, lignes pré-0B) :
 *   • instant  = premier épisode jouable, sinon le premier ;
 *   • premium  = premier épisode ≠ instant jouable, sinon le premier ≠ instant.
 *   → comportement PODCAST-0A strictement inchangé.
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

  // Mode « access-aware » activé dès qu'au moins un épisode porte un access_level
  // exploitable. Sinon on reste STRICTEMENT sur le repli legacy PODCAST-0A.
  const accessAware = list.some(
    (e) => e.accessLevel === 'public' || e.accessLevel === 'member' || e.accessLevel === 'premium',
  )

  // --- Instant ---
  // 1) config admin (absolue) → 2) destination `home_instant` → 3) repli.
  const instantFallback = (): T | null =>
    accessAware
      ? list.find((e) => freeInstantCandidate(e) && playable(e)) ||
        list.find((e) => freeInstantCandidate(e)) ||
        list.find((e) => !isPremiumLevel(e) && playable(e)) ||
        list.find((e) => !isPremiumLevel(e)) ||
        list[0] ||
        null
      : list.find((e) => playable(e)) || list[0] || null

  const instant =
    firstConfigured(byId, cfg.instantIds) ||
    list.find((e) => targets(e, 'home_instant')) ||
    instantFallback()

  const instantId = instant?.id

  // --- Premium (toujours distinct de instant) ---
  // 1) config admin (absolue) → 2) destination `home_premium` → 3) repli.
  const premiumFallback = (): T | null =>
    accessAware
      ? // access-aware : UNIQUEMENT de vrais épisodes premium, jamais un public déguisé.
        list.find((e) => e.id !== instantId && premiumSlotCandidate(e) && playable(e)) ||
        list.find((e) => e.id !== instantId && premiumSlotCandidate(e)) ||
        null
      : // legacy 0-A : premier épisode distinct (jouable en priorité).
        list.find((e) => e.id !== instantId && playable(e)) ||
        list.find((e) => e.id !== instantId) ||
        null

  const premium =
    firstConfigured(byId, cfg.premiumIds, instantId) ||
    list.find((e) => e.id !== instantId && targets(e, 'home_premium')) ||
    premiumFallback()

  return { instant, premium }
}
