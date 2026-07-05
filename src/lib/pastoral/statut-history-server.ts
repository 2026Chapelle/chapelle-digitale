/**
 * P4 — Analyse des CONVERSIONS de statut (exploitation de membre_statut_history).
 * Lecture service role + agrégation JS via les fonctions PURES de metrics.ts.
 * Aucune RPC, aucune migration. Surfaçé dans le cockpit /admin/gouvernement.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { conversionsOverTime, topTransitions, classifyActivity } from '@/lib/pastoral/metrics'

const DAY = 86_400_000

function emptyAnalytics(granularity: 'week' | 'month') {
  return { granularity, conversions_over_time: [], top_transitions: [], total_transitions: 0, nb_membres: 0, retention: 0 }
}

/** Analyse des conversions sur 12 mois (optionnellement bornée à un pays). */
export async function getConversionsAnalytics(opts: { pays?: string | null; granularity?: 'week' | 'month'; nowMs?: number } = {}) {
  const granularity = opts.granularity === 'week' ? 'week' : 'month'
  const nowMs = opts.nowMs ?? Date.now()
  const since = new Date(nowMs - 365 * DAY).toISOString()

  // La table n'a pas de colonne pays → restreindre via profiles si demandé.
  let userIds: string[] | null = null
  if (opts.pays) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('pays', opts.pays)
    userIds = (data || []).map((p: any) => p.id)
    if (!userIds.length) return emptyAnalytics(granularity)
  }

  let q: any = supabaseAdmin.from('membre_statut_history')
    .select('user_id, ancien_statut, nouveau_statut, created_at')
    .gte('created_at', since).order('created_at', { ascending: false }).limit(5000)
  if (userIds) q = q.in('user_id', userIds)
  const { data: rows } = await q
  const list = rows || []

  // Rétention : part des membres ayant un historique encore ACTIFS (acquis classifyActivity).
  const memberIds = Array.from(new Set(list.map((r: any) => r.user_id))) as string[]
  let actifs = 0
  if (memberIds.length) {
    const { data: profs } = await supabaseAdmin.from('profiles').select('id, derniere_connexion').in('id', memberIds)
    for (const p of profs || []) if (classifyActivity(p.derniere_connexion, nowMs) === 'actif') actifs++
  }

  return {
    granularity,
    conversions_over_time: conversionsOverTime(list, granularity),
    top_transitions: topTransitions(list, 8),
    total_transitions: list.length,
    nb_membres: memberIds.length,
    retention: memberIds.length ? Math.round((actifs / memberIds.length) * 100) : 0,
  }
}
