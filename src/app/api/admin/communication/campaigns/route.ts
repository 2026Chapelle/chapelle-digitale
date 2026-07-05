import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { resolveAudience, renderTemplate } from '@/lib/communication/audience'
import { dispatch } from '@/lib/notifications/channels'
import { sendEmail, emailLayout } from '@/lib/email'
import { siteUrl } from '@/lib/site-url'

/**
 * Campagnes de communication ciblées membres (email et/ou in-app).
 *   GET                                   → liste
 *   POST   { sujet, body, channel, target, template_id?, scheduled_at? }
 *   PATCH  { id, action?: 'send', ...patch }
 *   DELETE { id }
 * Garde : cookie admin. Service role. Envoi email via Resend/SMTP + pixel d'ouverture.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_BATCH = 300

const guard = (req: NextRequest) => (!isAdminRequest(req) ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 }) : null)

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const { data, error } = await supabaseAdmin.from('communication_campaigns').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data || [] })
}

export async function POST(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.sujet) return NextResponse.json({ ok: false, message: 'Sujet requis.' }, { status: 400 })
  const channel = ['email', 'in_app', 'both'].includes(b.channel) ? b.channel : 'in_app'
  const status = b.scheduled_at ? 'scheduled' : 'draft'
  const { data, error } = await supabaseAdmin.from('communication_campaigns').insert({
    sujet: b.sujet, body: b.body || null, channel, target: b.target || {}, template_id: b.template_id || null,
    scheduled_at: b.scheduled_at || null, status,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })

  if (b.action !== 'send') {
    const { action, id, ...patch } = b
    const { error } = await supabaseAdmin.from('communication_campaigns').update(patch).eq('id', b.id)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  // ── Envoi ──
  const { data: c } = await supabaseAdmin.from('communication_campaigns').select('sujet, body, channel, target').eq('id', b.id).single()
  if (!c) return NextResponse.json({ ok: false, message: 'Campagne introuvable.' }, { status: 404 })
  const recipients = await resolveAudience(c.target)

  // In-app (temps réel via le moteur Notifications)
  if (c.channel === 'in_app' || c.channel === 'both') {
    await Promise.allSettled(recipients.map((r) => dispatch({
      target: { userId: r.id }, type: 'systeme', title: c.sujet,
      body: renderTemplate(c.body || '', { prenom: r.prenom || '' }),
      href: '/member/dashboard/notifications', dedupKey: `campaign:${b.id}:${r.id}`, channels: ['in_app'],
    })))
  }

  // Email (Resend/SMTP) + pixel d'ouverture + journal
  let emailsSent = 0
  if (c.channel === 'email' || c.channel === 'both') {
    const targets = recipients.filter((r) => r.email).slice(0, EMAIL_BATCH)
    const results = await Promise.allSettled(targets.map(async (r) => {
      const pixel = siteUrl(`/api/track/open?c=${b.id}&u=${r.id}`)
      const html = emailLayout({ title: c.sujet, body: `<p style="margin:0 0 12px">${renderTemplate(c.body || '', { prenom: r.prenom || '' }).replace(/\n/g, '<br/>')}</p>` })
        + `<img src="${pixel}" width="1" height="1" alt="" style="display:none" />`
      await sendEmail({ to: r.email!, subject: c.sujet, html })
      await supabaseAdmin.from('communication_log').insert({ campaign_id: b.id, channel: 'email', recipient_id: r.id, email: r.email, status: 'sent' }).then(() => {}, () => {})
    }))
    emailsSent = results.filter((x) => x.status === 'fulfilled').length
  }

  await supabaseAdmin.from('communication_campaigns').update({
    status: 'sent', sent_at: new Date().toISOString(), recipients_count: recipients.length,
  }).eq('id', b.id)
  return NextResponse.json({ ok: true, recipients: recipients.length, emails_sent: emailsSent })
}

export async function DELETE(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('communication_campaigns').delete().eq('id', b.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
