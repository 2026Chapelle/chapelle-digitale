/**
 * P3 — DASHBOARD PLATEFORME (lecture seule). Agrège, PAR plateforme, les acquis
 * existants : profiles (membres, score_engagement persisté, activité), groupes,
 * membres_groupe (leaders), présence (presenceOverview), conversions
 * (membre_statut_history + purs), alertes (pastoral_alerts), croissance (bucketGrowth).
 * JS V1, aucune nouvelle table/RPC. Optionnellement borné à un pays (scope national).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { PLATFORMS, platformLabel, aggregatePlatformMembers } from '@/lib/platforms'
import { bucketGrowth, conversionsOverTime, topTransitions, classifyActivity } from '@/lib/pastoral/metrics'
import { presenceOverview } from '@/lib/community/presences-server'

const DAY = 86_400_000
const MAX_IN = 5000

function scopedProfiles(select: string, pays?: string | null) {
  let q: any = supabaseAdmin.from('profiles').select(select).is('archived_at', null).limit(20000)
  if (pays) q = q.eq('pays', pays)
  return q
}

/** Vue GLOBALE des 8 plateformes (KPIs légers). */
export async function getAllPlatformsOverview(opts: { pays?: string | null; nowMs?: number } = {}) {
  const nowMs = opts.nowMs ?? Date.now()

  const { data: profs } = await scopedProfiles('id, plateforme_principale, score_engagement, derniere_connexion', opts.pays)
  const memberStats = aggregatePlatformMembers(profs || [], nowMs)
  const platOfMember: Record<string, string> = {}
  for (const p of profs || []) platOfMember[p.id] = p.plateforme_principale || '—'

  // Groupes + leaders par plateforme
  let gq: any = supabaseAdmin.from('groupes').select('id, plateforme_id, responsable_id').eq('statut', 'actif').limit(20000)
  if (opts.pays) gq = gq.eq('pays', opts.pays)
  const { data: groups } = await gq
  const groupesByPlat: Record<string, number> = {}
  const groupPlat: Record<string, string> = {}
  for (const g of groups || []) {
    const k = g.plateforme_id || '—'
    groupesByPlat[k] = (groupesByPlat[k] || 0) + 1
    groupPlat[g.id] = k
  }
  // Leaders distincts par plateforme
  const groupIds = (groups || []).map((g: any) => g.id)
  const leadersByPlat: Record<string, Set<string>> = {}
  if (groupIds.length) {
    const { data: leaders } = await supabaseAdmin.from('membres_groupe')
      .select('user_id, groupe_id, role').eq('statut', 'actif').in('role', ['leader', 'co-leader']).in('groupe_id', groupIds.slice(0, MAX_IN))
    for (const l of leaders || []) {
      const k = groupPlat[l.groupe_id]; if (!k) continue
      ;(leadersByPlat[k] = leadersByPlat[k] || new Set()).add(l.user_id)
    }
  }

  // Présence par plateforme (réutilise presenceOverview)
  const pres = await presenceOverview({ pays: opts.pays })
  const presByPlat: Record<string, number> = {}
  for (const row of pres.par_plateforme) presByPlat[row.key] = row.stats.taux_presence

  // Alertes ouvertes par plateforme
  const { data: alerts } = await supabaseAdmin.from('pastoral_alerts').select('member_id, status').neq('status', 'resolue').limit(20000)
  const alertsByPlat: Record<string, number> = {}
  for (const a of alerts || []) {
    const k = platOfMember[a.member_id]; if (!k) continue
    alertsByPlat[k] = (alertsByPlat[k] || 0) + 1
  }

  return PLATFORMS.map((p) => {
    const ms = memberStats.get(p.slug)
    return {
      slug: p.slug, label: p.label,
      membres: ms?.membres || 0,
      engagement_moyen: ms?.engagement_moyen || 0,
      retention: ms?.retention || 0,
      groupes: groupesByPlat[p.slug] || 0,
      leaders: leadersByPlat[p.slug]?.size || 0,
      taux_presence: presByPlat[p.slug] || 0,
      alertes_ouvertes: alertsByPlat[p.slug] || 0,
    }
  })
}

/** Vue DÉTAILLÉE d'une plateforme. */
export async function getPlatformDetail(slug: string, opts: { pays?: string | null; nowMs?: number } = {}) {
  const nowMs = opts.nowMs ?? Date.now()

  // Membres de la plateforme
  let pq: any = supabaseAdmin.from('profiles').select('id, score_engagement, derniere_connexion, created_at').is('archived_at', null).eq('plateforme_principale', slug).limit(20000)
  if (opts.pays) pq = pq.eq('pays', opts.pays)
  const { data: profs } = await pq
  const members = profs || []
  const memberIds = members.map((m: any) => m.id).slice(0, MAX_IN)
  const stats = aggregatePlatformMembers(members.map((m: any) => ({ plateforme_principale: slug, score_engagement: m.score_engagement, derniere_connexion: m.derniere_connexion })), nowMs).get(slug)
    || { membres: 0, engagement_moyen: 0, actifs: 0, retention: 0 }
  const croissance = bucketGrowth(members.map((m: any) => m.created_at), 'month').slice(-6)

  // Groupes + leaders
  let gq: any = supabaseAdmin.from('groupes').select('id').eq('statut', 'actif').eq('plateforme_id', slug).limit(20000)
  if (opts.pays) gq = gq.eq('pays', opts.pays)
  const { data: groups } = await gq
  const groupIds = (groups || []).map((g: any) => g.id)
  let leaders = 0
  if (groupIds.length) {
    const { data: l } = await supabaseAdmin.from('membres_groupe').select('user_id').eq('statut', 'actif').in('role', ['leader', 'co-leader']).in('groupe_id', groupIds.slice(0, MAX_IN))
    leaders = new Set((l || []).map((x: any) => x.user_id)).size
  }

  // Présence (réutilise presenceOverview filtré plateforme)
  const presence = (await presenceOverview({ plateforme: slug, pays: opts.pays })).global

  // Conversions (membre_statut_history des membres de la plateforme — purs)
  let conversions_over_time: any[] = []
  let top_transitions: any[] = []
  let total_transitions = 0
  if (memberIds.length) {
    const since = new Date(nowMs - 365 * DAY).toISOString()
    const { data: hist } = await supabaseAdmin.from('membre_statut_history')
      .select('ancien_statut, nouveau_statut, created_at').gte('created_at', since).in('user_id', memberIds).limit(5000)
    const list = hist || []
    total_transitions = list.length
    conversions_over_time = conversionsOverTime(list, 'month').slice(-6)
    top_transitions = topTransitions(list, 5)
  }

  // Alertes ouvertes liées
  let alertes_ouvertes = 0
  if (memberIds.length) {
    const { count } = await supabaseAdmin.from('pastoral_alerts').select('id', { count: 'exact', head: true }).neq('status', 'resolue').in('member_id', memberIds)
    alertes_ouvertes = count || 0
  }

  return {
    slug, label: platformLabel(slug),
    membres: stats.membres,
    engagement_moyen: stats.engagement_moyen,
    actifs: stats.actifs,
    retention: stats.retention,
    groupes: groupIds.length,
    leaders,
    presence: { taux_presence: presence.taux_presence, taux_assiduite: presence.taux_assiduite, present: presence.present, absent: presence.absent, excuse: presence.excuse, total: presence.total },
    conversions: { conversions_over_time, top_transitions, total_transitions },
    alertes_ouvertes,
    croissance,
  }
}
