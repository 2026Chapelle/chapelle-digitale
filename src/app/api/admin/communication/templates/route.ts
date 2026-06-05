import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/** Modèles de communication réutilisables. GET/POST/DELETE. Garde : cookie admin. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const guard = (req: NextRequest) => (!isAdminRequest(req) ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 }) : null)

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const { data, error } = await supabaseAdmin.from('communication_templates').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data || [] })
}

export async function POST(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.nom) return NextResponse.json({ ok: false, message: 'Nom requis.' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('communication_templates').insert({ nom: b.nom, sujet: b.sujet || null, body: b.body || null }).select().single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('communication_templates').delete().eq('id', b.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
