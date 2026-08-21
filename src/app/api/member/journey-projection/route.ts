import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { readMemberProjection } from '@/lib/canonical/canonical-server'
import { getIntegrationProgress } from '@/lib/formations/integration-progress-server'
import { computeMemberReadiness } from '@/lib/canonical/member-readiness'

/**
 * PROJECTION CANONIQUE DU MEMBRE (Phase 3C) — vue CAVIARDÉE pour le membre connecté.
 *   GET /api/member/journey-projection
 *
 * Retourne UNIQUEMENT ce que le membre a le droit de voir : ses valeurs d'axes reconnues
 * (croissance / statut communautaire) + ses ministères actifs, en libellés FR, PLUS un
 * état de préparation CAVIARDÉ (`readiness.pending`) qui active la chaîne dormante
 * COMPLÉTION → READY_FOR_REVIEW en LECTURE seule. Aucune donnée interne (review_state,
 * justification, acteur, provenance, valeur cible) n'est exposée. `readiness.pending`
 * n'exprime JAMAIS « promu » : READY_FOR_REVIEW ≠ PROMOTED.
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
    // Readiness EN LECTURE (aucune écriture) : le membre voit « en attente de
    // reconnaissance » sans jamais la valeur cible (pas d'auto-étiquetage).
    let readiness = { pending: false }
    try {
      const ip = await getIntegrationProgress(sp.uid)
      const r = computeMemberReadiness({
        current_statut: sp.profile?.membre_statut ?? null,
        parcours: ip.parcours.map((p) => ({ slug: p.slug, complete: p.complete, done: p.done, total: p.total })),
      })
      readiness = { pending: r.pending }
    } catch { /* readiness est non bloquante : la projection reste servie */ }
    return NextResponse.json({ ok: true, data: { ...projection, readiness } })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
