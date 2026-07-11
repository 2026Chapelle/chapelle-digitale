import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  validateFeaturedInput, exceedsFeaturedLimit, hasDuplicateOrder,
  formationGroup, FEATURED_LIMITS, type FeaturedGroup,
} from '@/lib/cms/featured'

/**
 * V2.9-B — Mise en vedette (accueil). Route ÉTROITE et sécurisée (ne remplace PAS
 * le CRUD générique). Garde admin serveur, liste blanche stricte :
 *   • ressource ∈ {formations, cms_events}
 *   • champs modifiés = is_featured + (featured_order | sort_order) UNIQUEMENT
 * Applique les limites (3 formations hors parcours · 3 parcours · 6 événements),
 * refuse les ordres dupliqués parmi les vedettes actives du même groupe, puis
 * invalide les routes concernées. Aucune table arbitraire, aucune autre colonne.
 *
 *   POST /api/admin/featured  { resource, id, is_featured, order }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function revalidateFeatured() {
  for (const p of ['/', '/formations', '/admin/contenus-en-vedette', '/admin/formations', '/admin/evenements']) {
    try { revalidatePath(p) } catch { /* best-effort */ }
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const v = validateFeaturedInput(body)
  if (!v.ok) return NextResponse.json({ ok: false, message: v.error }, { status: 400 })
  const { resource, id, is_featured, order } = v.value

  try {
    if (resource === 'formations') {
      const { data: row, error: e0 } = await supabaseAdmin
        .from('formations').select('id, type').eq('id', id).maybeSingle()
      if (e0) return NextResponse.json({ ok: false, message: e0.message }, { status: 400 })
      if (!row) return NextResponse.json({ ok: false, message: 'Formation introuvable.' }, { status: 404 })

      const group: FeaturedGroup = formationGroup((row as any).type)
      // Vedettes actives du MÊME groupe (hors cet id) : type='parcours' vs type<>'parcours'.
      let q = supabaseAdmin.from('formations').select('id, featured_order').eq('is_featured', true).neq('id', id)
      q = group === 'parcours' ? q.eq('type', 'parcours') : q.neq('type', 'parcours')
      const { data: actives, error: e1 } = await q
      if (e1) return NextResponse.json({ ok: false, message: e1.message }, { status: 400 })
      const list = actives || []

      if (exceedsFeaturedLimit(group, list.length, is_featured)) {
        return NextResponse.json({ ok: false, message: `Limite atteinte : ${FEATURED_LIMITS[group]} ${group === 'parcours' ? 'parcours' : 'formations'} en vedette maximum. Retirez-en un avant d'en ajouter un autre.` }, { status: 409 })
      }
      if (hasDuplicateOrder(list.map((r: any) => Number(r.featured_order ?? 0)), order, is_featured)) {
        return NextResponse.json({ ok: false, message: `Ordre ${order} déjà utilisé dans ce groupe. Choisissez un autre ordre.` }, { status: 409 })
      }

      const { data, error } = await supabaseAdmin
        .from('formations').update({ is_featured, featured_order: order })
        .eq('id', id).select('id, is_featured, featured_order').single()
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
      revalidateFeatured()
      return NextResponse.json({ ok: true, data })
    }

    // resource === 'cms_events'
    const { data: row, error: e0 } = await supabaseAdmin
      .from('cms_events').select('id').eq('id', id).maybeSingle()
    if (e0) return NextResponse.json({ ok: false, message: e0.message }, { status: 400 })
    if (!row) return NextResponse.json({ ok: false, message: 'Événement introuvable.' }, { status: 404 })

    const { data: actives, error: e1 } = await supabaseAdmin
      .from('cms_events').select('id, sort_order').eq('is_featured', true).neq('id', id)
    if (e1) return NextResponse.json({ ok: false, message: e1.message }, { status: 400 })
    const list = actives || []

    if (exceedsFeaturedLimit('events', list.length, is_featured)) {
      return NextResponse.json({ ok: false, message: `Limite atteinte : ${FEATURED_LIMITS.events} événements en vedette maximum. Retirez-en un avant d'en ajouter un autre.` }, { status: 409 })
    }
    if (hasDuplicateOrder(list.map((r: any) => Number(r.sort_order ?? 0)), order, is_featured)) {
      return NextResponse.json({ ok: false, message: `Ordre ${order} déjà utilisé. Choisissez un autre ordre.` }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('cms_events').update({ is_featured, sort_order: order })
      .eq('id', id).select('id, is_featured, sort_order').single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    revalidateFeatured()
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur serveur.' }, { status: 500 })
  }
}
