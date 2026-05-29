/**
 * CIER Platform — Clients Supabase côté serveur (App Router)
 *
 * À utiliser dans les Server Components, Route Handlers et Server Actions.
 * S'appuie sur @supabase/auth-helpers-nextjs (déjà installé) pour lire/écrire
 * la session via les cookies — indispensable pour l'auth réelle SSR.
 *
 * En mode démo (Supabase non configuré), `getServerSession` / `getServerProfile`
 * renvoient null : les pages doivent alors retomber sur lib/mock (voir lib/queries.ts).
 */
import { cookies } from 'next/headers'
import {
  createServerComponentClient,
  createRouteHandlerClient,
} from '@supabase/auth-helpers-nextjs'
import type { ProfileRow } from '@/types/supabase'
import { IS_DEMO_MODE } from '@/lib/supabase'

/** Client lié à la session de l'utilisateur, pour Server Components (lecture). */
export function createServerClient() {
  return createServerComponentClient({ cookies })
}

/** Client pour Route Handlers / Server Actions (lecture + écriture cookies). */
export function createRouteClient() {
  return createRouteHandlerClient({ cookies })
}

/** Session courante côté serveur, ou null (démo ou non connecté). */
export async function getServerSession() {
  if (IS_DEMO_MODE) return null
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Profil enrichi de l'utilisateur connecté, ou null. */
export async function getServerProfile(): Promise<ProfileRow | null> {
  if (IS_DEMO_MODE) return null
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
}
