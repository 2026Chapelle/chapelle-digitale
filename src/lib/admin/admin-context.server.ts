/**
 * AdminContext — wrapper SERVEUR (V2.5-C-②-B), lecture seule.
 *
 * Rassemble les entrées (garde legacy + profil Supabase éventuel) et délègue au cœur PUR
 * `buildAdminContext`. NON BLOQUANT, NON RÉGRESSIF : n'écrit rien, ne modifie ni le cookie
 * ni le middleware ni le login. Réutilise les briques existantes en LECTURE :
 *   - `isValidAdminToken` / `isAdminRequest` (garde admin existante, inchangée)
 *   - `getServerProfile()` (profil réel si une session Supabase existe ; null sinon)
 *
 * Aucun appel à ce helper n'est encore branché sur une route/page : brique pour C-②-C+.
 */
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { isAdminRequest, isValidAdminToken } from '@/lib/admin-auth'
import { getServerProfile } from '@/lib/supabase-server'
import { buildAdminContext, profileToAdminInput, type AdminContext } from './admin-context'

/** Garde legacy : via NextRequest (route handler) ou via le cookie courant (server component). */
function readLegacyAuth(req?: NextRequest): boolean {
  if (req) return isAdminRequest(req)
  try {
    return isValidAdminToken(cookies().get('cier_admin')?.value)
  } catch {
    return false
  }
}

/**
 * Résout le contexte admin (lecture seule). `req` optionnel : fourni dans un route handler,
 * omis dans un Server Component (on lit alors le cookie via next/headers).
 */
export async function resolveAdminContext(req?: NextRequest): Promise<AdminContext> {
  const legacyAuthenticated = readLegacyAuth(req)

  let profile = null
  try {
    const p = await getServerProfile()
    profile = profileToAdminInput(p as Record<string, unknown> | null)
  } catch {
    // getServerProfile ne doit jamais faire échouer la résolution : fallback silencieux.
    profile = null
  }

  return buildAdminContext({ legacyAuthenticated, profile })
}
