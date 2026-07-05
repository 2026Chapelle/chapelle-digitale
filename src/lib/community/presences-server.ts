/**
 * PRÉSENCES — couche SERVICE serveur (service role). Source UNIQUE des opérations
 * réunions/présences, partagée par /api/member/reunions et /api/admin/reunions.
 * Réutilise groupes (membres_groupe) + le moteur de notifications/alertes pastorales.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { notifyUser } from '@/lib/notify'
import { raisePastoralAlert } from '@/lib/notifications/events'
import { absenceStreak, aggregateAttendance, computeAttendanceStats, shouldAlertAbsence, type AttendanceStatut, type NormalizedReunion } from './attendance'
import { groupsLedBy } from './groups-server'

const ABSENCE_THRESHOLD = 3

// ── Lecture ─────────────────────────────────────────────────────────────────

export async function getReunion(id: string) {
  const { data } = await supabaseAdmin.from('group_reunions').select('*').eq('id', id).maybeSingle()
  return data || null
}

export async function listReunions(groupeId: string) {
  const { data } = await supabaseAdmin.from('group_reunions')
    .select('*').eq('groupe_id', groupeId).order('date_reunion', { ascending: false })
  return data || []
}

/** Réunions d'un ensemble de groupes (calendrier / vue responsable). */
export async function reunionsForGroups(groupeIds: string[]) {
  if (!groupeIds.length) return []
  const { data } = await supabaseAdmin.from('group_reunions')
    .select('*').in('groupe_id', groupeIds).order('date_reunion', { ascending: false }).limit(200)
  return data || []
}

/** Réunions récentes toutes plateformes (back-office global). */
export async function recentReunionsAll() {
  const { data } = await supabaseAdmin.from('group_reunions')
    .select('*, groupe:groupes(nom, plateforme_id, pays)').order('date_reunion', { ascending: false }).limit(200)
  return data || []
}

/** Le membre appartient-il (actif) à ce groupe ? (lecture des réunions). */
export async function isActiveMember(uid: string, groupeId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('membres_groupe')
    .select('user_id').eq('user_id', uid).eq('groupe_id', groupeId).eq('statut', 'actif').maybeSingle()
  return !!data
}

/** Présences d'une réunion (avec profil résumé). */
export async function getReunionAttendance(reunionId: string) {
  const { data: rows } = await supabaseAdmin.from('group_attendance')
    .select('user_id, statut, note, recorded_at').eq('reunion_id', reunionId)
  const ids = (rows || []).map((r: any) => r.user_id)
  const profs: Record<string, any> = {}
  if (ids.length) {
    const { data } = await supabaseAdmin.from('profiles').select('id, prenom, nom, email').in('id', ids)
    for (const p of data || []) profs[p.id] = p
  }
  return (rows || []).map((r: any) => ({ ...r, profile: profs[r.user_id] || null }))
}

/** Statistiques d'assiduité d'un groupe (global + par réunion + par membre). */
export async function groupAttendanceStats(groupeId: string) {
  const { data: reunions } = await supabaseAdmin.from('group_reunions')
    .select('id, titre, date_reunion, statut').eq('groupe_id', groupeId).order('date_reunion', { ascending: false }).limit(50)
  const reuIds = (reunions || []).map((r: any) => r.id)
  let attendance: any[] = []
  if (reuIds.length) {
    const { data } = await supabaseAdmin.from('group_attendance').select('reunion_id, user_id, statut').in('reunion_id', reuIds)
    attendance = data || []
  }
  const global = computeAttendanceStats(attendance)
  const parReunion = (reunions || []).map((r: any) => ({
    id: r.id, titre: r.titre, date_reunion: r.date_reunion, statut: r.statut,
    stats: computeAttendanceStats(attendance.filter((a) => a.reunion_id === r.id)),
  }))
  // Par membre
  const byMember = new Map<string, { statut: string }[]>()
  for (const a of attendance) {
    if (!byMember.has(a.user_id)) byMember.set(a.user_id, [])
    byMember.get(a.user_id)!.push({ statut: a.statut })
  }
  const memberIds = Array.from(byMember.keys())
  const profs: Record<string, any> = {}
  if (memberIds.length) {
    const { data } = await supabaseAdmin.from('profiles').select('id, prenom, nom').in('id', memberIds)
    for (const p of data || []) profs[p.id] = p
  }
  const parMembre = memberIds.map((uid) => ({
    user_id: uid, profile: profs[uid] || null, stats: computeAttendanceStats(byMember.get(uid)!),
  })).sort((a, b) => a.stats.taux_presence - b.stats.taux_presence)
  return { global, par_reunion: parReunion, par_membre: parMembre, nb_reunions: (reunions || []).length }
}

