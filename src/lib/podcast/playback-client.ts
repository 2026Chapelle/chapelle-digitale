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
