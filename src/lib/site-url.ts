/**
 * URL canonique de la Citadelle.
 *
 * Sert à fabriquer des liens absolus fiables (confirmation d'email, redirections
 * d'auth) qui doivent TOUJOURS pointer vers le domaine public officiel, et jamais
 * vers le host d'hébergement interne (ex. node76-eu.n0c.com).
 *
 * Priorité : variable d'env NEXT_PUBLIC_SITE_URL (configurable par déploiement),
 * sinon le domaine de production de la Citadelle.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://citadelle.chapelleduroyaume.org'
).replace(/\/+$/, '')

/** Construit une URL absolue sur le domaine canonique à partir d'un chemin. */
export function siteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