/** Réunions à venir/récentes des groupes actifs du membre + son statut de présence. */
export async function memberReunions(uid: string) {
  const { data: mg } = await supabaseAdmin.from('membres_groupe')
    .select('groupe_id').eq('user_id', uid).eq('statut', 'actif')
  const memberGroupIds = (mg || []).map((r: any) => r.groupe_id)
  if (!memberGroupIds.length) return []
  // Ne garder que les groupes ACTIFS : un groupe archivé ne doit plus exposer ses réunions.
  const { data: gs } = await supabaseAdmin.from('groupes')
    .select('id, nom').in('id', memberGroupIds).eq('statut', 'actif')
  const grp: Record<string, any> = {}
  for (const g of gs || []) grp[g.id] = g.nom
  const groupeIds = (gs || []).map((g: any) => g.id)
  if (!groupeIds.length) return []
  const { data: reunions } = await supabaseAdmin.from('group_reunions')
    .select('id, groupe_id, titre, type, date_reunion, lieu, lien_visio, statut')
    .in('groupe_id', groupeIds).order('date_reunion', { ascending: false }).limit(50)
  const reuIds = (reunions || []).map((r: any) => r.id)
  const mine: Record<string, any> = {}
  if (reuIds.length) {
    const { data } = await supabaseAdmin.from('group_attendance').select('reunion_id, statut').eq('user_id', uid).in('reunion_id', reuIds)
    for (const a of data || []) mine[a.reunion_id] = a.statut
  }
  return (reunions || []).map((r: any) => ({ ...r, groupe_nom: grp[r.groupe_id] || null, ma_presence: mine[r.id] || null }))
}

// ── Écriture ──────────────────────────────────────────────────────────────────

export async function createReunion(value: NormalizedReunion, createdBy?: string | null) {
  const { data, error } = await supabaseAdmin.from('group_reunions').insert({
    groupe_id: value.groupe_id, titre: value.titre, description: value.description, type: value.type,
    date_reunion: value.date_reunion, duree_min: value.duree_min, lieu: value.lieu, lien_visio: value.lien_visio,
    created_by: createdBy ?? null,
  }).select('*').single()
  if (error) throw new Error(error.message)
  // Notifie les membres actifs du groupe (best-effort).
  try {
    const { data: members } = await supabaseAdmin.from('membres_groupe')
      .select('user_id').eq('groupe_id', value.groupe_id).eq('statut', 'actif')
    for (const m of members || []) {
      await notifyUser(m.user_id, {
        type: 'evenement', title: 'Nouvelle réunion de groupe',
        body: `${value.titre} — ${new Date(value.date_reunion).toLocaleDateString('fr-FR')}`,
        href: '/member/dashboard/reunions',
      })
    }
  } catch { /* non bloquant */ }
  return data
}

