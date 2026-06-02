import 'server-only'
import { SITE_URL } from '@/lib/site-url'

/**
 * Service d'email unifié de la Citadelle (Resend).
 *
 * Point d'entrée UNIQUE pour tout email transactionnel : reçus de dons,
 * séquences d'intégration, notifications de prière, confirmations…
 *
 * Principe « zéro fictif » : sans `RESEND_API_KEY`, on N'INVENTE PAS un envoi
 * réussi — on renvoie `{ ok:false, skipped:true }` et on journalise, pour que
 * l'appelant puisse marquer l'email comme « préparé, envoi à configurer ».
 *
 * Implémentation via l'API HTTP Resend (fetch) pour rester compatible avec le
 * build standalone portable (aucune dépendance de bundler).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Expéditeur par défaut (surchargé par EMAIL_FROM / NEWSLETTER_FROM). */
export const DEFAULT_FROM =
  process.env.EMAIL_FROM ||
  process.env.NEWSLETTER_FROM ||
  'Citadelle du Royaume <info@chapelleduroyaume.org>'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  /** Corps HTML déjà composé. Si absent, on enveloppe `text` dans le layout. */
  html?: string
  /** Texte brut (fallback + version texte). */
  text?: string
  from?: string
  replyTo?: string
  /** Titre affiché dans l'en-tête doré du layout (si on utilise emailLayout). */
  cc?: string | string[]
  bcc?: string | string[]
}

export interface SendEmailResult {
  ok: boolean
  /** true si aucun fournisseur n'est configuré (email non envoyé, sans erreur). */
  skipped?: boolean
  id?: string
  error?: string
}

const isConfigured = () => Boolean(process.env.RESEND_API_KEY)

/** Envoie un email. Sûr à appeler partout : ne jette jamais. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY
  const recipients = Array.isArray(input.to) ? input.to : [input.to]
  const cleanRecipients = recipients.map((r) => r.trim()).filter(Boolean)

  if (cleanRecipients.length === 0) {
    return { ok: false, error: 'Aucun destinataire.' }
  }

  if (!key) {
    // Pas de fournisseur : on ne simule pas un succès.
    console.warn(`[email] RESEND_API_KEY absente — email "${input.subject}" NON envoyé (préparé).`)
    return { ok: false, skipped: true }
  }

  const html = input.html ?? emailLayout({ title: input.subject, body: `<p>${escapeHtml(input.text || '')}</p>` })

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: input.from || DEFAULT_FROM,
        to: cleanRecipients,
        subject: input.subject,
        html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.cc ? { cc: input.cc } : {}),
        ...(input.bcc ? { bcc: input.bcc } : {}),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[email] Resend ${res.status} pour "${input.subject}": ${detail}`)
      return { ok: false, error: `Resend ${res.status}` }
    }
    const data = await res.json().catch(() => ({}))
    return { ok: true, id: data?.id }
  } catch (e: any) {
    console.error('[email] échec réseau Resend:', e?.message)
    return { ok: false, error: e?.message || 'Erreur réseau' }
  }
}

/** Indique à l'appelant si l'envoi réel est possible (UI : bandeau « à configurer »). */
export const emailProviderReady = isConfigured

interface LayoutInput {
  title: string
  /** Contenu HTML interne (paragraphes, etc.). */
  body: string
  /** CTA optionnel affiché en bouton doré. */
  cta?: { label: string; href: string }
  /** Petite ligne de contexte sous le titre (pré-en-tête). */
  preheader?: string
}

const BRAND = {
  gold: '#D4AF37',
  purple: '#4B0082',
  charbon: '#0E0E12',
  pearl: '#F5F3EE',
}

/**
 * Enveloppe HTML premium, compatible clients mail (tables + styles inline).
 * Réutilisée par tous les emails transactionnels pour une identité cohérente.
 */
export function emailLayout({ title, body, cta, preheader }: LayoutInput): string {
  const ctaBlock = cta
    ? `<tr><td style="padding:8px 0 24px">
         <a href="${cta.href}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.charbon};text-decoration:none;font-weight:700;padding:14px 28px;border-radius:9999px;font-family:Arial,Helvetica,sans-serif;font-size:15px">${escapeHtml(cta.label)}</a>
       </td></tr>`
    : ''

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.charbon};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.charbon};padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#16161c;border:1px solid rgba(212,175,55,0.2);border-radius:18px;overflow:hidden">
      <tr><td style="background:linear-gradient(135deg,${BRAND.purple},${BRAND.charbon});padding:28px 32px;border-bottom:1px solid rgba(212,175,55,0.25)">
        <div style="font-family:Georgia,'Times New Roman',serif;color:${BRAND.gold};font-size:13px;letter-spacing:2px;text-transform:uppercase">Citadelle du Royaume</div>
        <div style="font-family:Arial,Helvetica,sans-serif;color:${BRAND.pearl};font-size:22px;font-weight:700;margin-top:6px">${escapeHtml(title)}</div>
      </td></tr>
      <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;color:rgba(245,243,238,0.85);font-size:15px;line-height:1.7">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td>
          ${body}
        </td></tr>${ctaBlock}</table>
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);font-family:Arial,Helvetica,sans-serif;color:rgba(245,243,238,0.4);font-size:12px;line-height:1.6">
        La Chapelle Internationale des Élus du Royaume — Abidjan, Côte d'Ivoire<br>
        <a href="${SITE_URL}" style="color:${BRAND.gold};text-decoration:none">${SITE_URL.replace(/^https?:\/\//, '')}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

/** Échappe le HTML pour insérer du texte utilisateur en toute sécurité. */
export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
