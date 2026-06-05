import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { classifyActivity, repartition, bucketGrowth } from '@/lib/pastoral/metrics'

/**
 * Tableau global pastoral — KPIs, répartitions, courbes de croissance.
 *   GET /api/admin/pastoral/overview
 * Garde : cookie admin. Service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn() } catch { return fb } }

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const now = Date.now()
    const { data: profs } = await supabaseAdmin.from('profiles')
      .select('date_inscription, derniere_connexion, pays, ville, membre_statut, statut, archived_at')
      .order('date_inscription', { ascending: false }).range(0, 4999)
    const all = profs || []
    const vivants = all.filter((p: any) => !p.archived_at)

    const D = 86_400_000
    const nouveaux_7j = all.filter((p: any) => p.date_inscription && now - new Date(p.date_inscription).getTime() <= 7 * D).length
    const nouveaux_30j = all.filter((p: any) => p.date_inscription && now - new Date(p.date_inscription).getTime() <= 30 * D).length

    let actifs = 0, inactifs = 0, jamais = 0
    for (const p of vivants) {
      const c = classifyActivity(p.derniere_connexion, now)
      if (c === 'actif') actifs++; else if (c === 'inactif') inactifs++; else jamais++
    }

    const par_statut = repartition(vivants, (p: any) => p.membre_statut)
    const par_pays = repartition(vivants, (p: any) => p.pays).slice(0, 12)
    const par_ville = repartition(vivants, (p: any) => p.ville).slice(0, 12)
    const croissance = bucketGrowth(all.map((p: any) => p.date_inscription), 'month').slice(-12)

    // Progression intégration moyenne + Académie débloquée (réel)
    const integration_moyenne = await safe(async () => {
      const { data: parc } = await supabaseAdmin.from('parcours').select('id').eq('slug', 'programme-integration').maybeSingle()
      if (!parc?.id) return 0
      const { data: pf } = await supabaseAdmin.from('parcours_formations').select('formation_id').eq('parcours_id', parc.id)
      const ids = (pf || []).map((r: any) => r.formation_id)
      if (!ids.length) return 0
      const { data: insc } = await supabaseAdmin.from('inscriptions_formation').select('progression').in('formation_id', ids)
      const arr = (insc || []).map((i: any) => Number(i.progression || 0))
      return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
    }, 0)
    const academie_debloquee = await safe(async () => {
      const { count } = await supabaseAdmin.from('certificats').select('*', { count: 'exact', head: true }).eq('type', 'integration')
      return count ?? 0
    }, 0)

    // Indicateurs globaux : événements, prières, dons
    const evenements = await safe(async () => {
      const { count } = await supabaseAdmin.from('event_registrations').select('*', { count: 'exact', head: true })
      return count ?? 0
    }, 0)
    const prieres = await safe(async () => {
      const { count } = await supabaseAdmin.from('priere_demandes').select('*', { count: 'exact', head: true })
      return count ?? 0
    }, 0)
    const dons = await safe(async () => {
      const { data } = await supabaseAdmin.from('giving_transactions_log').select('amount, currency').not('amount', 'is', null)
      const rows = (data || []).filter((x: any) => Number(x.amount) > 0)
      return { count: rows.length, total: Math.round(rows.reduce((s: number, x: any) => s + Number(x.amount || 0), 0)), currency: rows[0]?.currency || 'EUR' }
    }, { count: 0, total: 0, currency: 'EUR' })

    return NextResponse.json({
      ok: true,
      data: {
        total: all.length,
        nouveaux_7j, nouveaux_30j,
        actifs, inactifs, jamais,
        par_statut, par_pays, par_ville, croissance,
        integration_moyenne, academie_debloquee,
        evenements, prieres, dons,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
