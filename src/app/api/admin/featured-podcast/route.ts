import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { readTodayPodcastId } from '@/lib/podcast/home-featured'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { ok: false, message: 'Non autorisé.' },
      { status: 401 },
    )
  }

  if (IS_DEMO_MODE) {
    return NextResponse.json({
      ok: true,
      demo: true,
      data: [],
      selectedId: null,
    })
  }

  try {
    const [podcasts, block] = await Promise.all([
      supabaseAdmin
        .from('cms_podcasts')
        .select('id,title,description,cover_url,status,published_at')
        .order('published_at', { ascending: false }),

      supabaseAdmin
        .from('cms_homepage_blocks')
        .select('id,data')
        .eq('block_key', 'podcast')
        .maybeSingle(),
    ])

    if (podcasts.error || block.error) {
      throw new Error('Chargement des podcasts impossible.')
    }

    return NextResponse.json({
      ok: true,
      data: podcasts.data ?? [],
      selectedId: readTodayPodcastId(block.data?.data),
      blockAvailable: Boolean(block.data?.id),
    })
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Erreur de chargement.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { ok: false, message: 'Non autorisé.' },
      { status: 401 },
    )
  }

  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { ok: false, message: 'Supabase requis.' },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => null)
  const id: unknown = body?.id

  if (
    !body ||
    typeof body !== 'object' ||
    !('id' in body) ||
    (id !== null && (typeof id !== 'string' || !UUID.test(id)))
  ) {
    return NextResponse.json(
      { ok: false, message: 'Identifiant invalide.' },
      { status: 400 },
    )
  }

  try {
    if (typeof id === 'string') {
      const { data: episode, error } = await supabaseAdmin
        .from('cms_podcasts')
        .select('id,status')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error

      if (!episode || episode.status !== 'published') {
        return NextResponse.json(
          { ok: false, message: 'Sélectionnez un podcast publié.' },
          { status: 409 },
        )
      }
    }

    const { data: block, error: readError } = await supabaseAdmin
      .from('cms_homepage_blocks')
      .select('id,data')
      .eq('block_key', 'podcast')
      .maybeSingle()

    if (readError) throw readError

    if (!block) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Le bloc podcast est absent de l’accueil administrable.',
        },
        { status: 409 },
      )
    }

    // Mise Ã  jour atomique d'une seule cle JSONB, sans ecraser les autres emplacements.
    const { error: writeError } = await supabaseAdmin.rpc(
      'set_homepage_today_podcast',
      { p_podcast_id: id },
    )

    if (writeError) throw writeError

    return NextResponse.json({
      ok: true,
      selectedId: id,
    })
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Enregistrement impossible.' },
      { status: 500 },
    )
  }
}