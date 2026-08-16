import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

/**
 * Mode démo : actif tant que Supabase n'est pas configuré.
 * Dans ce mode, l'app fonctionne entièrement sur des données fictives (lib/mock)
 * et l'auth simule un utilisateur. Voir SUPABASE_SETUP.md pour activer le réel.
 */
export const IS_DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Client navigateur (clé publique anon, soumis aux RLS).
 * NB : non typé via `<Database>` pour l'instant — exécuter `npm run db:generate`
 * une fois Supabase configuré pour activer le typage fort officiel.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Client admin (service role) — BYPASS les RLS.
 * ⚠️ À n'utiliser QUE côté serveur (route handlers, server actions, cron).
 * Ne jamais importer dans un composant client.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Client de LECTURE CMS (service role) qui force `cache: 'no-store'` sur chaque
 * requête HTTP PostgREST. Objectif : contourner le Data Cache de fetch de
 * Next.js afin que les listes CMS publiques (ex. articles publiés) reflètent
 * TOUJOURS l'état live de la base — sans redéploiement ni revalidation, et sans
 * transformer en dynamique les pages qui, elles, s'appuient sur l'ISR
 * (l'accueil garde son `revalidate`). Réservé aux lectures ciblées via cms.ts
 * qui passent `noStore: true`.
 */
export const supabaseCmsRead = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    fetch: ((input: any, init?: any) => fetch(input, { ...(init || {}), cache: 'no-store' })) as typeof fetch,
  },
})
