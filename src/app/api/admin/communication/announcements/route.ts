import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/** Annonces officielles (bannières ciblées). GET/POST/PATCH/DELETE. Garde : cookie admin. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const guard = (req: NextRequest) => (!isAdminRequest(req) ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 }) : null)

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const { data, error } = await supabaseAdmin.from('announcements').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data || [] })
}

export async function POST(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.titre) return NextResponse.json({ ok: false, message: 'Titre requis.' }, { status: 400 })
  const level = ['info', 'important', 'critique'].includes(b.level) ? b.level : 'info'
  const status = ['draft', 'active', 'archive'].includes(b.status) ? b.status : 'active'
  const { data, error } = await supabaseAdmin.from('announcements').insert({
    titre: b.titre, body: b.body || null, level, target: b.target || {},
    active_from: b.active_from || null, active_until: b.active_until || null, status,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { id, ...patch } = b
  const { error } = await supabaseAdmin.from('announcements').update(patch).eq('id', id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('announcements').delete().eq('id', b.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
