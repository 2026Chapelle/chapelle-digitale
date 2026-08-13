import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/**
 * PODCAST-3 — CRUD des playlists OFFICIELLES (Admin/Super Admin).
 *   GET    → liste (avec nb d'épisodes)
 *   POST   {title, description?, cover_url?, visibility?, sort_order?} → créer (official)
 *   PATCH  {id, ...champs}   → modifier
 *   DELETE {id}              → supprimer (items en cascade)
 * Écritures via service_role (bypass RLS) APRÈS garde isAdminRequest — comme le CMS.
 * Les playlists PERSONNELLES ne passent JAMAIS par cette route (RLS côté membre).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function guard(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  return null
}

export async function GET(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const { data, error } = await supabaseAdmin.from('audio_playlists')
      .select('*, audio_playlist_items(count)')
      .eq('playlist_type', 'official').order('sort_order', { ascending: true })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const b = await req.json().catch(() => ({}))
    if (!b.title || typeof b.title !== 'string') return NextResponse.json({ ok: false, message: 'Titre requis.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('audio_playlists').insert({
      playlist_type: 'official', owner_user_id: null,
      title: b.title, description: b.description ?? null, cover_url: b.cover_url ?? null,
      visibility: ['private', 'members', 'public'].includes(b.visibility) ? b.visibility : 'public',
      sort_order: Number.isFinite(b.sort_order) ? b.sort_order : 0,
    }).select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const b = await req.json().catch(() => ({}))
    if (!b.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    const patch: Record<string, unknown> = {}
    for (const k of ['title', 'description', 'cover_url', 'visibility', 'sort_order']) if (k in b) patch[k] = b[k]
    const { data, error } = await supabaseAdmin.from('audio_playlists').update(patch)
      .eq('id', b.id).eq('playlist_type', 'official').select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const b = await req.json().catch(() => ({}))
    if (!b.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('audio_playlists').delete()
      .eq('id', b.id).eq('playlist_type', 'official')
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}
