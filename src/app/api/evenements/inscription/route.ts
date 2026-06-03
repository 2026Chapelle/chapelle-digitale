import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { sendEmail } from '@/lib/email'
import { eventRegistrationEmail } from '@/lib/email-templates'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Inscription RÉELLE à un événement (page publique + espace membre).
 *
 *   POST /api/evenements/inscription
 *   { event_id, event_titre, event_date?, type?, prenom?, email? }
 *
 * - Membre connecté  → ligne dans `event_registrations` (dédupliquée) ;
 * - Visiteur anonyme → lead best-effort (chapelle.form_submissions) — c'est
 *   un point de conversion : l'intérêt pour un événement devient un contact.
 * En tous cas : accusé de réception par email (best-effort, jamais bloquant).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: true, delivered: false, message: 'Inscription enregistrée (mode démo).' })
  }

  const rl = rateLimit(`event-inscription:${clientIp(req)}`, { limit: 8, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, message: 'Requête invalide.' }, { status: 400 }) }

  const eventId = String(body.event_id || '').trim()
  const eventTitre = String(body.event_titre || 'Événement').trim()
  const eventDate = body.event_date ? String(body.event_date) : undefined
  const type = body.type === 'rappel' ? 'rappel' : 'inscription'
  if (!eventId) return NextResponse.json({ ok: false, message: 'Événement manquant.' }, { status: 400 })

  const sp = await getSessionProfile()

  // Identité de l'inscrit : membre connecté, sinon coordonnées fournies.
  let prenom = ''
  let email = ''
  let nom = ''
  if (sp?.uid) {
    prenom = (sp.profile?.prenom as string) || ''
    nom = (sp.profile?.nom as string) || ''
    email = (sp.profile?.email as string) || ''
  } else {
    prenom = String(body.prenom || '').trim()
    email = String(body.email || '').trim().toLowerCase()
    if (prenom.length < 2 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, message: 'Prénom et email valides requis.' }, { status: 422 })
    }
  }

  // ── Persistance ────────────────────────────────────────────────────────────
  try {
    if (sp?.uid) {
      // Membre : éviter les doublons d'inscription.
      const { data: existing } = await supabaseAdmin.from('event_registrations')
        .select('id').eq('event_id', eventId).eq('user_id', sp.uid).eq('type', type).maybeSingle()
      if (!existing) {
        await supabaseAdmin.from('event_registrations').insert({
          event_id: eventId, user_id: sp.uid, event_titre: eventTitre,
          user_nom: [prenom, nom].filter(Boolean).join(' ') || null, user_email: email || null,
          type, statut: 'inscrit',
        })
      }
    } else {
      // Visiteur : enregistrer l'intérêt comme lead (best-effort, schéma chapelle).
      await supabaseAdmin.schema('chapelle').from('form_submissions').insert({
        form_slug: `event:${eventId}`, source: 'evenement', email,
        payload: { prenom, event_titre: eventTitre, type },
      })
    }
  } catch (err) {
    // La persistance ne doit jamais empêcher la confirmation à l'utilisateur.
    console.error('[evenements/inscription] persistance', err)
  }

  // ── Accusé de réception ─────────────────────────────────────────────────────
  let delivered = false
  if (email) {
    try {
      const { subject, html } = eventRegistrationEmail(prenom || 'cher ami', eventTitre, eventDate)
      const r = await sendEmail({ to: email, subject, html })
      delivered = !!r?.ok
    } catch { /* non bloquant */ }
  }

  return NextResponse.json({ ok: true, delivered, message: 'Votre inscription est confirmée.' })
}
