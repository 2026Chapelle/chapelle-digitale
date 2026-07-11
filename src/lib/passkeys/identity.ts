/**
 * Contexte administrateur NOMINATIF (périmètre passkeys uniquement).
 *
 * Portée documentée : ce helper reconstruit une identité admin à partir de la
 * SESSION SUPABASE (cookies auth-helpers), indépendamment du cookie partagé
 * `cier_admin`. Il ne modifie ni le middleware ni l'auth legacy : il sert
 * exclusivement aux routes passkeys (enrôlement / gestion / révocation), qui
 * exigent une identité et une réauthentification récentes vérifiables.
 *
 * `lastSignInAtMs` = GoTrue `last_sign_in_at` (connexion explicite par mot de
 * passe), lu via `auth.getUser()` — jamais du client.
 */
import { createRouteClient } from '@/lib/supabase-server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

export interface NominativeAdmin {
  uid: string
  email: string | null
  role: string
  lastSignInAtMs: number | null
}

export async function getNominativeAdmin(): Promise<NominativeAdmin | null> {
  if (IS_DEMO_MODE) return null
  try {
    const supabase = createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    const parsed = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN
    return {
      uid: user.id,
      email: user.email ?? null,
      role: (data?.role as string) || (user.user_metadata as any)?.role || 'membre',
      lastSignInAtMs: Number.isFinite(parsed) ? parsed : null,
    }
  } catch {
    return null
  }
}
