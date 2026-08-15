import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { nextItemPosition, computeReorder } from '@/lib/podcast/playlists'

/**
 * PODCAST-3 — Items des playlists OFFICIELLES (Admin).
 *   GET    ?playlist_id=…       → items (position asc)
 *   POST   {playlist_id, podcast_id}      → ajouter en fin (unique (playlist,podcast))
 *   DELETE {playlist_id, podcast_id}      → retirer
 *   PATCH  {playlist_id, ordered:[podcast_id…]} → réordonner (positions 0..n-1)
 * Restreint aux playlists official (garde de type). service_role + isAdminRequest.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function guard(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  return null
}
async function assertOfficial(playlistId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('audio_playlists').select('playlist_type').eq('id', playlistId).maybeSingle()
  return (data as { playlist_type?: string } | null)?.playlist_type === 'official'
}

export async function GET(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  const playlistId = req.nextUrl.searchParams.get('playlist_id')
  if (!playlistId) return NextResponse.json({ ok: false, message: 'playlist_id requis.' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('audio_playlist_items').select('*')
    .eq('playlist_id', playlistId).order('position', { ascending: true })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.playlist_id || !b.podcast_id) return NextResponse.json({ ok: false, message: 'playlist_id + podcast_id requis.' }, { status: 400 })
  if (!(await assertOfficial(b.playlist_id))) return NextResponse.json({ ok: false, message: 'Playlist officielle introuvable.' }, { status: 404 })
  const { data: existing } = await supabaseAdmin.from('audio_playlist_items').select('position').eq('playlist_id', b.playlist_id)
  const pos = nextItemPosition((existing as { position: number }[]) ?? [])
  const { error } = await supabaseAdmin.from('audio_playlist_items')
    .upsert({ playlist_id: b.playlist_id, podcast_id: b.podcast_id, position: pos }, { onConflict: 'playlist_id,podcast_id', ignoreDuplicates: true })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.playlist_id || !b.podcast_id) return NextResponse.json({ ok: false, message: 'playlist_id + podcast_id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('audio_playlist_items').delete()
    .eq('playlist_id', b.playlist_id).eq('podcast_id', b.podcast_id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.playlist_id || !Array.isArray(b.ordered)) return NextResponse.json({ ok: false, message: 'playlist_id + ordered[] requis.' }, { status: 400 })
  if (!(await assertOfficial(b.playlist_id))) return NextResponse.json({ ok: false, message: 'Playlist officielle introuvable.' }, { status: 404 })
  try {
    for (const { podcastId, position } of computeReorder(b.ordered as string[])) {
      await supabaseAdmin.from('audio_playlist_items').update({ position })
        .eq('playlist_id', b.playlist_id).eq('podcast_id', podcastId)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}
