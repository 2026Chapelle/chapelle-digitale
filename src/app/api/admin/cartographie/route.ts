import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * CARTOGRAPHIE DU ROYAUME — expansion territoriale réelle.
 *   GET /api/admin/cartographie
 * Hiérarchie pays → villes (membres, responsables) + familles/cellules.
 * Sources : profiles (pays/ville/role) + groupes (défensif). Zéro fictif.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'
const RESP = new Set(['admin', 'pasteur', 'formateur', 'responsable_integration', 'responsable_mahanaim', 'coordinateur', 'responsable'])

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  interface Ville { ville: string; membres: number; responsables: number }
  interface PaysNode { pays: string; membres: number; responsables: number; familles: number; villes: Ville[] }
  const paysMap = new Map<string, { membres: number; responsables: number; familles: number; villes: Map<string, Ville> }>()

  const getPays = (p?: string) => {
    const pays = (p && String(p).trim()) || 'Non renseigné'
    if (!paysMap.has(pays)) paysMap.set(pays, { membres: 0, responsables: 0, familles: 0, villes: new Map() })
    return paysMap.get(pays)!
  }

  try {
    const { data } = await supabaseAdmin.from('profiles').select('pays, ville, role')
    for (const r of (data || []) as any[]) {
      const node = getPays(r.pays)
      node.membres++
      const isResp = RESP.has(r.role)
      if (isResp) node.responsables++
      const villeName = (r.ville && String(r.ville).trim()) || 'Non renseignée'
      if (!node.villes.has(villeName)) node.villes.set(villeName, { ville: villeName, membres: 0, responsables: 0 })
      const v = node.villes.get(villeName)!
      v.membres++
      if (isResp) v.responsables++
    }
  } catch { /* */ }

  // Familles / cellules de la Chapelle (table groupes, défensif).
  let famillesTotal = 0
  try {
    const { data } = await supabaseAdmin.from('groupes').select('*')
    for (const g of (data || []) as any[]) {
      famillesTotal++
      const pays = g.pays || g.country
      if (pays) getPays(pays).familles++
    }
  } catch { /* table absente → 0 */ }

  const nations: PaysNode[] = Array.from(paysMap.entries())
    .map(([pays, n]) => ({
      pays, membres: n.membres, responsables: n.responsables, familles: n.familles,
      villes: Array.from(n.villes.values()).sort((a, b) => b.membres - a.membres),
    }))
    .filter((n) => n.pays !== 'Non renseigné' || n.membres > 0)
    .sort((a, b) => b.membres - a.membres)

  const totaux = {
    nations: nations.filter((n) => n.pays !== 'Non renseigné').length,
    villes: nations.reduce((s, n) => s + n.villes.filter((v) => v.ville !== 'Non renseignée').length, 0),
    membres: nations.reduce((s, n) => s + n.membres, 0),
    responsables: nations.reduce((s, n) => s + n.responsables, 0),
    familles: famillesTotal,
  }

  return NextResponse.json({ ok: true, nations, totaux })
}
