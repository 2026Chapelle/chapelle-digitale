import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Tableau de bord de GOUVERNEMENT PASTORAL — agrégats réels + alertes intelligentes.
 *   GET /api/admin/gouvernance
 * Croissance · Fidélité · Formation · Prière · Dons · Témoignages · Santé spirituelle.
 * Chaque source est défensive (try/catch → valeur neutre). Zéro donnée inventée.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'

async function countWhere(table: string, build?: (q: any) => any): Promise<number> {
  try {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    if (build) q = build(q)
    const { count } = await q
    return count ?? 0
  } catch { return 0 }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  try {
    // ── Croissance (profiles = base membre de l'app) ──
    let fideles = 0, nouveaux30 = 0
    const parStatut: Record<string, number> = {}
    const faibleEngagement: { nom: string; score: number }[] = []
    try {
      const { data } = await supabaseAdmin.from('profiles')
        .select('prenom, nom, membre_statut, score_engagement, created_at')
      const rows = (data || []) as any[]
      fideles = rows.length
      const since = Date.now() - 30 * 24 * 3600 * 1000
      for (const r of rows) {
        const s = r.membre_statut || 'visiteur'
        parStatut[s] = (parStatut[s] || 0) + 1
        if (r.created_at && new Date(r.created_at).getTime() >= since) nouveaux30++
        if (typeof r.score_engagement === 'number' && r.score_engagement < 20) {
          faibleEngagement.push({ nom: `${r.prenom ?? ''} ${r.nom ?? ''}`.trim() || '—', score: r.score_engagement })
        }
      }
    } catch { /* */ }

    // ── Tunnel d'intégration (chapelle) ──
    let funnel: any = null
    try {
      const { data } = await supabaseAdmin.schema('chapelle').rpc('integration_funnel')
      funnel = data
    } catch { /* */ }

    // ── Prière (workflow) ──
    const prierePar: Record<string, number> = {}
    let priereTotal = 0, priereNonAssignees = 0, priereExaucees = 0
    try {
      const { data } = await supabaseAdmin.from('priere_demandes').select('statut, assigned_to')
      const rows = (data || []) as any[]
      priereTotal = rows.length
      for (const r of rows) {
        const s = r.statut || 'nouvelle'
        prierePar[s] = (prierePar[s] || 0) + 1
        if (!r.assigned_to && ['nouvelle', 'recue'].includes(s)) priereNonAssignees++
        if (['reponse_recue', 'temoignage_soumis', 'temoignage_valide', 'exaucee'].includes(s)) priereExaucees++
      }
    } catch { /* */ }

    // ── Formation ──
    let inscrits = 0, termines = 0, abandons = 0, progMoy = 0
    try {
      const { data } = await supabaseAdmin.from('inscriptions_formation').select('progression, statut')
      const rows = (data || []) as any[]
      inscrits = rows.length
      termines = rows.filter((i) => i.statut === 'termine').length
      abandons = rows.filter((i) => i.statut === 'abandonne').length
      progMoy = inscrits ? Math.round(rows.reduce((s, i) => s + (i.progression || 0), 0) / inscrits) : 0
    } catch { /* */ }
    const certificats = await countWhere('certificats')

    // ── Fidélité (participations réelles) ──
    const participations = await countWhere('event_registrations', (q) => q.eq('type', 'participation'))
    const inscriptionsEvenements = await countWhere('event_registrations', (q) => q.eq('type', 'inscription'))

    // ── Dons ──
    let donsCount = 0, donsMontant = 0
    try {
      const { data } = await supabaseAdmin.from('dons').select('montant, statut')
      const rows = (data || []) as any[]
      donsCount = rows.length
      donsMontant = rows.reduce((s, d) => s + (Number(d.montant) || 0), 0)
    } catch { /* */ }

    // ── Témoignages ──
    let temSoumis = 0, temValides = 0
    try {
      const { data } = await supabaseAdmin.from('temoignages').select('statut')
      const rows = (data || []) as any[]
      temSoumis = rows.filter((t) => t.statut === 'soumis').length
      temValides = rows.filter((t) => t.statut === 'valide').length
    } catch { /* */ }

    // ── Alertes de santé spirituelle (calculées, actionnables) ──
    const alertes: { severite: 'haute' | 'moyenne' | 'info'; titre: string; detail: string; count: number; href: string }[] = []
    if (priereNonAssignees > 0) alertes.push({ severite: 'haute', titre: 'Demandes de prière non assignées', detail: 'Des requêtes attendent un intercesseur.', count: priereNonAssignees, href: '/admin/prieres' })
    if (temSoumis > 0) alertes.push({ severite: 'moyenne', titre: 'Témoignages à modérer', detail: 'Des témoignages attendent validation.', count: temSoumis, href: '/admin/temoignages-prieres' })
    if (faibleEngagement.length > 0) alertes.push({ severite: 'moyenne', titre: 'Fidèles à ré-engager', detail: 'Score d\'engagement faible (< 20). Un contact pastoral est recommandé.', count: faibleEngagement.length, href: '/admin/membres' })
    if (abandons > 0) alertes.push({ severite: 'info', titre: 'Formations abandonnées', detail: 'Des parcours sont interrompus — relancer les apprenants.', count: abandons, href: '/admin/questions-formations' })

    return NextResponse.json({
      ok: true,
      croissance: { fideles, nouveaux_30j: nouveaux30, par_statut: Object.entries(parStatut).map(([statut, n]) => ({ statut, n })).sort((a, b) => b.n - a.n), funnel },
      fidelite: { participations, inscriptions_evenements: inscriptionsEvenements },
      formation: { inscrits, termines, abandons, certificats, progression_moyenne: progMoy },
      priere: { total: priereTotal, par_statut: prierePar, non_assignees: priereNonAssignees, exaucees: priereExaucees },
      dons: { total: donsCount, montant_total: donsMontant },
      temoignages: { soumis: temSoumis, valides: temValides },
      alertes,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
