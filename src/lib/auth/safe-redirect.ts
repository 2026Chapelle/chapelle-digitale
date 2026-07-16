/**
 * Redirections post-auth — allowlist stricte (anti open-redirect).
 * Chemins internes uniquement ; jamais d’URL absolue externe.
 */

/** Destinations autorisées après callback OAuth / recovery. */
export const AUTH_CALLBACK_NEXT_ALLOWLIST = [
  '/member/dashboard',
  '/member/dashboard/parametres',
  '/admin/update-password',
  '/admin/dashboard',
  '/admin/parametres',
  '/admin/login',
] as const

export type AuthCallbackNext = (typeof AUTH_CALLBACK_NEXT_ALLOWLIST)[number]

export function isAllowedAuthNext(path: string | null | undefined): path is AuthCallbackNext {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false
  if (path.includes('://') || path.includes('..')) return false
  return (AUTH_CALLBACK_NEXT_ALLOWLIST as readonly string[]).includes(path)
}

/**
 * Sanitize `next` query param. Fallback si hors allowlist.
 */
export function sanitizeAuthNext(
  nextParam: string | null | undefined,
  fallback: AuthCallbackNext = '/member/dashboard',
): AuthCallbackNext {
  if (isAllowedAuthNext(nextParam)) return nextParam
  return fallback
}

/**
 * Origine de redirection après callback.
 * Localhost conserve l’origine de la requête ; sinon domaine canonique SITE_URL.
 */
export function resolveAuthRedirectOrigin(requestUrl: string, siteUrl: string): string {
  try {
    const u = new URL(requestUrl)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return u.origin
    }
  } catch {
    /* ignore */
  }
  return siteUrl.replace(/\/+$/, '')
}
