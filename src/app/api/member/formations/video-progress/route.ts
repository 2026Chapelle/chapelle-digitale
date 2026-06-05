import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { computePercentWatched, isWatchedEnough } from '@/lib/formations/video-validation'

/**
 * Progression vidéo persistante (Lot B).
 *   POST { module_id, formation_id, watched_seconds, video_duration, last_position }
 *        → sauvegarde (upsert). Le % vu est recalculé CÔTÉ SERVEUR ; `completed`
 *          passe à true à ≥ 90 % (irréversible). watched_seconds ne décroît jamais.
 *   GET  ?formation_id=…  → progression de tous les modules de la formation
 *        (pour la reprise de lecture).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const module_id = body.module_id
    const formation_id = body.formation_id
    if (!module_id || !formation_id) return NextResponse.json({ ok: false, message: 'module_id + formation_id requis.' }, { status: 400 })

    // Inscription obligatoire + module réellement rattaché à la formation.
    const { data: insc } = await supabaseAdmin.from('inscriptions_formation')
      .select('id').eq('user_id', sp.uid).eq('formation_id', formation_id).maybeSingle()
    if (!insc) return NextResponse.json({ ok: false, message: 'Non inscrit.' }, { status: 403 })
    const { data: mod } = await supabaseAdmin.from('formation_modules')
      .select('id').eq('id', module_id).eq('formation_id', formation_id).maybeSingle()
    if (!mod) return NextResponse.json({ ok: false, message: 'Module introuvable.' }, { status: 404 })

    const incWatched = Math.max(0, Math.round(Number(body.watched_seconds) || 0))
    const duration = Math.max(0, Math.round(Number(body.video_duration) || 0))
    const lastPos = Math.max(0, Math.round(Number(body.last_position) || 0))

    const { data: existing } = await supabaseAdmin.from('video_progress')
      .select('watched_seconds, video_duration, completed')
      .eq('user_id', sp.uid).eq('module_id', module_id).maybeSingle()

    const watched = Math.max(existing?.watched_seconds ?? 0, incWatched)
    const dur = duration > 0 ? duration : (existing?.video_duration ?? 0)
    const percent = computePercentWatched(watched, dur)
    const completed = !!existing?.completed || isWatchedEnough(percent)

    const { error } = await supabaseAdmin.from('video_progress').upsert({
      user_id: sp.uid, module_id, formation_id,
      watched_seconds: watched, video_duration: dur, percent_watched: percent,
      completed, last_position: lastPos, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module_id' })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, data: { percent_watched: percent, completed, last_position: lastPos } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const formation_id = req.nextUrl.searchParams.get('formation_id')
    let q = supabaseAdmin.from('video_progress')
      .select('module_id, percent_watched, completed, last_position').eq('user_id', sp.uid)
    if (formation_id) q = q.eq('formation_id', formation_id)
    const { data } = await q
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
