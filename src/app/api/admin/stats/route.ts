import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Statistiques RÉELLES de la plateforme (back-office).
 *   GET /api/admin/stats
 * Compte les vrais enregistrements Supabase : membres (total + par pays + par
 * statut), et volumes de contenu/engagement. Aucune donnée inventée — 0 si vide.
 * Garde : cookie admin. Lecture via service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'

async function countOf(table: string): Promise<number> {
  try {
    const { count } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    return count ?? 0
  } catch { return 0 }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  try {
    // Membres : on lit pays + membre_statut pour des agrégats exacts.
    const { data: profs } = await supabaseAdmin.from('profiles').select('pays, membre_statut')
    const rows = profs || []
    const total = rows.length

    const paysMap: Record<string, number> = {}
    const statutMap: Record<string, number> = {}
    for (const r of rows as any[]) {
      const p = (r.pays && String(r.pays).trim()) || 'Non renseigné'
      paysMap[p] = (paysMap[p] || 0) + 1
      const s = r.membre_statut || 'visiteur'
      statutMap[s] = (statutMap[s] || 0) + 1
    }
    const par_pays = Object.entries(paysMap).map(([pays, n]) => ({ pays, n })).sort((a, b) => b.n - a.n)
    const par_statut = Object.entries(statutMap).map(([statut, n]) => ({ statut, n })).sort((a, b) => b.n - a.n)

    const [articles, pages, medias, lives, events, formations, prieres, messages, newsletter, adhesions, dons] = await Promise.all([
      countOf('cms_articles'), countOf('cms_pages'), countOf('cms_media'), countOf('cms_lives'),
      countOf('cms_events'), countOf('formations'), countOf('priere_demandes'),
      countOf('contact_messages'), countOf('newsletter_subscribers'), countOf('group_join_requests'), countOf('dons'),
    ])

    // LMS : inscriptions, progression, complétion, certificats, abandons.
    const { data: insc } = await supabaseAdmin.from('inscriptions_formation').select('progression, statut')
    const inscRows = insc || []
    const inscrits = inscRows.length
    const progression_moyenne = inscrits ? Math.round(inscRows.reduce((s: number, i: any) => s + (i.progression || 0), 0) / inscrits) : 0
    const termines = inscRows.filter((i: any) => i.statut === 'termine').length
    const abandons = inscRows.filter((i: any) => i.statut === 'abandonne').length
    const taux_completion = inscrits ? Math.round((termines / inscrits) * 100) : 0
    const certificats = await countOf('certificats')

    return NextResponse.json({
      ok: true,
      membres: { total, par_pays, par_statut, pays_distincts: par_pays.filter((p) => p.pays !== 'Non renseigné').length },
      contenus: { articles, pages, medias, lives, events, formations },
      engagement: { prieres, messages, newsletter, adhesions, dons },
      lms: { inscrits, progression_moyenne, taux_completion, termines, abandons, certificats },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
