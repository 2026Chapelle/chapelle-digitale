import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { getIntegrationProgress } from '@/lib/formations/integration-progress-server'

/**
 * Progression RÉELLE du Programme d'Intégration pour le membre connecté.
 * Source unique : dashboard (progression/parcours en cours/prochaine étape/statut)
 * ET déblocage de l'Académie (integration_complete).
 *
 *   GET /api/member/integration-progression
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const prog = await getIntegrationProgress(sp.uid)
    return NextResponse.json({
      ok: true,
      data: {
        parcours: prog.parcours,
        overall_pct: prog.overall_pct,
        current_slug: prog.current_slug,
        next_slug: prog.next_slug,
        integration_complete: prog.integration_complete,
        membre_statut: sp.profile?.membre_statut ?? 'visiteur',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
