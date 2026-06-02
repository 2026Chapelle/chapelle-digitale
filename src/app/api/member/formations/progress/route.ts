import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Progression RÉELLE : marque un module terminé (ou l'annule) et recalcule la
 * progression de l'inscription. Aucun pourcentage fictif.
 *   POST   { module_id, formation_id }  → marque terminé
 *   DELETE { module_id }                → annule (reprendre)
 * Délivre un certificat (fondation) quand la formation atteint 100 %.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function recompute(uid: string, formationId: string) {
  const { count: total } = await supabaseAdmin
    .from('formation_modules').select('*', { count: 'exact', head: true })
    .eq('formation_id', formationId).eq('status', 'published')
  const { count: done } = await supabaseAdmin
    .from('module_completions').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('formation_id', formationId)
  const progression = total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : 0
  const statut = progression >= 100 ? 'termine' : 'actif'
  await supabaseAdmin.from('inscriptions_formation')
    .update({ progression, statut, dernier_acces: new Date().toISOString() })
    .eq('user_id', uid).eq('formation_id', formationId)
  return { progression, statut, total: total ?? 0, done: done ?? 0 }
}

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { module_id, formation_id } = await req.json().catch(() => ({}))
    if (!module_id || !formation_id) return NextResponse.json({ ok: false, message: 'module_id + formation_id requis.' }, { status: 400 })

    // S'assure d'une inscription (entrée dans le parcours de formation).
    await supabaseAdmin.from('inscriptions_formation')
      .upsert({ user_id: sp.uid, formation_id, statut: 'actif' }, { onConflict: 'user_id,formation_id', ignoreDuplicates: true })

    await supabaseAdmin.from('module_completions')
      .upsert({ user_id: sp.uid, module_id, formation_id }, { onConflict: 'user_id,module_id', ignoreDuplicates: true })

    const res = await recompute(sp.uid, formation_id)

    // Certificat (fondation) à 100 % — idempotent.
    if (res.progression >= 100) {
      const { data: existing } = await supabaseAdmin.from('certificats')
        .select('id').eq('user_id', sp.uid).eq('formation_id', formation_id).eq('type', 'formation').maybeSingle()
      if (!existing) {
        const { data: f } = await supabaseAdmin.from('formations').select('titre').eq('id', formation_id).single()
        // Référence UNIQUE par (membre, formation) — sert de code de vérification public.
        const reference = `CITADELLE-${String(formation_id).slice(0, 8)}-${String(sp.uid).slice(0, 8)}`.toUpperCase()
        await supabaseAdmin.from('certificats').insert({
          user_id: sp.uid, formation_id, type: 'formation',
          titre: `Certificat — ${f?.titre || 'Formation'}`,
          reference,
        })
      }
    }
    return NextResponse.json({ ok: true, data: res })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { module_id, formation_id } = await req.json().catch(() => ({}))
    if (!module_id || !formation_id) return NextResponse.json({ ok: false, message: 'module_id + formation_id requis.' }, { status: 400 })
    await supabaseAdmin.from('module_completions').delete().eq('user_id', sp.uid).eq('module_id', module_id)
    const res = await recompute(sp.uid, formation_id)
    return NextResponse.json({ ok: true, data: res })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
