import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { resolveIntegrationScope, type IntegrationScope } from '@/lib/integration-scope'

/**
 * Données du dashboard SUIVI D'INTÉGRATION — portée imposée CÔTÉ SERVEUR.
 *   GET /api/member/integration → { nouveaux, par_statut, totals, scope }
 *
 * Visibilité (RBAC) :
 *  - admin / super_admin          → tous les membres
 *  - responsable/pasteur national → uniquement son périmètre national (pays affectés)
 *  - responsable_integration      → uniquement SES membres (berger_id = lui)
 *  - autre                        → 403
 * Aucune fuite : le filtre est appliqué à TOUTES les requêtes (liste + comptages).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })

  // Affectations nationales actives (réutilise nation_responsables, comme /api/member/nation).
  const { data: assigns } = await supabaseAdmin.from('nation_responsables')
    .select('pays, actif').eq('user_id', sp.uid).eq('actif', true)
  const myPays = (assigns || []).map((a: any) => a.pays).filter(Boolean)

  const scope: IntegrationScope = resolveIntegrationScope({ role: sp.role, hasNationAssignment: myPays.length > 0 })
  if (scope === 'denied') return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
  if (scope === 'nation' && myPays.length === 0) {
    // Rôle national déclaré mais aucune nation affectée → rien (pas de fuite globale).
    return NextResponse.json({ ok: true, data: { nouveaux: [], par_statut: {}, totals: { membres: 0, a_integrer: 0, actifs: 0, disciples: 0 }, scope } })
  }

  // Applique la portée à n'importe quelle requête sur `profiles`.
  const scoped = (q: any) => {
    if (scope === 'nation') return q.in('pays', myPays)
    if (scope === 'assigned') return q.eq('berger_id', sp.uid)
    return q // 'all'
  }

  try {
    const { data: recents } = await scoped(
      supabaseAdmin.from('profiles')
        .select('id, prenom, nom, email, pays, ville, membre_statut, plateforme_principale, parcours_disciple_etape, date_inscription')
        .order('date_inscription', { ascending: false }).limit(50),
    )

    const { count: total } = await scoped(
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    )

    const statuts = ['visiteur', 'nouveau_membre', 'membre_actif', 'disciple', 'leader_cellule', 'berger', 'pasteur']
    const par_statut: Record<string, number> = {}
    await Promise.all(statuts.map(async (s) => {
      const { count } = await scoped(
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('membre_statut', s),
      )
      par_statut[s] = count || 0
    }))

    const aIntegrer = (par_statut['visiteur'] || 0) + (par_statut['nouveau_membre'] || 0)

    return NextResponse.json({
      ok: true,
      data: {
        nouveaux: recents || [],
        par_statut,
        totals: {
          membres: total || 0,
          a_integrer: aIntegrer,
          actifs: par_statut['membre_actif'] || 0,
          disciples: par_statut['disciple'] || 0,
        },
        scope,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
