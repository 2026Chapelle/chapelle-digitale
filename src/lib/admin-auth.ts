import type { NextRequest } from 'next/server'

/**
 * Authentification back-office — source UNIQUE du jeton de session admin.
 *
 * Sécurité :
 *  - En PRODUCTION, AUCUN repli sur une valeur connue. Si ADMIN_SESSION_TOKEN
 *    n'est pas défini, le jeton est vide et toute requête admin est refusée
 *    (impossible de forger le cookie avec un secret deviné).
 *  - La comparaison rejette explicitement les valeurs vides (un cookie
 *    `cier_admin=` ne doit jamais passer la garde).
 *
 * Toute route /api/admin/* et le middleware utilisent ces helpers — ne plus
 * redéclarer le jeton localement.
 */
const IS_PROD = process.env.NODE_ENV === 'production'

export const ADMIN_SESSION_TOKEN =
  process.env.ADMIN_SESSION_TOKEN || (IS_PROD ? '' : 'cier-admin-session-2026')

/** Le back-office est-il configurable (jeton présent) ? */
export const ADMIN_CONFIGURED = !!ADMIN_SESSION_TOKEN

/** Vrai si la requête porte le cookie de session admin valide. */
export function isAdminRequest(req: NextRequest): boolean {
  if (!ADMIN_SESSION_TOKEN) return false
  const v = req.cookies.get('cier_admin')?.value
  return !!v && v === ADMIN_SESSION_TOKEN
}

/** Variante pour un jeton déjà extrait (ex. middleware Edge). */
export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!ADMIN_SESSION_TOKEN) return false
  return !!token && token === ADMIN_SESSION_TOKEN
}
