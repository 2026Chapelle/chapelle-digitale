/**
 * PODCAST-SEC — Résolution de lecture côté client (thin).
 *
 * Le client ne connaît plus l'URL média : au clic « Lecture », il demande au
 * serveur l'URL autorisée via /api/podcast/:id/play. En cas de refus, il reçoit
 * une RAISON (auth/membre/premium) pour afficher l'invite adaptée — jamais l'URL.
 */
import type { PlaybackReason } from './playback-access'

export interface PlaybackResolved {
  url: string
  expiresAt: string | null
  source: string
}

export interface PlaybackDenied {
  error: PlaybackReason
}

export type PlaybackResult = PlaybackResolved | PlaybackDenied

export function isResolved(r: PlaybackResult): r is PlaybackResolved {
  return (r as PlaybackResolved).url !== undefined
}

/**
 * Action UI à partir du VERDICT SERVEUR (source de vérité unique). Le client ne
 * pré-bloque JAMAIS : il tente la résolution puis agit selon la réponse.
 *   • URL résolue (ex. épisode public, ou membre autorisé)      → 'play'
 *   • auth_required (anonyme sur contenu réservé)               → 'join' (invitation)
 *   • autre refus (member_only / premium_denied / no_media / …) → 'notice' (message)
 * Épisode PUBLIC + visiteur ⇒ le serveur renvoie une URL ⇒ 'play' (aucune modal).
 */
export type PlaybackAction =
  | { kind: 'play'; url: string }
  | { kind: 'join' }
  | { kind: 'notice'; reason: PlaybackReason }

export function playbackActionFor(res: PlaybackResult): PlaybackAction {
  if (isResolved(res)) return { kind: 'play', url: res.url }
  if (res.error === 'auth_required') return { kind: 'join' }
  return { kind: 'notice', reason: res.error }
}

/**
 * Demande au serveur l'URL de lecture autorisée pour un épisode.
 * Ne jette jamais : renvoie une raison exploitable par l'UI.
 */
export async function resolvePlayback(podcastId: string): Promise<PlaybackResult> {
  try {
    const res = await fetch(`/api/podcast/${encodeURIComponent(podcastId)}/play`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
    })
    const body = (await res.json().catch(() => null)) as
      | { allowed?: boolean; playbackUrl?: string; expiresAt?: string | null; source?: string; reason?: PlaybackReason }
      | null

    if (res.ok && body?.allowed && typeof body.playbackUrl === 'string' && body.playbackUrl) {
      return { url: body.playbackUrl, expiresAt: body.expiresAt ?? null, source: body.source ?? 'external' }
    }
    return { error: (body?.reason as PlaybackReason) || 'not_found' }
  } catch {
    return { error: 'not_found' }
  }
}

/**
 * PODCAST — Avant-goût GRATUIT « L'Instant Citadelle » (accueil uniquement).
 * Appelle le chemin DÉDIÉ /api/podcast/home-instant/play : le serveur n'autorise que
 * l'épisode réellement désigné dans le slot éditorial home_instant (jamais premium,
 * jamais un autre épisode). Le gate générique /podcast reste inchangé pour cet épisode.
 * Ne jette jamais ; un refus renvoie une raison neutre exploitable par l'UI.
 */
export async function resolveHomeInstantPlayback(podcastId: string): Promise<PlaybackResult> {
  try {
    const res = await fetch(`/api/podcast/home-instant/play?id=${encodeURIComponent(podcastId)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
    })
    const body = (await res.json().catch(() => null)) as
      | { allowed?: boolean; playbackUrl?: string; expiresAt?: string | null; source?: string }
      | null
    if (res.ok && body?.allowed && typeof body.playbackUrl === 'string' && body.playbackUrl) {
      return { url: body.playbackUrl, expiresAt: body.expiresAt ?? null, source: body.source ?? 'external' }
    }
    return { error: 'not_found' }
  } catch {
    return { error: 'not_found' }
  }
}
