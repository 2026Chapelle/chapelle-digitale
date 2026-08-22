/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Connecteur YouTube · Config (SERVER-ONLY)
 *
 * Lecture des identifiants OAuth 2.0 (flux refresh-token du PROPRIÉTAIRE de la
 * chaîne) et de l'identifiant de chaîne depuis l'environnement serveur. Contrairement
 * à Search Console / GA4, YouTube Analytics (temps de visionnage, abonnés, analytics
 * par vidéo) exige un CONSENTEMENT OAuth utilisateur du propriétaire : un compte de
 * service ne peut pas lire l'analytics d'une chaîne. On n'utilise donc JAMAIS le
 * compte de service Google comme substitut.
 *
 * SÉCURITÉ ABSOLUE :
 *  - `import 'server-only'` : jamais côté client, jamais de NEXT_PUBLIC.
 *  - Aucun secret (client_secret, refresh_token, access_token) n'est journalisé,
 *    renvoyé, ni exposé. Seul le handle/canal PUBLIC peut apparaître dans un statut.
 *  - Aucune dépendance npm ajoutée : `crypto`/`fetch` natifs uniquement.
 *
 * Convention d'ENV (server-only, documentée dans YOUTUBE_SETUP.md) :
 *  - `YOUTUBE_OAUTH_CLIENT_ID`      (requis)
 *  - `YOUTUBE_OAUTH_CLIENT_SECRET`  (requis)
 *  - `YOUTUBE_OAUTH_REFRESH_TOKEN`  (requis — obtenu par le propriétaire @ChapelleRoyaleTV)
 *  - `YOUTUBE_CHANNEL_ID`           (optionnel — sinon résolu depuis le handle canonique)
 */

import 'server-only'

/** Scopes LECTURE SEULE — jamais d'écriture, jamais de gestion de contenu. */
export const YOUTUBE_DATA_READONLY_SCOPE =
  'https://www.googleapis.com/auth/youtube.readonly'
export const YOUTUBE_ANALYTICS_READONLY_SCOPE =
  'https://www.googleapis.com/auth/yt-analytics.readonly'

/**
 * Chaîne CANONIQUE — source de vérité confirmée par Doxa. On ne choisit JAMAIS une
 * autre chaîne automatiquement : en cas d'ambiguïté (plusieurs chaînes, handle qui
 * ne correspond pas), on refuse de connecter le mauvais actif.
 */
export const CANONICAL_YOUTUBE_HANDLE = '@ChapelleRoyaleTV'
export const CANONICAL_YOUTUBE_URL =
  'https://www.youtube.com/@ChapelleRoyaleTV'

/**
 * Normalise un handle YouTube pour comparaison : minuscules, sans « @ » de tête,
 * sans espaces. Ex. « @ChapelleRoyaleTV », « ChapelleRoyaleTV », « chapelleroyaletv »
 * → « chapelleroyaletv ». Renvoie '' si vide.
 */
export function normalizeHandle(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw.trim().replace(/^@+/, '').toLowerCase()
}

/** Handle canonique sous forme d'API (`@ChapelleRoyaleTV`, avec « @ »). */
export function canonicalHandleForApi(): string {
  return CANONICAL_YOUTUBE_HANDLE
}

/** Configuration OAuth YouTube résolue côté serveur (jamais exposée telle quelle). */
export interface YouTubeConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  /** Optionnel : identifiant de chaîne (UC…). Sinon résolu via le handle. */
  channelId: string | null
}

/**
 * Charge la configuration YouTube depuis `env`. Renvoie null si l'un des trois
 * identifiants OAuth requis est absent — pour permettre l'état honnête AUTH_REQUIRED.
 * Ne lève jamais, n'expose jamais les valeurs.
 */
export function loadYouTubeConfig(
  env: NodeJS.ProcessEnv = process.env,
): YouTubeConfig | null {
  const clientId = (env.YOUTUBE_OAUTH_CLIENT_ID ?? '').trim()
  const clientSecret = (env.YOUTUBE_OAUTH_CLIENT_SECRET ?? '').trim()
  const refreshToken = (env.YOUTUBE_OAUTH_REFRESH_TOKEN ?? '').trim()
  if (!clientId || !clientSecret || !refreshToken) return null
  const channelIdRaw = (env.YOUTUBE_CHANNEL_ID ?? '').trim()
  return {
    clientId,
    clientSecret,
    refreshToken,
    channelId: channelIdRaw || null,
  }
}

/** True si au moins un identifiant OAuth est présent (jamais son contenu). */
export function hasAnyYouTubeCredential(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    (env.YOUTUBE_OAUTH_CLIENT_ID ?? '').trim() ||
      (env.YOUTUBE_OAUTH_CLIENT_SECRET ?? '').trim() ||
      (env.YOUTUBE_OAUTH_REFRESH_TOKEN ?? '').trim(),
  )
}