export async function updateReunion(id: string, value: NormalizedReunion) {
  const { error } = await supabaseAdmin.from('group_reunions').update({
    titre: value.titre, description: value.description, type: value.type,
    date_reunion: value.date_reunion, duree_min: value.duree_min, lieu: value.lieu, lien_visio: value.lien_visio,
  }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setReunionStatut(id: string, statut: 'planifiee' | 'tenue' | 'annulee') {
  const { error } = await supabaseAdmin.from('group_reunions').update({ statut }).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Enregistre les présences (upsert en masse) puis détecte les absences répétées.
 * entries : [{ user_id, statut, note? }]. Marque la réunion « tenue ».
 * Retourne le nombre d'alertes d'absence déclenchées.
 */
export async function recordAttendance(
  reunionId: string,
  entries: { user_id: string; statut: AttendanceStatut; note?: string | null }[],
  recordedBy?: string | null,
): Promise<{ ok: true; alerts: number }> {
  const reunion = await getReunion(reunionId)
  if (!reunion) throw new Error('Réunion introuvable.')

  // Restreint aux MEMBRES ACTIFS du groupe (anti-pollution des stats + fausses alertes).
  const { data: memberRows } = await supabaseAdmin.from('membres_groupe')
    .select('user_id').eq('groupe_id', reunion.groupe_id).eq('statut', 'actif')
  const allowed = new Set((memberRows || []).map((m: any) => m.user_id))

  const valid = entries.filter((e) => e.user_id && allowed.has(e.user_id) && ['present', 'absent', 'excuse'].includes(e.statut))

  // Préserve une note existante quand aucune n'est fournie (pas d'écrasement à null).
  let existingNotes: Record<string, string | null> = {}
  if (valid.length) {
    const { data: prev } = await supabaseAdmin.from('group_attendance')
      .select('user_id, note').eq('reunion_id', reunionId).in('user_id', valid.map((e) => e.user_id))
    for (const p of prev || []) existingNotes[p.user_id] = p.note
  }

  const now = new Date().toISOString()
  const rows = valid.map((e) => {
    const provided = e.note != null && String(e.note).trim() !== '' ? String(e.note) : null
    return {
      reunion_id: reunionId, user_id: e.user_id, statut: e.statut,
      note: provided ?? (existingNotes[e.user_id] ?? null),
      recorded_by: recordedBy ?? null, recorded_at: now,
    }
  })
  if (rows.length) {
    const { error } = await supabaseAdmin.from('group_attendance').upsert(rows, { onConflict: 'reunion_id,user_id' })
    if (error) throw new Error(error.message)
  }
  // Marque « tenue » uniquement si des présences ont réellement été enregistrées.
  if (rows.length && reunion.statut === 'planifiee') await setReunionStatut(reunionId, 'tenue')

  // Détection d'absences répétées (par membre absent, dans CE groupe).
  let alerts = 0
  const absents = rows.filter((r) => r.statut === 'absent').map((r) => r.user_id)
  for (const uid of absents) {
    const streak = await memberAbsenceStreakInGroup(uid, reunion.groupe_id)
    if (shouldAlertAbsence(streak, ABSENCE_THRESHOLD)) {
      alerts++
      try {
        await raisePastoralAlert({
          memberId: uid, type: 'absence_repetee',
          title: 'Absences répétées en réunion',
          body: `${streak} absences consécutives non excusées dans son groupe.`,
          href: `/admin/membres/${uid}`,
          detail: { groupe_id: reunion.groupe_id, streak },
        })
      } catch { /* non bloquant */ }
    }
  }
  return { ok: true, alerts }
}

/** Série d'absences non excusées consécutives d'un membre dans un groupe (réunions récentes). */
async function memberAbsenceStreakInGroup(uid: string, groupeId: string): Promise<number> {
  const { data: reunions } = await supabaseAdmin.from('group_reunions')
    .select('id, date_reunion').eq('groupe_id', groupeId).order('date_reunion', { ascending: false }).limit(20)
  const ids = (reunions || []).map((r: any) => r.id)
  if (!ids.length) return 0
  const { data: att } = await supabaseAdmin.from('group_attendance').select('reunion_id, statut').eq('user_id', uid).in('reunion_id', ids)
  const byReunion: Record<string, string> = {}
  for (const a of att || []) byReunion[a.reunion_id] = a.statut
  // Construit la chronologie (du plus récent au plus ancien) en ne gardant que les réunions où il y a un relevé.
  const chrono = (reunions || []).map((r: any) => byReunion[r.id]).filter(Boolean).map((statut: string) => ({ statut }))
  return absenceStreak(chrono)
}

// ── P2 : AGRÉGATION TRANSVERSE (groupe / leader / pays / plateforme / global) ────
// Réutilise group_reunions + group_attendance + computeAttendanceStats/aggregateAttendance.
// JS V1 (aucune RPC, aucune migration). Bornes : 2000 réunions, 1000 présences/lot.

/** Présences enrichies (plateforme/pays) pour un ensemble de groupes. */
async function attendanceRecordsForGroups(groupeIds: string[]): Promise<{ groupe_id: string; plateforme_id: string | null; pays: string | null; statut: string }[]> {
  if (!groupeIds.length) return []
  const { data: groups } = await supabaseAdmin.from('groupes').select('id, plateforme_id, pays').in('id', groupeIds)
  const meta: Record<string, { plateforme_id: string | null; pays: string | null }> = {}
  for (const g of groups || []) meta[g.id] = { plateforme_id: g.plateforme_id ?? null, pays: g.pays ?? null }
  const { data: reunions } = await supabaseAdmin.from('group_reunions')
    .select('id, groupe_id').in('groupe_id', groupeIds).order('date_reunion', { ascending: false }).limit(2000)
  const reuToGroup: Record<string, string> = {}
  for (const r of reunions || []) reuToGroup[r.id] = r.groupe_id
  const reuIds = Object.keys(reuToGroup)
  if (!reuIds.length) return []
  const records: { groupe_id: string; plateforme_id: string | null; pays: string | null; statut: string }[] = []
  const CH = 1000
  for (let i = 0; i < reuIds.length; i += CH) {
    const { data: att } = await supabaseAdmin.from('group_attendance').select('reunion_id, statut').in('reunion_id', reuIds.slice(i, i + CH))
    for (const a of att || []) {
      const gid = reuToGroup[a.reunion_id]; if (!gid) continue
      const m = meta[gid] || { plateforme_id: null, pays: null }
      records.push({ groupe_id: gid, plateforme_id: m.plateforme_id, pays: m.pays, statut: a.statut })
    }
  }
  return records
}

/** Synthèse d'assiduité GLOBAL / par plateforme / par pays (cockpit gouvernement). */
export async function presenceOverview(opts: { pays?: string | null; plateforme?: string | null } = {}) {
  let q: any = supabaseAdmin.from('groupes').select('id').eq('statut', 'actif')
  if (opts.pays) q = q.eq('pays', opts.pays)
  if (opts.plateforme) q = q.eq('plateforme_id', opts.plateforme)
  const { data: gs } = await q
  const ids = (gs || []).map((g: any) => g.id)
  const records = await attendanceRecordsForGroups(ids)
  return {
    global: computeAttendanceStats(records),
    par_plateforme: aggregateAttendance(records.map((r) => ({ key: r.plateforme_id || '—', statut: r.statut }))),
    par_pays: aggregateAttendance(records.map((r) => ({ key: r.pays || '—', statut: r.statut }))),
    nb_groupes: ids.length,
    nb_releves: records.length,
  }
}

/** Synthèse d'assiduité pour un ensemble de groupes (global + par groupe nommé). */
export async function presenceForGroupIds(groupeIds: string[]) {
  const records = await attendanceRecordsForGroups(groupeIds)
  const noms: Record<string, string> = {}
  if (groupeIds.length) {
    const { data } = await supabaseAdmin.from('groupes').select('id, nom').in('id', groupeIds)
    for (const g of data || []) noms[g.id] = g.nom
  }
  return {
    global: computeAttendanceStats(records),
    par_groupe: aggregateAttendance(records.map((r) => ({ key: r.groupe_id, statut: r.statut }))).map((x) => ({ ...x, nom: noms[x.key] || x.key })),
    nb_groupes: groupeIds.length,
  }
}

/** Synthèse d'assiduité d'un LEADER, agrégée sur ses groupes animés. */
export async function leaderAttendanceSummary(uid: string) {
  const led = await groupsLedBy(uid)
  return presenceForGroupIds(led.map((g: any) => g.id))
}

/** Synthèse d'assiduité d'un MEMBRE (fiche 360°) : son taux + ses dernières présences. */
export async function memberAttendanceSummary(uid: string) {
  const { data: att } = await supabaseAdmin.from('group_attendance')
    .select('statut, recorded_at, reunion:group_reunions(titre, date_reunion)')
    .eq('user_id', uid).order('recorded_at', { ascending: false }).limit(100)
  const records = (att || []).map((a: any) => ({ statut: a.statut }))
  return {
    stats: computeAttendanceStats(records),
    recent: (att || []).slice(0, 8).map((a: any) => ({ statut: a.statut, titre: a.reunion?.titre ?? null, date: a.reunion?.date_reunion ?? null })),
  }
}
