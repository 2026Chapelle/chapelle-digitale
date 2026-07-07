import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/**
 * Demandes « Nouveau Venu » (back-office) — table public.newcomer_intakes.
 *   GET   /api/admin/newcomer-intakes?status=  → liste réelle (triée created_at desc)
 *   PATCH /api/admin/newcomer-intakes { id, status }  → change le statut
 * Garde : cookie admin (isAdminRequest). Service role (jamais exposé au client).
 * N'écrit QUE dans newcomer_intakes (jamais profiles / auth.users / newcomer_pipeline).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLS = 'id, prenom, nom, telephone, email, source, message, priority, status, created_at, processed_at, archived_at'
const ALLOWED_STATUS = ['new', 'to_review', 'contacted', 'converted', 'duplicate', 'archived'] as const

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { intakes: [] } })
  try {
    const status = req.nextUrl.searchParams.get('status') || ''
    let query = supabaseAdmin
      .from('newcomer_intakes')
      .select(COLS)
      .order('created_at', { ascending: false })
      .limit(500)
    if (status && (ALLOWED_STATUS as readonly string[]).includes(status)) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data: { intakes: data || [] } })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    const status = typeof body?.status === 'string' ? body.status : ''
    if (!id || !status) return NextResponse.json({ ok: false, message: 'id + status requis.' }, { status: 400 })
    if (!(ALLOWED_STATUS as readonly string[]).includes(status)) {
      return NextResponse.json({ ok: false, message: 'Statut invalide.' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { status }
    if (status === 'archived') patch.archived_at = new Date().toISOString()
    if (status === 'contacted' || status === 'converted') patch.processed_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('newcomer_intakes')
      .update(patch)
      .eq('id', id)
      .select('id, status, processed_at, archived_at')
      .single()

    if (error || !data) return NextResponse.json({ ok: false, message: error?.message || 'Mise à jour impossible.' }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
