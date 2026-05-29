'use client'
/**
 * Client Supabase navigateur basé sur les COOKIES (auth-helpers).
 *
 * Contrairement au client localStorage de lib/supabase.ts, celui-ci écrit la
 * session dans des cookies lisibles côté serveur (Server Components / middleware).
 * C'est lui qu'il faut utiliser pour TOUTE opération d'authentification réelle.
 *
 * Renvoie `null` en mode démo (aucune variable Supabase) pour éviter de lancer
 * une erreur au montage.
 */
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { IS_DEMO_MODE } from '@/lib/supabase'

type BrowserClient = ReturnType<typeof createClientComponentClient>

let _client: BrowserClient | null = null

/** Singleton du client navigateur cookie-based, ou null en mode démo. */
export function getBrowserClient(): BrowserClient | null {
  if (IS_DEMO_MODE) return null
  if (!_client) _client = createClientComponentClient()
  return _client
}
