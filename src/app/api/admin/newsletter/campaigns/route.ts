import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Back-office — Campagnes newsletter.
 *   GET                          → liste des campagnes
 *   POST   { sujet, contenu, audience, scheduled_at?, status? }
 *   PATCH  { id, action?: 'send' | 'schedule', ... }
 *   DELETE { id }
 *
 * Garde : cookie admin. Écriture via service role.
 * NB : l'expédition réelle d'emails n'est pas branchée — « Envoyer maintenant »
 * marque la campagne comme envoyée (statut + date + nb destinataires).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'
const guard = (req: NextRequest) =>
  !isAdminRequest(req)
    ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
    : null

/** Emails des abonnés correspondant à l'audience choisie. */
async function audienceEmails(audience: string): Promise<string[]> {
  let q = supabaseAdmin.from('newsletter_subscribers').select('email')
  if (audience && audience !== 'tous') q = q.eq('source', audience)
  const { data } = await q
  return (data || []).map((r: any) => r.email).filter(Boolean)
}

/**
 * Envoi réel via Resend si RESEND_API_KEY est configurée (sinon : simulation).
 * Renvoie le nombre d'emails effectivement expédiés.
 */
async function sendViaProvider(emails: string[], sujet: string, contenu: string): Promise<{ sent: number; provider: string }> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.NEWSLETTER_FROM || 'Citadelle du Royaume <newsletter@chapelleduroyaume.org>'
  if (!key || emails.length === 0) return { sent: 0, provider: 'none' }
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6">${(contenu || '').replace(/\n/g, '<br/>')}</div>`
  // Envoi individuel (plafonné pour rester dans les limites d'une requête serverless).
  const targets = emails.slice(0, 200)
  const results = await Promise.allSettled(targets.map((to) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: sujet, html }),
    }).then((r) => { if (!r.ok) throw new Error(String(r.status)) })
  ))
  return { sent: results.filter((r) => r.status === 'fulfilled').length, provider: 'resend' }
}

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const { data, error } = await supabaseAdmin.from('newsletter_campaigns').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.sujet) return NextResponse.json({ ok: false, message: 'Sujet requis.' }, { status: 400 })
  const status = body.scheduled_at ? 'scheduled' : (body.status || 'draft')
  const { data, error } = await supabaseAdmin.from('newsletter_campaigns').insert({
    sujet: body.sujet, contenu: body.contenu || null,
    audience: body.audience || 'tous',
    scheduled_at: body.scheduled_at || null, status,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })

  let patch: Record<string, any> = {}
  let info: { provider: string } | null = null
  if (body.action === 'send') {
    const { data: c } = await supabaseAdmin.from('newsletter_campaigns').select('audience, sujet, contenu').eq('id', body.id).single()
    const emails = await audienceEmails(c?.audience || 'tous')
    // Envoi réel si un fournisseur est configuré ; sinon on enregistre l'envoi (simulation).
    const res = await sendViaProvider(emails, c?.sujet || '', c?.contenu || '')
    const count = res.provider === 'resend' ? res.sent : emails.length
    patch = { status: 'sent', sent_at: new Date().toISOString(), recipients_count: count }
    info = { provider: res.provider }
  } else {
    const { action, id, ...rest } = body
    patch = { ...rest }
    if (rest.scheduled_at && !rest.status) patch.status = 'scheduled'
  }
  const { error } = await supabaseAdmin.from('newsletter_campaigns').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, ...(info || {}) })
}

export async function DELETE(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('newsletter_campaigns').delete().eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
