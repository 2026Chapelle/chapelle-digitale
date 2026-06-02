import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { healthIndex, classify, type MemberActivity, type HealthColor, type Classification } from '@/lib/health'

/**
 * Santé spirituelle & classification automatique (back-office).
 *   GET            → distribution (couleurs + classes), alertes, membres analysés
 *   POST { apply } → applique la classification calculée à membre_statut (évolution
 *                    automatique des statuts ; ne touche pas aux responsables).
 * Données réelles : prières, formations, événements, récence. Zéro fictif.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'
const guard = (req: NextRequest) =>
  !isAdminRequest(req)
    ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
    : null

const DAY = 24 * 3600 * 1000
const daysSince = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : null)

async function analyse() {
  const { data: profs } = await supabaseAdmin.from('profiles')
    .select('id, prenom, nom, pays, membre_statut, role, score_engagement, created_at')
  const profiles = (profs || []) as any[]

  const lastAct: Record<string, number> = {}
  const prayers: Record<string, number> = {}
  const events: Record<string, number> = {}
  const completions: Record<string, number> = {}
  const formTermine: Record<string, number> = {}

  const note = (uid: string, iso?: string | null) => {
    if (!uid || !iso) return
    const t = new Date(iso).getTime()
    if (!lastAct[uid] || t > lastAct[uid]) lastAct[uid] = t
  }

  try {
    const { data } = await supabaseAdmin.from('priere_demandes').select('user_id, created_at')
    for (const r of (data || []) as any[]) if (r.user_id) { prayers[r.user_id] = (prayers[r.user_id] || 0) + 1; note(r.user_id, r.created_at) }
  } catch { /* */ }
  try {
    const { data } = await supabaseAdmin.from('module_completions').select('user_id, completed_at')
    for (const r of (data || []) as any[]) if (r.user_id) { completions[r.user_id] = (completions[r.user_id] || 0) + 1; note(r.user_id, r.completed_at) }
  } catch { /* */ }
  try {
    const { data } = await supabaseAdmin.from('event_registrations').select('user_id, created_at')
    for (const r of (data || []) as any[]) if (r.user_id) { events[r.user_id] = (events[r.user_id] || 0) + 1; note(r.user_id, r.created_at) }
  } catch { /* */ }
  try {
    const { data } = await supabaseAdmin.from('inscriptions_formation').select('user_id, statut')
    for (const r of (data || []) as any[]) if (r.user_id && r.statut === 'termine') formTermine[r.user_id] = (formTermine[r.user_id] || 0) + 1
  } catch { /* */ }

  return profiles.map((p) => {
    const uid = p.id
    const act: MemberActivity = {
      prayers: prayers[uid] || 0,
      completions: completions[uid] || 0,
      events: events[uid] || 0,
      formationsTerminees: formTermine[uid] || 0,
      scoreEngagement: Number(p.score_engagement) || 0,
      lastActivityDays: lastAct[uid] ? Math.floor((Date.now() - lastAct[uid]) / DAY) : null,
      accountAgeDays: daysSince(p.created_at) ?? 0,
      role: p.role, membreStatut: p.membre_statut,
    }
    const health = healthIndex(act)
    const classification = classify(act)
    return {
      id: uid,
      nom: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || '—',
      pays: p.pays || '',
      membre_statut: p.membre_statut || 'visiteur',
      role: p.role || null,
      color: health.color, label: health.label, score: health.score,
      classification,
      inactif_jours: act.lastActivityDays,
    }
  })
}

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const membres = await analyse()
    const parCouleur: Record<HealthColor, number> = { vert: 0, jaune: 0, orange: 0, rouge: 0 }
    const parClasse: Record<Classification, number> = { visiteur: 0, inscrit: 0, fidele: 0, membre: 0, responsable: 0 }
    for (const m of membres) { parCouleur[m.color]++; parClasse[m.classification as Classification]++ }

    const alertes = membres
      .filter((m) => m.color === 'rouge' || m.color === 'orange')
      .sort((a, b) => (b.inactif_jours ?? 9999) - (a.inactif_jours ?? 9999))
      .slice(0, 50)

    return NextResponse.json({ ok: true, total: membres.length, parCouleur, parClasse, alertes, membres: membres.slice(0, 300) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.apply) return NextResponse.json({ ok: false, message: 'Action non reconnue.' }, { status: 400 })
  try {
    const membres = await analyse()
    let applied = 0
    for (const m of membres) {
      if (m.classification === 'responsable') continue
      if (m.classification !== m.membre_statut) {
        const { error } = await supabaseAdmin.from('profiles').update({ membre_statut: m.classification }).eq('id', m.id)
        if (!error) applied++
      }
    }
    return NextResponse.json({ ok: true, applied })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
