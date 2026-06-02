import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Ressources / téléchargements du membre — lit la médiathèque CMS publiée.
 *   GET /api/member/ressources → { ressources: [...] }
 *
 * Source unique : table cms_media (gérée depuis /admin/medias avec upload réel).
 * Réservé aux membres connectés. En démo : 401 (UI repli mock).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { data } = await supabaseAdmin
      .from('cms_media')
      .select('id, type, title, url, thumbnail_url, category, tags, duration, platform, created_at')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    return NextResponse.json({ ok: true, data: { ressources: data || [] } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
