import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getNewcomerAdminStats, computeNewcomerStats } from '@/lib/pastoral/newcomer-intakes-server'

/**
 * Stats « Nouveau Venu » pour le cockpit pastoral (V2.2-A) — lecture seule.
 *   GET /api/admin/pastoral/newcomer-stats → agrégats réels de public.newcomer_intakes
 *
 * Garde : cookie admin (isAdminRequest). Service role côté serveur (lib dédiée).
 * N'écrit rien. Distinct de /api/admin/newcomer-intakes (qui liste/patch les lignes).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  // En mode démo (Supabase non configuré) : renvoyer des stats vides propres (zéros).
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: computeNewcomerStats([]) })
  try {
    const data = await getNewcomerAdminStats()
    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
