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
import { IS_DEMO_MODE, supabase } from '@/lib/supabase'

type BrowserClient = ReturnType<typeof createClientComponentClient>

let _client: BrowserClient | null = null

/** Singleton du client navigateur cookie-based, ou null en mode démo. */
export function getBrowserClient(): BrowserClient | null {
  if (IS_DEMO_MODE) return null
  if (!_client) _client = createClientComponentClient()
  return _client
}

/**
 * PODCAST-9 / D2 — Client à utiliser pour TOUTE opération MEMBRE soumise aux RLS
 * (audio_progress, playlists personnelles, entitlement Premium, signaux perso…).
 *
 * Contexte du défaut : le client de `lib/supabase.ts` stocke la session dans le
 * localStorage, alors que l'authentification réelle (login + AuthProvider) passe
 * par le client COOKIE (`getBrowserClient`). Un composant qui lit/écrit une donnée
 * member-owned via le client localStorage repart donc `role=anon` après un
 * rechargement direct → RLS répond 401 (progression non écrite, « Continuer
 * l'écoute » cassé, playlists cassées, Premium non affiché…).
 *
 * Ce helper renvoie le client COOKIE porteur de la vraie session (même source que
 * le login), avec repli sur le client anon uniquement en mode démo (où les
 * opérations membre sont de toute façon désactivées côté UI). La sécurité reste
 * l'authentification réelle + les RLS : aucun bypass, aucune clé service_role.
 */
export function getMemberClient(): typeof supabase {
  // Le client cookie et le client anon partagent la même API PostgREST/auth ;
  // on unifie le type sur `typeof supabase` (accepté par toutes les I/O membre)
  // pour éviter une union non appelable côté `.from()`.
  const client = getBrowserClient()
  return (client as unknown as typeof supabase) ?? supabase
}
