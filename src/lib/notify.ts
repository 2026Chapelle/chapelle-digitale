import { supabaseAdmin } from '@/lib/supabase'

/**
 * Émission de notifications (source de vérité `app_notifications`).
 * Insertion via service role → délivrée en TEMPS RÉEL aux clients abonnés
 * (Supabase Realtime) et persistée pour l'état lu serveur multi-appareils.
 * Jamais bloquant : toute erreur est avalée (la notif n'est pas critique).
 */
export type NotifType = 'don' | 'priere' | 'formation' | 'achat' | 'live' | 'evenement' | 'membre' | 'systeme' | 'info'
export type Audience = 'members' | 'all' | 'admin'

interface NotifInput { type?: NotifType; title: string; body?: string; href?: string; meta?: Record<string, unknown> }

/** Notification CIBLÉE à un membre. */
export async function notifyUser(userId: string | null | undefined, n: NotifInput): Promise<void> {
  if (!userId) return
  try {
    await supabaseAdmin.from('app_notifications').insert({
      user_id: userId, audience: 'user', type: n.type || 'info',
      title: n.title, body: n.body ?? null, href: n.href ?? null, meta: n.meta ?? null,
    })
  } catch { /* non bloquant */ }
}

/** Notification DIFFUSÉE (tous les membres / tous / admins). */
export async function notifyBroadcast(audience: Audience, n: NotifInput): Promise<void> {
  try {
    await supabaseAdmin.from('app_notifications').insert({
      user_id: null, audience, type: n.type || 'info',
      title: n.title, body: n.body ?? null, href: n.href ?? null, meta: n.meta ?? null,
    })
  } catch { /* non bloquant */ }
}
