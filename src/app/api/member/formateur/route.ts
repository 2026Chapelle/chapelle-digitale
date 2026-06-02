import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { isFormateur, isAdmin } from '@/lib/roles'

/**
 * Données du dashboard FORMATEUR.
 *   GET /api/member/formateur → { formations, apprenants, progression_moyenne }
 *
 * - Admin/pasteur : voit toutes les formations.
 * - Formateur : voit ses formations (instructeur_id = lui).
 * Réservé aux rôles formateur. En démo : 401 (UI repli mock).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  if (!isFormateur(sp.role)) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })

  try {
    let fq = supabaseAdmin.from('formations').select('*').order('created_at', { ascending: false })
    if (!isAdmin(sp.role)) fq = fq.eq('instructeur_id', sp.uid)
    const { data: formations } = await fq

    const ids = (formations || []).map((f: any) => f.id)
    let inscriptions: any[] = []
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from('inscriptions_formation')
        .select('formation_id, progression, statut')
        .in('formation_id', ids)
      inscriptions = data || []
    }

    const apprenants = inscriptions.length
    const progression_moyenne = apprenants
      ? Math.round(inscriptions.reduce((s, i) => s + (i.progression || 0), 0) / apprenants)
      : 0
    const termines = inscriptions.filter((i) => i.statut === 'termine').length

    const enriched = (formations || []).map((f: any) => {
      const insc = inscriptions.filter((i) => i.formation_id === f.id)
      return {
        id: f.id, titre: f.titre, slug: f.slug, statut: f.statut, niveau: f.niveau,
        type: f.type, certifiant: f.certifiant, image_couverture: f.image_couverture,
        inscrits: insc.length,
        progression_moyenne: insc.length ? Math.round(insc.reduce((s, i) => s + (i.progression || 0), 0) / insc.length) : 0,
        termines: insc.filter((i) => i.statut === 'termine').length,
      }
    })

    return NextResponse.json({
      ok: true,
      data: {
        formations: enriched,
        totals: {
          formations: enriched.length,
          apprenants,
          progression_moyenne,
          termines,
          publiees: enriched.filter((f) => f.statut === 'publie').length,
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
