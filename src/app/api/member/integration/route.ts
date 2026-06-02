import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { isIntegration } from '@/lib/roles'

/**
 * Données du dashboard RESPONSABLE INTÉGRATION.
 *   GET /api/member/integration → { nouveaux, par_statut, totals }
 *
 * Suit l'arrivée des nouveaux membres (table profiles) et leur statut
 * d'intégration. Réservé aux rôles d'intégration. En démo : 401 (UI repli mock).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  if (!isIntegration(sp.role)) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })

  try {
    const { data: recents } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, nom, email, pays, ville, membre_statut, plateforme_principale, parcours_disciple_etape, date_inscription')
      .order('date_inscription', { ascending: false })
      .limit(50)

    const { count: total } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    // Répartition par statut d'intégration.
    const statuts = ['visiteur', 'nouveau_membre', 'membre_actif', 'disciple', 'leader_cellule', 'berger', 'pasteur']
    const par_statut: Record<string, number> = {}
    await Promise.all(statuts.map(async (s) => {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('membre_statut', s)
      par_statut[s] = count || 0
    }))

    const nouveaux = recents || []
    const aIntegrer = (par_statut['visiteur'] || 0) + (par_statut['nouveau_membre'] || 0)

    return NextResponse.json({
      ok: true,
      data: {
        nouveaux,
        par_statut,
        totals: {
          membres: total || 0,
          a_integrer: aIntegrer,
          actifs: par_statut['membre_actif'] || 0,
          disciples: par_statut['disciple'] || 0,
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
