import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Gouvernement INTERNATIONAL — agrégats réels par pays.
 *   GET /api/admin/international
 * Sources : profiles (inscrits/membres/responsables/nouveaux), priere_demandes
 * (pays), inscriptions_formation (via profiles), analytics (visiteurs si dispo).
 * Tout est défensif (try/catch → neutre). Zéro donnée inventée.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'
const RESPONSABLE_ROLES = new Set(['admin', 'pasteur', 'formateur', 'responsable_integration', 'responsable_mahanaim', 'coordinateur', 'responsable'])
const MEMBRE_STATUTS = new Set(['membre', 'fidele', 'actif'])

interface Pays {
  pays: string
  inscrits: number
  membres: number
  responsables: number
  nouveaux_30j: number
  prieres: number
  formations: number
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const map = new Map<string, Pays>()
  const get = (paysRaw?: string): Pays => {
    const pays = (paysRaw && String(paysRaw).trim()) || 'Non renseigné'
    if (!map.has(pays)) map.set(pays, { pays, inscrits: 0, membres: 0, responsables: 0, nouveaux_30j: 0, prieres: 0, formations: 0 })
    return map.get(pays)!
  }

  const since = Date.now() - 30 * 24 * 3600 * 1000
  const monthly: Record<string, number> = {}

  try {
    const { data } = await supabaseAdmin.from('profiles').select('pays, membre_statut, role, created_at')
    for (const r of (data || []) as any[]) {
      const c = get(r.pays)
      c.inscrits++
      if (MEMBRE_STATUTS.has(r.membre_statut)) c.membres++
      if (RESPONSABLE_ROLES.has(r.role)) c.responsables++
      if (r.created_at && new Date(r.created_at).getTime() >= since) c.nouveaux_30j++
      if (r.created_at) {
        const ym = String(r.created_at).slice(0, 7)
        monthly[ym] = (monthly[ym] || 0) + 1
      }
    }
  } catch { /* */ }

  try {
    const { data } = await supabaseAdmin.from('priere_demandes').select('pays')
    for (const r of (data || []) as any[]) get(r.pays).prieres++
  } catch { /* */ }

  try {
    const { data } = await supabaseAdmin.from('inscriptions_formation').select('profiles(pays)')
    for (const r of (data || []) as any[]) {
      const prof: any = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      get(prof?.pays).formations++
    }
  } catch { /* */ }

  // Visiteurs par pays (analytics chapelle, si l'agrégat est disponible).
  let visiteurs: { pays: string; n: number }[] = []
  try {
    const { data } = await supabaseAdmin.schema('chapelle').rpc('admin_dashboard', { p_range: '30d' })
    const blob: any = data
    if (blob?.pays && Array.isArray(blob.pays)) {
      visiteurs = blob.pays.map((p: any) => ({ pays: p.pays || p.label || 'Non renseigné', n: Number(p.n ?? p.count ?? p.value) || 0 }))
    }
  } catch { /* */ }

  const nations = Array.from(map.values())
    .filter((c) => c.pays !== 'Non renseigné' || c.inscrits > 0)
    .sort((a, b) => b.inscrits - a.inscrits || b.membres - a.membres)

  // Croissance mensuelle (12 derniers mois, ordre chronologique).
  const croissance = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mois, n]) => ({ mois, n }))

  const totaux = nations.reduce((acc, c) => ({
    pays: nations.filter((x) => x.pays !== 'Non renseigné').length,
    inscrits: acc.inscrits + c.inscrits,
    membres: acc.membres + c.membres,
    responsables: acc.responsables + c.responsables,
    prieres: acc.prieres + c.prieres,
    formations: acc.formations + c.formations,
  }), { pays: 0, inscrits: 0, membres: 0, responsables: 0, prieres: 0, formations: 0 })

  return NextResponse.json({ ok: true, nations, croissance, visiteurs, totaux })
}
