import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Back-office — Tunnel d'intégration (gouvernement pastoral).
 *   GET    → { funnel, recent }  (entonnoir + arrivants récents avec jalons)
 *   PATCH  { id, milestone, value }  → bascule un jalon 6-8 (baptême/service/leadership)
 *
 * Garde cookie admin. Lecture/écriture via service role (schéma chapelle).
 * Zéro fictif : en démo, listes vides.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'
const guard = (req: NextRequest) =>
  !isAdminRequest(req)
    ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
    : null

const MILESTONES: Record<string, { flag: string; at: string }> = {
  bapteme:    { flag: 'a_ete_baptise',     at: 'a_ete_baptise_at' },
  service:    { flag: 'a_rejoint_service',  at: 'a_rejoint_service_at' },
  leadership: { flag: 'a_suivi_leadership', at: 'a_suivi_leadership_at' },
}

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: true, demo: true, funnel: null, recent: [] })
  }
  const db = supabaseAdmin.schema('chapelle')
  try {
    const [{ data: funnel }, { data: recent }] = await Promise.all([
      db.rpc('integration_funnel'),
      db.from('integration_journeys')
        .select('id, stage_courant, a_rempli_formulaire, a_suivi_parcours, a_participe_programme, est_devenu_membre, a_ete_baptise, a_rejoint_service, a_suivi_leadership, created_at, members(prenom, nom, email, pays)')
        .order('created_at', { ascending: false })
        .limit(60),
    ])
    return NextResponse.json({ ok: true, funnel: funnel ?? null, recent: recent ?? [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const ms = MILESTONES[body.milestone as string]
  if (!body.id || !ms) {
    return NextResponse.json({ ok: false, message: 'Paramètres invalides.' }, { status: 400 })
  }
  const value = body.value !== false
  const patch: Record<string, any> = { [ms.flag]: value, [ms.at]: value ? new Date().toISOString() : null }
  const { error } = await supabaseAdmin.schema('chapelle')
    .from('integration_journeys').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
