import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getMemberDossier } from '@/lib/pastoral/member-360-server'

/**
 * Dossier pastoral 360° d'un membre.
 *   GET /api/admin/membres/<id>  → vue complète (profil, vie spirituelle,
 *   activité, générosité, notes, historique de statut).
 * Garde : cookie admin. Service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const dossier = await getMemberDossier(params.id)
    if (!dossier) return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
    return NextResponse.json({ ok: true, data: dossier })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
