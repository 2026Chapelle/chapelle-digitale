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
import { createClient } from '@supabase/supabase-js'
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

let publicServerClient: ReturnType<typeof createClient<any>> | null = null

/** Public anon client for server-side requests that do not depend on a user identity. */
export function getPublicServerClient() {
  if (!publicServerClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
    publicServerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return publicServerClient
}

type VerifiedUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

type AuthClient = {
  auth: {
    getUser: () => Promise<{
      data?: { user?: VerifiedUser | null }
      error?: unknown
    }>
  }
}

/** Identité serveur unique : seule une réponse sans erreur de auth.getUser() est fiable. */
export async function getVerifiedUser(client: AuthClient): Promise<VerifiedUser | null> {
  try {
    const { data, error } = await client.auth.getUser()
    if (error || !data?.user?.id) return null
    return data.user
  } catch {
    return null
  }
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
  const user = await getVerifiedUser(supabase)
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
}
