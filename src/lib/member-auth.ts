/**
 * Helper serveur : identité + rôle du membre connecté (espace privé).
 *
 * Vérifie la session Supabase (cookies) puis lit le profil via la service role.
 * Utilisé par les routes /api/member/* pour appliquer le RBAC côté serveur.
 *
 * Renvoie null en démo ou si non authentifié.
 */
import { createRouteClient } from '@/lib/supabase-server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

export interface SessionProfile {
  uid: string
  role: string
  profile: Record<string, any>
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (IS_DEMO_MODE) return null
  try {
    const supabase = createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()
    return {
      uid: user.id,
      role: (data?.role as string) || (user.user_metadata as any)?.role || 'membre',
      profile: data || { id: user.id, email: user.email },
    }
  } catch {
    return null
  }
}
