import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { readMemberProjection } from '@/lib/canonical/canonical-server'

/**
 * PROJECTION CANONIQUE DU MEMBRE (Phase 3C) — vue CAVIARDÉE pour le membre connecté.
 *   GET /api/member/journey-projection
 *
 * Retourne UNIQUEMENT ce que le membre a le droit de voir : ses valeurs d'axes reconnues
 * (croissance / statut communautaire) + ses ministères actifs, en libellés FR. Aucune
 * donnée interne (review_state, justification, acteur, provenance) n'est exposée.
 * Identité résolue par la session membre → lecture bornée à SON propre profil.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const projection = await readMemberProjection(sp.uid)
    return NextResponse.json({ ok: true, data: projection })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
