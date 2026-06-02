import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Diagnostic de production (back-office). Indique, SUR LE SERVEUR EN LIGNE :
 *   - quelles variables d'environnement sont présentes (booléens, jamais les valeurs) ;
 *   - si le mode démo est actif ;
 *   - si une requête réelle avec la service role fonctionne (sinon l'erreur exacte).
 *
 * Accès : cookie admin. URL : /api/admin/health
 * C'est l'outil pour confirmer la cause d'un « Invalid API key ».
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: { present: !!url, length: url?.length ?? 0 },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: { present: !!anon, length: anon?.length ?? 0 },
    SUPABASE_SERVICE_ROLE_KEY: { present: !!service, length: service?.length ?? 0 },
    ADMIN_ACCESS_CODE: { present: !!process.env.ADMIN_ACCESS_CODE },
    ADMIN_SESSION_TOKEN: { present: !!process.env.ADMIN_SESSION_TOKEN },
    NEXT_PUBLIC_APP_URL: { present: !!process.env.NEXT_PUBLIC_APP_URL },
    NODE_ENV: process.env.NODE_ENV,
  }

  const isDemo = !url || !anon

  // Test réel service role (lecture cms_pages).
  let serviceTest: any = { run: false }
  if (url && service) {
    try {
      const admin = createClient(url, service, { auth: { persistSession: false } })
      const { count, error } = await admin.from('cms_pages').select('*', { count: 'exact' }).limit(1)
      serviceTest = error
        ? { run: true, ok: false, error: error.message }
        : { run: true, ok: true, cms_pages_count: count ?? 0 }
    } catch (e: any) {
      serviceTest = { run: true, ok: false, error: e?.message || 'exception' }
    }
  } else {
    serviceTest = { run: false, reason: 'URL ou SERVICE_ROLE manquante' }
  }

  const verdict = !env.SUPABASE_SERVICE_ROLE_KEY.present
    ? '❌ SUPABASE_SERVICE_ROLE_KEY ABSENTE du serveur → ajoutez-la dans les variables PlanetHoster puis Restart.'
    : serviceTest.ok
      ? '✅ Service role OPÉRATIONNELLE — l\'admin doit fonctionner.'
      : `❌ Service role présente mais rejetée par Supabase : "${serviceTest.error}" → vérifiez la valeur (pas d\'espace/guillemets) et Restart.`

  return NextResponse.json({ ok: true, isDemo, env, serviceTest, verdict })
}
