/**
 * PODCAST — Avant-goût GRATUIT « L'Instant Citadelle » (accueil uniquement).
 *
 * Contrat éditorial de Citadelle :
 *   • un épisode reste `access_level=member` dans le CATALOGUE (/podcast garde son gate) ;
 *   • MAIS, s'il est l'épisode réellement DÉSIGNÉ dans le slot éditorial `home_instant`
 *     de l'accueil, il devient écoutable gratuitement — UNIQUEMENT via le mécanisme
 *     d'avant-goût de l'accueil (endpoint dédié), jamais via le gate générique.
 *
 * SÉCURITÉ : la preuve d'autorisation est la DÉSIGNATION ÉDITORIALE côté serveur
 * (instant_ids du bloc d'accueil `podcast`, OU destination `home_instant`, OU épisode
 * réellement `public`) — jamais le Referer, l'URL de page, ni une info fournie par le
 * client. On ne déverrouille QUE l'épisode actuellement résolu comme `instant`, et
 * JAMAIS un premium. Un simple repli déterministe (premier épisode) ne déverrouille rien.
 *
 * Lib PURE (aucune I/O) → testable. L'endpoint fournit les données (épisodes + config).
 */
import {
  resolvePodcastHomeSlots,
  type HomeSlotEpisode,
  type PodcastHomeSlotConfig,
} from './home-slots'

export type HomeInstantReason =
  | 'ok'
  | 'no_instant'        // aucun épisode → rien à jouer
  | 'not_designated'    // l'ID demandé n'est pas l'instant désigné (ou instant non explicite)
  | 'premium'           // l'instant est premium → jamais gratuit

export interface HomeInstantAuth {
  allowed: boolean
  reason: HomeInstantReason
  /** ID autorisé (uniquement si allowed) — l'appelant charge alors son média. */
  episodeId: string | null
}

/** Vrai si l'épisode est EXPLICITEMENT désigné comme instant gratuit (pas un simple repli). */
function isExplicitlyFreeInstant<T extends HomeSlotEpisode>(
  ep: T,
  config: PodcastHomeSlotConfig | null | undefined,
): boolean {
  const inInstantIds = Array.isArray(config?.instantIds) && config!.instantIds.includes(ep.id)
  const taggedHomeInstant = Array.isArray(ep.destinations) && ep.destinations.includes('home_instant')
  const isPublic = ep.accessLevel === 'public'
  return Boolean(inInstantIds || taggedHomeInstant || isPublic)
}

/**
 * Décision d'autorisation de l'avant-goût gratuit accueil — PURE, fail-closed.
 *
 * Autorise `requestedId` SEULEMENT si :
 *   1. il existe un instant résolu (mêmes règles que l'accueil) ;
 *   2. `requestedId` EST cet instant courant (une nouvelle sélection invalide l'ancien) ;
 *   3. l'instant n'est PAS premium ;
 *   4. l'instant est EXPLICITEMENT désigné gratuit (instant_ids / destination / public),
 *      donc pas un simple repli déterministe.
 */
export function authorizeHomeInstantPlayback<T extends HomeSlotEpisode>(
  episodes: T[],
  config: PodcastHomeSlotConfig | null | undefined,
  requestedId: string,
): HomeInstantAuth {
  const id = (typeof requestedId === 'string' ? requestedId : '').trim()
  const { instant } = resolvePodcastHomeSlots(episodes, config ?? undefined)

  if (!instant) return { allowed: false, reason: 'no_instant', episodeId: null }
  if (!id || instant.id !== id) return { allowed: false, reason: 'not_designated', episodeId: null }
  if (instant.accessLevel === 'premium') return { allowed: false, reason: 'premium', episodeId: null }
  if (!isExplicitlyFreeInstant(instant, config)) {
    return { allowed: false, reason: 'not_designated', episodeId: null }
  }
  return { allowed: true, reason: 'ok', episodeId: instant.id }
}
