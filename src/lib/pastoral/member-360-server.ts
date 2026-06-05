/**
 * DOSSIER PASTORAL 360° — agrégation serveur (service role).
 *
 * Assemble la vue complète d'un membre à partir des tables existantes. Chaque
 * domaine est isolé (try/catch) : une table absente ou vide ne casse pas le reste.
 * Aucune donnée fictive — uniquement le réel.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { getIntegrationProgress } from '@/lib/formations/integration-progress-server'
import { engagementBand } from '@/lib/pastoral/metrics'
import { getPermissions } from '@/lib/permissions'
import { memberGroups } from '@/lib/community/groups-server'
import { memberAttendanceSummary } from '@/lib/community/presences-server'

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch { return fallback }
}

export async function getMemberDossier(memberId: string) {
  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', memberId).maybeSingle()
  if (!profile) return null
  const email: string | null = profile.email ?? null

  // Responsable de suivi (berger_id)
  const responsable = profile.berger_id
    ? await safe(async () => {
        const { data } = await supabaseAdmin.from('profiles').select('id, prenom, nom, email').eq('id', profile.berger_id).maybeSingle()
        return data
      }, null)
    : null

  // Historique des statuts + notes pastorales
  const statut_history = await safe(async () => {
    const { data } = await supabaseAdmin.from('membre_statut_history')
      .select('ancien_statut, nouveau_statut, source, created_at')
      .eq('user_id', memberId).order('created_at', { ascending: false }).limit(50)
    return data || []
  }, [])
  const notes = await safe(async () => {
    const { data } = await supabaseAdmin.from('pastoral_notes')
      .select('id, note, type, author_nom, created_at')
      .eq('member_id', memberId).order('created_at', { ascending: false }).limit(100)
    return data || []
  }, [])

  // Vie spirituelle
  const integration = await safe(() => getIntegrationProgress(memberId), {
    parcoursId: null, parcours: [], overall_pct: 0, current_slug: null, next_slug: null, integration_complete: false,
  } as any)
  const formations = await safe(async () => {
    const { data } = await supabaseAdmin.from('inscriptions_formation')
      .select('formation_id, statut, progression, formation:formations(titre, slug)')
      .eq('user_id', memberId)
    return data || []
  }, [])
  const modules_termines = await safe(async () => {
    const { count } = await supabaseAdmin.from('module_completions')
      .select('*', { count: 'exact', head: true }).eq('user_id', memberId)
    return count ?? 0
  }, 0)
  const certificats = await safe(async () => {
    const { data } = await supabaseAdmin.from('certificats')
      .select('id, titre, type, reference, delivre_le')
      .eq('user_id', memberId).order('delivre_le', { ascending: false })
    return data || []
  }, [])

  // Activité
  const connexions = await safe(async () => {
    const { data } = await supabaseAdmin.from('activity_logs')
      .select('action_type, resource_title, created_at')
      .eq('user_id', memberId).order('created_at', { ascending: false }).limit(15)
    return data || []
  }, [])
  const evenements = await safe(async () => {
    const { data } = await supabaseAdmin.from('event_registrations')
      .select('event_titre, type, statut, created_at')
      .eq('user_id', memberId).order('created_at', { ascending: false }).limit(30)
    return data || []
  }, [])
  const groupes = await safe(async () => {
    const { data } = await supabaseAdmin.from('group_join_requests')
      .select('group_nom, statut, created_at')
      .eq('user_id', memberId).order('created_at', { ascending: false }).limit(30)
    return data || []
  }, [])

  // Communauté RÉELLE (membres_groupe) — appartenances actives/en attente + groupe principal.
  const communaute = await safe(async () => {
    const rows = await memberGroups(memberId)
    const respIds = Array.from(new Set(rows.map((r: any) => r.groupe?.responsable_id).filter(Boolean)))
    const resp: Record<string, any> = {}
    if (respIds.length) {
      const { data } = await supabaseAdmin.from('profiles').select('id, prenom, nom').in('id', respIds)
      for (const p of data || []) resp[p.id] = p
    }
    return rows.map((r: any) => ({
      groupe_id: r.groupe_id, nom: r.groupe?.nom ?? null, type: r.groupe?.type ?? null,
      plateforme_id: r.groupe?.plateforme_id ?? null, ville: r.groupe?.ville ?? null,
      role: r.role, is_primary: !!r.is_primary, statut: r.statut,
      responsable: r.groupe?.responsable_id ? (resp[r.groupe.responsable_id] || null) : null,
    }))
  }, [] as any[])
  const groupesActifs = communaute.filter((g: any) => g.statut === 'actif')

  // Assiduité RÉELLE (Chantier 4) — taux de présence + dernières réunions.
  const presence = await safe(() => memberAttendanceSummary(memberId), {
    stats: { total: 0, present: 0, absent: 0, excuse: 0, taux_presence: 0, taux_assiduite: 0 }, recent: [] as any[],
  })
  const prieres = await safe(async () => {
    const { data } = await supabaseAdmin.from('priere_demandes')
      .select('sujet, statut, created_at')
      .eq('user_id', memberId).order('created_at', { ascending: false }).limit(30)
    return data || []
  }, [])
  const messages = email ? await safe(async () => {
    const { data } = await supabaseAdmin.from('contact_messages')
      .select('sujet, statut, created_at')
      .eq('email', email).order('created_at', { ascending: false }).limit(30)
    return data || []
  }, []) : []

  // Générosité (dons déclarés via le journal giving, rapprochés par email)
  type Generosite = { count: number; total: number; currency: string; dernier: any; liste: any[] }
  const generositeFallback: Generosite = { count: 0, total: 0, currency: 'EUR', dernier: null, liste: [] }
  const generosite: Generosite = email ? await safe<Generosite>(async () => {
    const { data } = await supabaseAdmin.from('giving_transactions_log')
      .select('amount, currency, created_at')
      .eq('email', email).not('amount', 'is', null).order('created_at', { ascending: false }).limit(2000)
    const rows = (data || []).filter((x: any) => Number(x.amount) > 0)
    const total = rows.reduce((s: number, x: any) => s + Number(x.amount || 0), 0)
    return { count: rows.length, total, currency: rows[0]?.currency || 'EUR', dernier: rows[0] || null, liste: rows.slice(0, 10) }
  }, generositeFallback) : generositeFallback

  // Historique des changements de rôle (journal RBAC)
  const role_history = await safe(async () => {
    const { data } = await supabaseAdmin.from('pastoral_actions_log')
      .select('detail, admin_nom, created_at').eq('member_id', memberId).eq('action', 'set_role')
      .order('created_at', { ascending: false }).limit(20)
    return data || []
  }, [] as any[])

  // Alertes pastorales PERSISTÉES (suivi/escalade) — distinctes des indices live
  const alerts_suivi = await safe(async () => {
    const { data } = await supabaseAdmin.from('pastoral_alerts')
      .select('id, type, level, status, escalation_level, created_at, taken_at, resolved_at')
      .eq('member_id', memberId).order('created_at', { ascending: false }).limit(30)
    return data || []
  }, [] as any[])

  // Score d'engagement (RÉEL : profiles.score_engagement) + bande
  const scoreValue = Number(profile.score_engagement ?? 0)
  const score = { value: scoreValue, band: engagementBand(scoreValue) }

  // Permissions effectives + espaces visibles (RBAC, source unique)
  const perms = Array.from(getPermissions({ role: profile.role, membre_statut: profile.membre_statut }))

  // Alertes pastorales (toutes dérivées du RÉEL ; rien d'inventé)
  const nowMs = Date.now()
  const lastSeenDays = profile.derniere_connexion ? Math.floor((nowMs - new Date(profile.derniere_connexion).getTime()) / 86_400_000) : null
  const alertes: { level: 'info' | 'warn' | 'alert'; label: string }[] = []
  if (lastSeenDays === null) alertes.push({ level: 'warn', label: 'Jamais connecté' })
  else if (lastSeenDays > 30) alertes.push({ level: 'warn', label: `Inactif depuis ${lastSeenDays} jours` })
  if (groupesActifs.length === 0) alertes.push({ level: 'info', label: 'Aucun groupe rejoint' })
  const prieresOuvertes = prieres.filter((p: any) => ['nouvelle', 'en_priere'].includes(p.statut)).length
  if (prieresOuvertes > 0) alertes.push({ level: 'alert', label: `${prieresOuvertes} demande(s) de prière non traitée(s)` })
  if (!profile.telephone || !profile.pays || !profile.ville) alertes.push({ level: 'info', label: 'Profil incomplet' })
  const blocked = (integration.parcours || []).find((pc: any) => pc.locked && !pc.complete)
  if (blocked) alertes.push({ level: 'info', label: `Parcours en attente : ${blocked.titre}` })

  // Timeline pastorale unifiée (du plus récent au plus ancien)
  const tl: { date: string; type: string; label: string }[] = []
  if (profile.date_inscription) tl.push({ date: profile.date_inscription, type: 'inscription', label: 'Inscription' })
  for (const h of statut_history) tl.push({ date: h.created_at, type: 'statut', label: `Statut : ${h.ancien_statut || '—'} → ${h.nouveau_statut}` })
  for (const r of role_history) tl.push({ date: r.created_at, type: 'role', label: `Rôle : ${r.detail?.ancien_role || '—'} → ${r.detail?.nouveau_role || '?'}` })
  for (const c of certificats) tl.push({ date: c.delivre_le, type: 'certificat', label: `Certificat : ${c.titre}` })
  for (const p of prieres) tl.push({ date: p.created_at, type: 'priere', label: `Prière : ${p.sujet}` })
  for (const e of evenements) tl.push({ date: e.created_at, type: 'evenement', label: `Événement : ${e.event_titre}` })
  for (const g of groupes) tl.push({ date: g.created_at, type: 'groupe', label: `Groupe : ${g.group_nom}` })
  for (const d of (generosite.liste || [])) tl.push({ date: d.created_at, type: 'don', label: `Don : ${d.amount} ${d.currency || ''}` })
  for (const n of notes) tl.push({ date: n.created_at, type: 'note', label: `Note : ${String(n.note).slice(0, 70)}` })
  const timeline = tl.filter((t) => t.date).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 40)

  return {
    profile,
    responsable,
    statut_history,
    role_history,
    notes,
    score,
    communaute,
    presence,
    permissions: perms,
    alertes,
    alerts_suivi,
    timeline,
    last_seen_days: lastSeenDays,
    spiritual: {
      integration_pct: integration.overall_pct,
      parcours: integration.parcours,
      academie_unlocked: integration.integration_complete,
      formations,
      modules_termines,
      certificats,
    },
    activite: { derniere_connexion: profile.derniere_connexion ?? null, connexions, evenements, groupes, prieres, messages },
    generosite,
  }
}
