/**
 * Mode démo : actif tant que Supabase n'est pas configuré.
 * Dans ce mode, l'app fonctionne entièrement sur des données fictives (lib/mock)
 * et l'auth simule un utilisateur. Voir SUPABASE_SETUP.md pour activer le réel.
 */
const missingPublicSupabase = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const explicitDemoMode = process.env.CITADELLE_DEMO_MODE === '1'
if (process.env.NODE_ENV === 'production' && missingPublicSupabase) {
  throw new Error('CITADELLE_PROD_ENV_GUARD=FAIL MISSING=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY')
}
export const IS_DEMO_MODE = explicitDemoMode || (process.env.NODE_ENV !== 'production' && missingPublicSupabase)
