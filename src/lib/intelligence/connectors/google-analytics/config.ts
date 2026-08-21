/**
 * CITADELLE INTELLIGENCE HUB — SEO · Connecteur GA4 · Configuration (SERVER-ONLY)
 *
 * Lecture des credentials et de l'identifiant de propriété GA4 depuis
 * l'environnement serveur. AUCUN secret n'est journalisé, renvoyé, ni inliné
 * côté client (jamais de NEXT_PUBLIC). Convention d'ENV IDENTIQUE au connecteur
 * Search Console :
 *  - Service-account JSON : `GA4_SERVICE_ACCOUNT_JSON`, sinon repli sur la clé
 *    partagée `GOOGLE_SERVICE_ACCOUNT_JSON`.
 *  - Propriété GA4 : `GA4_PROPERTY_ID` (numérique, ex. `123456789` ou déjà
 *    préfixé `properties/123456789`). REQUISE. Jamais inventée.
 */

import 'server-only'
import {
  loadServiceAccountFromEnv,
  type ServiceAccount,
} from '../google-auth'

/** Scope Google Analytics Data API — LECTURE SEULE, jamais d'écriture. */
export const GA4_READONLY_SCOPE =
  'https://www.googleapis.com/auth/analytics.readonly'

/**
 * Normalise un identifiant de propriété GA4 vers la forme canonique
 * `properties/<numeric>`. Accepte `123456789`, `properties/123456789`, avec
 * espaces superflus. Renvoie null si vide ou non numérique (jamais d'invention).
 */
export function normalizeGa4Property(raw: string | undefined | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withoutPrefix = trimmed.startsWith('properties/')
    ? trimmed.slice('properties/'.length)
    : trimmed
  const digits = withoutPrefix.trim()
  if (!/^\d+$/.test(digits)) return null
  return `properties/${digits}`
}

/** Configuration GA4 résolue côté serveur (jamais exposée telle quelle). */
export interface Ga4Config {
  serviceAccount: ServiceAccount
  /** Forme canonique `properties/<numeric>` (identifiant PUBLIC, non secret). */
  property: string
}

/**
 * Charge la configuration GA4 depuis `env`. Renvoie null si les credentials ou
 * l'identifiant de propriété sont absents/invalides — pour permettre l'état
 * honnête NOT_CONFIGURED. Ne lève jamais.
 */
export function loadGa4Config(
  env: NodeJS.ProcessEnv = process.env,
): Ga4Config | null {
  const rawJson = env.GA4_SERVICE_ACCOUNT_JSON || env.GOOGLE_SERVICE_ACCOUNT_JSON
  const serviceAccount = loadServiceAccountFromEnv(rawJson)
  if (!serviceAccount) return null
  const property = normalizeGa4Property(env.GA4_PROPERTY_ID)
  if (!property) return null
  return { serviceAccount, property }
}

/** True si des credentials service-account sont présents (jamais leur contenu). */
export function hasGa4Credentials(env: NodeJS.ProcessEnv = process.env): boolean {
  const rawJson = env.GA4_SERVICE_ACCOUNT_JSON || env.GOOGLE_SERVICE_ACCOUNT_JSON
  return loadServiceAccountFromEnv(rawJson) !== null
}
