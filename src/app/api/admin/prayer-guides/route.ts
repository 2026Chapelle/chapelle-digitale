import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { adminListGuides, adminCreateGuide } from '@/lib/prayers/server'
import { buildGuidePayload } from '@/lib/prayers/admin-payload'

/**
 * Admin CMS « Prières & Guides » (V2.3-C) — liste + création.
 *   GET  /api/admin/prayer-guides  → { sqlReady, guides }
 *   POST /api/admin/prayer-guides  → crée une prière
 * Garde : cookie admin (isAdminRequest). Service role côté serveur.
 * Écrit UNIQUEMENT dans prayer_guides. Nécessite le SQL manuel appliqué (sinon sqlReady=false).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  const { sqlReady, guides } = await adminListGuides()
  return NextResponse.json({ ok: true, data: { sqlReady, guides } })
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const { payload, error } = buildGuidePayload(body)
  if (error) return NextResponse.json({ ok: false, message: error }, { status: 400 })
  const res = await adminCreateGuide(payload!)
  if (!res.ok) return NextResponse.json({ ok: false, message: res.message }, { status: 400 })
  return NextResponse.json({ ok: true, data: { id: res.id } })
}
