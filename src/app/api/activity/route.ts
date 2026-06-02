import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { logActivity, type ActivityAction } from '@/lib/activity'

/**
 * Beacon d'activité membre (actions réelles uniquement).
 *   POST { action_type, resource_type?, resource_id?, resource_title?, source?, metadata? }
 *
 * Actions autorisées : live_view, video_view, pdf_download. (Les dons sont
 * journalisés côté serveur par le webhook.) Prière / cure d'âme NON instrumentés.
 * Authentifié ; enrichit nom/email/pays depuis le profil. Best-effort → 200.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = new Set<ActivityAction>(['live_view', 'video_view', 'pdf_download'])

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, skipped: true })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = body.action_type as ActivityAction
  if (!ALLOWED.has(action)) return NextResponse.json({ ok: false, message: 'Action non autorisée.' }, { status: 400 })

  let nom: string | null = null, email: string | null = null, pays: string | null = null
  try {
    const { data: p } = await supabaseAdmin.from('profiles').select('prenom, nom, email, pays').eq('id', sp.uid).maybeSingle()
    if (p) { nom = `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || null; email = p.email ?? null; pays = p.pays ?? null }
  } catch { /* profil minimal */ }

  await logActivity({
    userId: sp.uid, nom, email, pays,
    action_type: action,
    resource_type: (body.resource_type || '').toString().slice(0, 40) || null,
    resource_id: (body.resource_id || '').toString().slice(0, 100) || null,
    resource_title: (body.resource_title || '').toString().slice(0, 200) || null,
    source: (body.source || '').toString().slice(0, 40) || null,
    metadata: typeof body.metadata === 'object' ? body.metadata : null,
  })
  return NextResponse.json({ ok: true })
}
