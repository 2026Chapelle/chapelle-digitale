/**
 * CITADELLE INTELLIGENCE HUB — SEO · Search Console · Configuration (SERVER-ONLY)
 *
 * Chargement des credentials + résolution de la propriété GSC, TOUJOURS lu depuis
 * process.env au moment de la requête (jamais figé dans un bundle client).
 *
 * Convention d'environnement (accordée avec le connecteur GA4) :
 *  - Service-account JSON server-only : `GSC_SERVICE_ACCOUNT_JSON`, à défaut le
 *    JSON partagé `GOOGLE_SERVICE_ACCOUNT_JSON`.
 *  - Propriété explicite optionnelle : `GSC_SITE_URL`
 *    (ex. `sc-domain:chapelleduroyaume.org` ou `https://citadelle.chapelleduroyaume.org/`).
 *    Si absente → auto-détection via sites.list (cf. normalize.resolveSiteUrl).
 *
 * SÉCURITÉ : aucun secret n'est journalisé, renvoyé ni exposé. Le contenu du
 * service-account ne quitte jamais ce process serveur.
 */

import 'server-only'
import {
  loadServiceAccountFromEnv,
  type ServiceAccount,
} from '../google-auth'
import { PUBLIC_BASE_URL } from '../../seo/important-routes'

/** Portée LECTURE SEULE Search Console (aucune écriture, jamais). */
export const GSC_READONLY_SCOPE =
  'https://www.googleapis.com/auth/webmasters.readonly'

/**
 * Charge la service-account GSC depuis l'environnement (server-only).
 * Priorité à `GSC_SERVICE_ACCOUNT_JSON`, repli sur `GOOGLE_SERVICE_ACCOUNT_JSON`.
 * Renvoie null si aucune n'est présente/valide → état honnête NOT_CONFIGURED.
 */
export type EnvLike = Record<string, string | undefined>

export function loadGscServiceAccount(
  env: EnvLike = process.env,
): ServiceAccount | null {
  return (
    loadServiceAccountFromEnv(env.GSC_SERVICE_ACCOUNT_JSON) ??
    loadServiceAccountFromEnv(env.GOOGLE_SERVICE_ACCOUNT_JSON)
  )
}

/** Propriété explicitement configurée (identifiant public, non sensible), ou null. */
export function configuredSiteUrl(
  env: EnvLike = process.env,
): string | null {
  const raw = env.GSC_SITE_URL
  return raw && raw.trim() ? raw.trim() : null
}

/** Hôte public de Citadelle (ex. `citadelle.chapelleduroyaume.org`). */
export function citadelleHost(): string {
  try {
    return new URL(PUBLIC_BASE_URL).host
  } catch {
    return 'citadelle.chapelleduroyaume.org'
  }
}
