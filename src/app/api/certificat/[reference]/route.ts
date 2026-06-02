import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Vérification PUBLIQUE d'un certificat par sa référence.
 *   GET /api/certificat/<reference> → { ok, valide, certificat? }
 *
 * Lecture service role (la table certificats est en RLS select-own). N'expose
 * que les champs nécessaires à l'attestation : titulaire, intitulé, date, réf.
 * Zéro fictif : si la référence n'existe pas, valide=false.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { reference: string } }) {
  const reference = decodeURIComponent(params.reference || '').trim().toUpperCase()
  if (!reference) return NextResponse.json({ ok: false, message: 'Référence requise.' }, { status: 400 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, valide: false, demo: true })

  try {
    // NB : pas d'embed profiles(...) — certificats a 2 FK vers profiles
    // (user_id + valide_par) → l'embed est ambigu. On récupère le profil à part.
    const { data } = await supabaseAdmin
      .from('certificats')
      .select('titre, type, reference, delivre_le, user_id')
      .eq('reference', reference)
      .order('delivre_le', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return NextResponse.json({ ok: true, valide: false })

    let nom = 'Bénéficiaire'
    if (data.user_id) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('prenom, nom').eq('id', data.user_id).maybeSingle()
      if (prof) nom = `${prof.prenom ?? ''} ${prof.nom ?? ''}`.trim() || nom
    }
    return NextResponse.json({
      ok: true,
      valide: true,
      certificat: {
        titre: data.titre,
        type: data.type,
        reference: data.reference,
        delivre_le: data.delivre_le,
        nom,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
