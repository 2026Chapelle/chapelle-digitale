import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * POST /api/nouveau-venu — capture publique d'un « nouveau venu » (V2.1D-C).
 *
 * Insère UNIQUEMENT dans public.newcomer_intakes via le client service role
 * (côté serveur). La table est en RLS + FORCE RLS avec `revoke all` pour
 * anon/authenticated : toute écriture directe depuis le navigateur est
 * impossible → elle passe obligatoirement par ce relais serveur.
 *
 * N'écrit JAMAIS dans public.profiles, auth.users ni newcomer_pipeline.
 * La clé service role n'est utilisée QUE côté serveur (jamais exposée au client).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export async function POST(req: NextRequest) {
  // Anti-spam : 6 soumissions / 10 min / IP (protège la table publique).
  const rl = rateLimit(`nouveau-venu:${clientIp(req)}`, { limit: 6, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Service momentanément indisponible.' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Requête invalide.' }, { status: 400 })
  }

  // Normalisation.
  const prenom = str(body?.prenom)
  const nom = str(body?.nom)
  const telephone = str(body?.telephone)
  const emailRaw = str(body?.email)
  const email = emailRaw === '' ? null : emailRaw.toLowerCase()
  const heardFrom = str(body?.source) // « Comment nous avez-vous connus ? » (select)
  const message = str(body?.message)
  const consent = body?.consent === true

  // Validation serveur (miroir des CHECK SQL de newcomer_intakes).
  if (prenom.length < 2) return NextResponse.json({ ok: false, message: 'Prénom requis.' }, { status: 400 })
  if (telephone.length < 3) return NextResponse.json({ ok: false, message: 'Téléphone requis.' }, { status: 400 })
  if (email !== null && (email.length < 5 || !EMAIL_RE.test(email))) {
    return NextResponse.json({ ok: false, message: 'Adresse email invalide.' }, { status: 400 })
  }
  if (!consent) return NextResponse.json({ ok: false, message: 'Consentement requis.' }, { status: 400 })

  try {
    const { data, error } = await supabaseAdmin
      .from('newcomer_intakes')
      .insert({
        prenom,
        nom: nom || null,
        telephone,
        email,
        source: 'nouveau_venu_form',
        message: message || null,
        consent: true,
        consented_at: new Date().toISOString(),
        intake_payload: { heard_from: heardFrom || null },
        // status ('new') / priority ('normal') : valeurs par défaut de la table.
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[nouveau-venu] insert error:', error?.message)
      return NextResponse.json({ ok: false, message: 'Une erreur est survenue. Réessayez dans un instant.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, intakeId: data.id })
  } catch (e: unknown) {
    console.error('[nouveau-venu] server error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, message: 'Une erreur est survenue. Réessayez dans un instant.' }, { status: 500 })
  }
}
