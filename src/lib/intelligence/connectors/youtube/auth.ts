/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · YouTube · Auth OAuth2 (SERVER-ONLY)
 *
 * Flux OAuth 2.0 « refresh token » du propriétaire de la chaîne : on échange un
 * refresh_token (fourni par le propriétaire @ChapelleRoyaleTV, scopes read-only)
 * contre un access_token de courte durée. AUCUNE dépendance npm : `fetch` natif.
 *
 * SÉCURITÉ ABSOLUE :
 *  - `import 'server-only'` : jamais côté client.
 *  - Le client_secret, le refresh_token et l'access_token ne sont JAMAIS journalisés
 *    ni renvoyés. Les erreurs sont réduites à des codes NON sensibles.
 *  - `fetchImpl` injectable → tests 100 % hors-ligne (aucun réseau réel).
 */

import 'server-only'
import type { FetchImpl } from '../google-auth'
import type { YouTubeConfig } from './config'

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_TIMEOUT_MS = 12_000

/**
 * Erreur d'auth porteuse d'un code NON sensible. `authRequired=true` signale un
 * refresh_token révoqué/expiré (invalid_grant) → le propriétaire doit re-consentir
 * (état AUTH_REQUIRED), à distinguer d'une erreur transitoire (état ERROR).
 */
export class YouTubeAuthError extends Error {
  constructor(
    message: string,
    /** true → re-consentement du propriétaire requis (AUTH_REQUIRED). */
    public readonly authRequired: boolean,
  ) {
    super(message)
    this.name = 'YouTubeAuthError'
  }
}

export interface YouTubeAccessToken {
  accessToken: string
  /** Instant d'expiration (ms epoch). */
  expiresAtMs: number
}

export interface RefreshOptions {
  nowMs: number
  fetchImpl?: FetchImpl
  timeoutMs?: number
}

/**
 * Échange le refresh_token contre un access_token (scopes read-only).
 * Lève `YouTubeAuthError` (jamais de secret) — l'appelant traduit en statut
 * AUTH_REQUIRED/ERROR, JAMAIS en donnée fabriquée.
 */
export async function refreshAccessToken(
  config: YouTubeConfig,
  opts: RefreshOptions,
): Promise<YouTubeAccessToken> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  })

  const controller = new AbortController()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Awaited<ReturnType<FetchImpl>>
  try {
    res = await fetchImpl(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new YouTubeAuthError('youtube_timeout', false)
    }
    throw new YouTubeAuthError('youtube_oauth_error', false)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    // On tente de distinguer invalid_grant (re-consentement requis) des autres
    // erreurs, SANS jamais journaliser le corps (peut contenir des détails).
    let isInvalidGrant = false
    try {
      const j = (await res.json()) as { error?: string }
      isInvalidGrant = j?.error === 'invalid_grant'
    } catch {
      /* corps illisible : on reste sur le code HTTP */
    }
    if (isInvalidGrant || res.status === 400 || res.status === 401) {
      throw new YouTubeAuthError('youtube_oauth_invalid_grant', true)
    }
    throw new YouTubeAuthError(`youtube_oauth_http_${res.status}`, false)
  }

  let json: { access_token?: string; expires_in?: number }
  try {
    json = (await res.json()) as { access_token?: string; expires_in?: number }
  } catch {
    throw new YouTubeAuthError('youtube_bad_json', false)
  }
  if (!json.access_token) {
    throw new YouTubeAuthError('youtube_oauth_missing', true)
  }
  return {
    accessToken: json.access_token,
    expiresAtMs: opts.nowMs + (json.expires_in ?? 3600) * 1000,
  }
}
