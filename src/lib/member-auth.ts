/**
 * Helper serveur : identité + rôle (Route Handlers).
 *
 * Contrat :
 *  1. client cookies Route Handler (`createRouteClient`) ;
 *  2. `auth.getUser()` vérifié côté serveur (pas un user_id client) ;
 *  3. profil chargé ensuite via `supabaseAdmin` (service_role serveur uniquement).
 *
 * Utilisé par /api/member/* et l’acteur Lot 5 (admin ERP).
 * Renvoie null en démo ou si non authentifié.
 */
import { createRouteClient } from '@/lib/supabase-server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

export interface SessionProfile {
  uid: string
  role: string
  profile: Record<string, any>
  email: string | null
}

/**
 * Identité Route Handler stricte : utilisateur vérifié + ligne `profiles` obligatoire.
 * Pas de repli sur user_metadata seul pour l’acteur ERP.
 */
export async function getVerifiedRouteProfile(): Promise<SessionProfile | null> {
  if (IS_DEMO_MODE) return null
  try {
    const supabase = createRouteClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user?.id) return null

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !data || typeof (data as { id?: unknown }).id !== 'string') {
      return null
    }

    const row = data as Record<string, unknown>
    const email =
      typeof row.email === 'string'
        ? row.email
        : typeof user.email === 'string'
          ? user.email
          : null

    return {
      uid: user.id,
      role: (typeof row.role === 'string' && row.role) || 'membre',
      profile: row,
      email,
    }
  } catch {
    return null
  }
}

/**
 * Variante tolérante (espace membre) : si le profil SQL est absent, recompose
 * un profil minimal depuis l’utilisateur auth (comportement historique).
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (IS_DEMO_MODE) return null
  try {
    const supabase = createRouteClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()
    const profile = (data as Record<string, any>) || { id: user.id, email: user.email }
    return {
      uid: user.id,
      role: (data?.role as string) || (user.user_metadata as any)?.role || 'membre',
      profile,
      email:
        typeof profile.email === 'string'
          ? profile.email
          : typeof user.email === 'string'
            ? user.email
            : null,
    }
  } catch {
    return null
  }
}
