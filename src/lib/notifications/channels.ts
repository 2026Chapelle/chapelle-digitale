/**
 * MOTEUR DE NOTIFICATIONS À CANAUX (serveur).
 *
 * Un déclencheur émet une INTENTION ; le moteur la diffuse sur tous les canaux
 * ACTIVÉS. V1 : un seul canal actif (in-app → app_notifications, temps réel).
 * Ajouter Email / WhatsApp / Push / SMS plus tard = enregistrer un canal ici,
 * SANS modifier les déclencheurs. Anti-doublon par `dedup_key`.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, emailLayout } from '@/lib/email'
import { siteUrl } from '@/lib/site-url'

export type Audience = 'members' | 'all' | 'admin'
export type ChannelId = 'in_app' | 'email'

export interface NotificationIntent {
  target: { userId?: string | null; audience?: Audience }
  type?: string
  title: string
  body?: string
  href?: string
  dedupKey?: string
  meta?: Record<string, unknown>
  /** Canaux souhaités. Défaut : in-app uniquement. */
  channels?: ChannelId[]
}

export interface NotificationChannel {
  id: string
  enabled(): boolean
  deliver(intent: NotificationIntent): Promise<void>
}

/** Une notif avec ce dedup_key existe-t-elle déjà pour cette cible ? */
async function alreadySent(intent: NotificationIntent): Promise<boolean> {
  if (!intent.dedupKey) return false
  try {
    let q = supabaseAdmin.from('app_notifications').select('id', { count: 'exact', head: true }).eq('dedup_key', intent.dedupKey)
    if (intent.target.userId) q = q.eq('user_id', intent.target.userId)
    else if (intent.target.audience) q = q.is('user_id', null).eq('audience', intent.target.audience)
    const { count } = await q
    return (count ?? 0) > 0
  } catch { return false }
}

/** Canal IN-APP : écrit dans app_notifications (push temps réel via Supabase Realtime). */
const inAppChannel: NotificationChannel = {
  id: 'in_app',
  enabled: () => true,
  async deliver(intent) {
    if (await alreadySent(intent)) return
    try {
      await supabaseAdmin.from('app_notifications').insert({
        user_id: intent.target.userId ?? null,
        audience: intent.target.userId ? 'user' : (intent.target.audience || 'members'),
        type: intent.type || 'info',
        title: intent.title, body: intent.body ?? null, href: intent.href ?? null,
        meta: intent.meta ?? null, dedup_key: intent.dedupKey ?? null,
      })
    } catch { /* non bloquant */ }
  },
}

/**
 * Canal EMAIL (Resend/SMTP via lib/email). Seulement pour les intents CIBLÉS
 * (userId) qui le demandent, et si le membre a activé `notifications_email`.
 */
const emailChannel: NotificationChannel = {
  id: 'email',
  enabled: () => !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
  async deliver(intent) {
    if (!intent.target.userId) return // pas d'email pour les diffusions ici (cf. campagnes)
    try {
      const { data: prof } = await supabaseAdmin.from('profiles')
        .select('email, prenom, notifications_email').eq('id', intent.target.userId).maybeSingle()
      if (!prof?.email || prof.notifications_email === false) return
      await sendEmail({
        to: prof.email,
        subject: intent.title,
        html: emailLayout({
          title: intent.title,
          body: `<p style="margin:0 0 12px">${(intent.body || '').replace(/</g, '&lt;')}</p>`,
          cta: intent.href ? { label: 'Ouvrir', href: siteUrl(intent.href) } : undefined,
        }),
      })
    } catch { /* non bloquant */ }
  },
}

/**
 * Registre des canaux. V1 actifs : in-app (défaut) + email (opt-in par intent).
 * Futur : whatsappChannel / pushChannel / smsChannel — aucun déclencheur à toucher.
 */
export const CHANNELS: NotificationChannel[] = [inAppChannel, emailChannel]

/** Diffuse une intention sur les canaux DEMANDÉS et activés (jamais bloquant). */
export async function dispatch(intent: NotificationIntent): Promise<void> {
  const wanted: ChannelId[] = intent.channels && intent.channels.length ? intent.channels : ['in_app']
  await Promise.allSettled(CHANNELS.filter((c) => c.enabled() && wanted.includes(c.id as ChannelId)).map((c) => c.deliver(intent)))
}
