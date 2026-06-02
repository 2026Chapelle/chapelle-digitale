import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Notification email d'un nouveau message de contact (best-effort, non bloquant).
 * Envoie via l'API Resend SI `RESEND_API_KEY` est défini ; sinon no-op silencieux.
 * Destinataire : ADMIN_NOTIFY_EMAIL ou elusduroyaume@gmail.com par défaut.
 *
 * Le message est déjà enregistré en base côté client (anon + RLS) ; cette route
 * ne fait qu'avertir l'admin. Aucune donnée sensible, aucune clé exposée.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const key = process.env.RESEND_API_KEY
  if (!key) return NextResponse.json({ ok: true, skipped: 'RESEND_API_KEY non configurée' })
  try {
    const { nom, email, sujet, message } = await req.json().catch(() => ({}))
    const to = process.env.ADMIN_NOTIFY_EMAIL || 'elusduroyaume@gmail.com'
    const from = process.env.EMAIL_FROM || 'Citadelle <onboarding@resend.dev>'
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: email,
        subject: `[Citadelle · Contact] ${sujet || 'Nouveau message'} — ${nom || ''}`.trim(),
        text: `Nouveau message de contact :\n\nNom : ${nom}\nEmail : ${email}\nObjet : ${sujet}\n\n${message}`,
      }),
    })
    return NextResponse.json({ ok: resp.ok })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' })
  }
}
