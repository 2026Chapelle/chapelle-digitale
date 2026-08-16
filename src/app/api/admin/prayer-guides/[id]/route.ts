import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { adminGetGuide, adminUpdateGuide, adminArchiveGuide } from '@/lib/prayers/server'
import { buildGuidePayload } from '@/lib/prayers/admin-payload'

/**
 * Admin CMS « Prières & Guides » — détail / mise à jour / archivage (V2.3-C).
 *   GET    /api/admin/prayer-guides/[id]  → prière complète
 *   PATCH  /api/admin/prayer-guides/[id]  → met à jour
 *   DELETE /api/admin/prayer-guides/[id]  → archive (status='archived'), non destructif
 * Garde : cookie admin (isAdminRequest).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  const guide = await adminGetGuide(params.id)
  if (!guide) return NextResponse.json({ ok: false, message: 'Prière introuvable.' }, { status: 404 })
  return NextResponse.json({ ok: true, data: { guide } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  // Mise à jour STATUT seul (Publier / Archiver rapides) : body { status } sans les autres champs.
  if (!body?.title && typeof body?.status === 'string') {
    if (!['draft', 'published', 'archived'].includes(body.status)) {
      return NextResponse.json({ ok: false, message: 'Statut invalide.' }, { status: 400 })
    }
    const patch: Record<string, any> = { status: body.status }
    if (body.status === 'published') patch.published_at = new Date().toISOString()
    const resS = await adminUpdateGuide(params.id, patch)
    if (!resS.ok) return NextResponse.json({ ok: false, message: resS.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  const { payload, error } = buildGuidePayload(body)
  if (error) return NextResponse.json({ ok: false, message: error }, { status: 400 })
  const res = await adminUpdateGuide(params.id, payload!)
  if (!res.ok) return NextResponse.json({ ok: false, message: res.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const res = await adminArchiveGuide(params.id)
  if (!res.ok) return NextResponse.json({ ok: false, message: res.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
