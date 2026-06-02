import 'server-only'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Journal d'activité — enregistrement serveur (service role) des actions RÉELLES.
 *
 * CONFIDENTIALITÉ : ne JAMAIS appeler pour la prière ou la cure d'âme.
 * Best-effort, jamais bloquant.
 */
export type ActivityAction = 'don' | 'live_view' | 'video_view' | 'pdf_download'

export interface ActivityInput {
  userId?: string | null
  nom?: string | null
  email?: string | null
  action_type: ActivityAction
  resource_type?: string | null
  resource_id?: string | null
  resource_title?: string | null
  amount?: number | null
  currency?: string | null
  source?: string | null
  pays?: string | null
  metadata?: Record<string, any> | null
}

export async function logActivity(a: ActivityInput): Promise<void> {
  if (IS_DEMO_MODE) return
  try {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: a.userId ?? null,
      nom: a.nom ?? null,
      email: a.email ?? null,
      action_type: a.action_type,
      resource_type: a.resource_type ?? null,
      resource_id: a.resource_id ?? null,
      resource_title: a.resource_title ?? null,
      amount: a.amount ?? null,
      currency: a.currency ?? null,
      source: a.source ?? null,
      pays: a.pays ?? null,
      metadata: a.metadata ?? null,
    })
  } catch (e) {
    console.error('[activity] log échoué', (e as any)?.message)
  }
}
