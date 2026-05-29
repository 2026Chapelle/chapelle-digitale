/**
 * GET /api/dashboard/summary
 *
 * Synthèse du tableau de bord membre.
 * - Mode démo : renvoie des données de démonstration (aucune base requise).
 * - Mode réel : lit la session (cookies) et agrège les vraies données Supabase.
 *
 * C'est le point de bascule mock → Supabase : le jour où `.env.local` est
 * renseigné, cette route renvoie automatiquement les vraies données, sans
 * changer le code client.
 */
import { NextResponse } from 'next/server'
import { getDashboardSummary } from '@/lib/queries'
import { createRouteClient } from '@/lib/supabase-server'
import { IS_DEMO_MODE } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // En réel, on passe le client Route Handler (lecture/écriture cookies OK).
    const summary = await getDashboardSummary(IS_DEMO_MODE ? undefined : createRouteClient())
    return NextResponse.json({ ok: true, demo: IS_DEMO_MODE, data: summary })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Impossible de charger la synthèse du dashboard.' },
      { status: 500 },
    )
  }
}
