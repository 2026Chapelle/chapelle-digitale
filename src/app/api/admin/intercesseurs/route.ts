import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Liste des intercesseurs assignables (back-office Mahanaïm).
 *   GET /api/admin/intercesseurs → [{ id, nom, role }]
 * Profils dont le rôle permet l'intercession/responsabilité. Cookie admin.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'
const ROLES = ['intercesseur', 'responsable_mahanaim', 'coordinateur', 'berger', 'pasteur', 'leader', 'admin', 'super_admin']

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles').select('id, prenom, nom, email, role')
      .in('role', ROLES).order('prenom', { ascending: true }).limit(200)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    const list = (data || []).map((p: any) => ({ id: p.id, nom: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || p.email, role: p.role }))
    return NextResponse.json({ ok: true, data: list })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
