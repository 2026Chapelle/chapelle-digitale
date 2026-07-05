/**
 * GROUPES — couche SERVICE serveur (service role). Source UNIQUE des opérations
 * de données communautaires, partagée par /api/admin/groupes et /api/member/groupes.
 * Zéro duplication : les routes ne font que l'auth + le scoping, puis délèguent ici.
 *
 * Reflète exactement les triggers SQL du Lot 1 (is_primary unique, membres_count,
 * sync responsable_id↔leader_id, sync groupe_cellule_id).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { notifyUser } from '@/lib/notify'
import type { GroupScope } from '@/lib/group-scope'
import { pickAllowedInfos, type NormalizedGroup } from './groups-access'
import { canJoinGroup, decidePrimaryOnAdd, pickPrimaryAfterLeave, type Membership, type MembershipRole } from './membership'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Pays affectés (réutilise nation_responsables, comme l'intégration). */
export async function resolveMyPays(uid: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from('nation_responsables')
    .select('pays, actif').eq('user_id', uid).eq('actif', true)
  return (data || []).map((a: any) => a.pays).filter(Boolean)
}

// ── Lecture ─────────────────────────────────────────────────────────────────

export interface ListFilters { plateforme_id?: string | null; type?: string | null; statut?: string | null }

/** Liste des groupes dans le périmètre (filtre serveur). */
export async function listGroups(opts: { scope: GroupScope; uid?: string | null; myPays?: string[] } & ListFilters) {
  if (opts.scope === 'denied') return []
  if (opts.scope === 'nation' && !(opts.myPays && opts.myPays.length)) return []
  let q: any = supabaseAdmin.from('groupes').select('*').order('created_at', { ascending: false }).limit(1000)
  if (opts.scope === 'nation') q = q.in('pays', opts.myPays)
  else if (opts.scope === 'assigned') q = q.eq('responsable_id', opts.uid || '')
  if (opts.plateforme_id) q = q.eq('plateforme_id', opts.plateforme_id)
  if (opts.type) q = q.eq('type', opts.type)
  if (opts.statut) q = q.eq('statut', opts.statut)
  const { data } = await q
  return data || []
}

export async function getGroup(id: string) {
  const { data } = await supabaseAdmin.from('groupes').select('*').eq('id', id).maybeSingle()
  return data || null
}

/** Membres d'un groupe (avec profil résumé). */
export async function getGroupMembers(groupeId: string) {
  const { data: rows } = await supabaseAdmin.from('membres_groupe')
    .select('user_id, role, statut, is_primary, date_adhesion, date_sortie')
    .eq('groupe_id', groupeId).order('date_adhesion', { ascending: true })
  const ids = (rows || []).map((r: any) => r.user_id)
  const profs: Record<string, any> = {}
  if (ids.length) {
    const { data } = await supabaseAdmin.from('profiles')
      .select('id, prenom, nom, email, role, membre_statut, pays, ville').in('id', ids)
    for (const p of data || []) profs[p.id] = p
  }
  return (rows || []).map((r: any) => ({ ...r, profile: profs[r.user_id] || null }))
}

/** Appartenances brutes d'un membre (toutes, pour calculer is_primary). */
async function userMemberships(userId: string): Promise<(Membership & { groupe_id: string })[]> {
  const { data } = await supabaseAdmin.from('membres_groupe')
    .select('groupe_id, is_primary, statut, role, date_adhesion').eq('user_id', userId)
  return (data || []) as any
}

/** Mes groupes (appartenances non sorties + info groupe). */
export async function memberGroups(uid: string) {
  const { data: rows } = await supabaseAdmin.from('membres_groupe')
    .select('groupe_id, role, statut, is_primary, date_adhesion').eq('user_id', uid).neq('statut', 'sorti')
  const ids = (rows || []).map((r: any) => r.groupe_id)
  const groups: Record<string, any> = {}
  if (ids.length) {
    const { data } = await supabaseAdmin.from('groupes').select('*').in('id', ids)
    for (const g of data || []) groups[g.id] = g
  }
  return (rows || []).map((r: any) => ({ ...r, groupe: groups[r.groupe_id] || null })).filter((r: any) => r.groupe)
}

/** Annuaire public des groupes actifs (lecture seule). Filtres plateforme/type/pays/ville. */
export async function directory(opts: { plateforme_id?: string | null; type?: string | null; pays?: string | null; ville?: string | null } = {}) {
  let q: any = supabaseAdmin.from('groupes')
    .select('id, nom, description, type, plateforme_id, ville, pays, jour_reunion, heure_reunion, est_virtuel, membres_count, capacite_max, statut')
    .eq('statut', 'actif').order('nom', { ascending: true }).limit(500)
  if (opts.plateforme_id) q = q.eq('plateforme_id', opts.plateforme_id)
  if (opts.type) q = q.eq('type', opts.type)
  if (opts.pays) q = q.eq('pays', opts.pays)
  if (opts.ville) q = q.eq('ville', opts.ville)
  const { data } = await q
  return data || []
}

/** Groupes dont l'utilisateur est leader/co-leader (animation locale, hors RBAC global). */
export async function groupsLedBy(uid: string) {
  const { data: rows } = await supabaseAdmin.from('membres_groupe')
    .select('groupe_id, role').eq('user_id', uid).eq('statut', 'actif').in('role', ['leader', 'co-leader'])
  const ids = (rows || []).map((r: any) => r.groupe_id)
  if (!ids.length) return []
  const { data } = await supabaseAdmin.from('groupes').select('*').in('id', ids).order('nom', { ascending: true })
  return data || []
}

/** Demandes d'adhésion en attente pour un ensemble de groupes (vue gestion/leader). */
export async function pendingRequestsForGroups(groupeIds: string[]) {
  if (!groupeIds.length) return []
  const { data } = await supabaseAdmin.from('group_join_requests')
    .select('id, group_id, group_nom, user_id, user_nom, user_email, statut, created_at')
    .in('group_id', groupeIds).eq('statut', 'en_attente').order('created_at', { ascending: false })
  return data || []
}

/** Demandes d'adhésion en attente d'un membre. */
export async function myPendingRequests(uid: string) {
  const { data } = await supabaseAdmin.from('group_join_requests')
    .select('id, group_id, group_nom, statut, created_at').eq('user_id', uid).eq('statut', 'en_attente')
  return data || []
}

// ── Écriture : groupes ────────────────────────────────────────────────────────

export async function createGroup(value: NormalizedGroup) {
  const { data, error } = await supabaseAdmin.from('groupes').insert({
    nom: value.nom, plateforme_id: value.plateforme_id, type: value.type, description: value.description,
    pays: value.pays, ville: value.ville, zone: value.zone, niveau: value.niveau, capacite_max: value.capacite_max,
    responsable_id: value.responsable_id, parent_id: value.parent_id, code: value.code,
    jour_reunion: value.jour_reunion, heure_reunion: value.heure_reunion, lieu_reunion: value.lieu_reunion,
    est_virtuel: value.est_virtuel, reunion_url: value.reunion_url,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data
}

/** Met à jour les champs fournis (le trigger SQL synchronise leader_id ← responsable_id). */
export async function updateGroup(id: string, value: NormalizedGroup) {
  const { error } = await supabaseAdmin.from('groupes').update({
    nom: value.nom, plateforme_id: value.plateforme_id, type: value.type, description: value.description,
    pays: value.pays, ville: value.ville, zone: value.zone, niveau: value.niveau, capacite_max: value.capacite_max,
    responsable_id: value.responsable_id, parent_id: value.parent_id, code: value.code,
    jour_reunion: value.jour_reunion, heure_reunion: value.heure_reunion, lieu_reunion: value.lieu_reunion,
    est_virtuel: value.est_virtuel, reunion_url: value.reunion_url,
  }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Modification restreinte (leader) : horaires / lieu / description uniquement. */
export async function updateGroupInfos(id: string, patch: Record<string, any>) {
  const clean = pickAllowedInfos(patch)
  if (!Object.keys(clean).length) return
  const { error } = await supabaseAdmin.from('groupes').update(clean).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function archiveGroup(id: string) {
  const { error } = await supabaseAdmin.from('groupes').update({ statut: 'inactif' }).eq('id', id)
  if (error) throw new Error(error.message)
}

async function syncResponsable(groupeId: string, userId: string) {
  await supabaseAdmin.from('groupes').update({ responsable_id: userId }).eq('id', groupeId)
}

// ── Écriture : appartenances ──────────────────────────────────────────────────

/**
 * Ajoute (ou réactive) un membre. is_primary calculé sans voler le principal :
 * vrai si déjà principal, ou si le membre n'a aucun autre principal actif.
 */
export async function addMember(groupeId: string, userId: string, role: MembershipRole = 'membre') {
  const existing = await userMemberships(userId)
  const is_primary = decidePrimaryOnAdd(existing as Membership[], groupeId)
  const { error } = await supabaseAdmin.from('membres_groupe').upsert({
    groupe_id: groupeId, user_id: userId, role, statut: 'actif', is_primary, date_sortie: null,
  }, { onConflict: 'user_id,groupe_id' })
  if (error) throw new Error(error.message)
  if (role === 'leader') await syncResponsable(groupeId, userId)
}

/** Sortie d'un membre : statut=sorti + bascule du groupe principal si besoin. */
export async function removeMember(groupeId: string, userId: string) {
  const ms = await userMemberships(userId)
  if (!ms.some((m) => m.groupe_id === groupeId)) throw new Error('Appartenance introuvable.')
  const newPrimary = pickPrimaryAfterLeave(ms as Membership[], groupeId)
  const { error } = await supabaseAdmin.from('membres_groupe')
    .update({ statut: 'sorti', is_primary: false, date_sortie: new Date().toISOString() })
    .eq('groupe_id', groupeId).eq('user_id', userId)
  if (error) throw new Error(error.message)
  if (newPrimary) {
    await supabaseAdmin.from('membres_groupe').update({ is_primary: true })
      .eq('groupe_id', newPrimary).eq('user_id', userId)
  }
}

export async function setMemberRole(groupeId: string, userId: string, role: MembershipRole) {
  const { data, error } = await supabaseAdmin.from('membres_groupe').update({ role })
    .eq('groupe_id', groupeId).eq('user_id', userId).select('user_id')
  if (error) throw new Error(error.message)
  if (!data || !data.length) throw new Error('Appartenance introuvable.')
  if (role === 'leader') await syncResponsable(groupeId, userId)
}

/** Définit le groupe principal du membre (le trigger SQL gère l'unicité + cellule). */
export async function setPrimaryForUser(userId: string, groupeId: string) {
  const { data } = await supabaseAdmin.from('membres_groupe')
    .select('statut').eq('user_id', userId).eq('groupe_id', groupeId).maybeSingle()
  if (!data || data.statut !== 'actif') throw new Error('Appartenance active introuvable.')
  const { error } = await supabaseAdmin.from('membres_groupe').update({ is_primary: true })
    .eq('user_id', userId).eq('groupe_id', groupeId)
  if (error) throw new Error(error.message)
}

export async function isGroupLeader(uid: string, groupeId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('membres_groupe')
    .select('role').eq('user_id', uid).eq('groupe_id', groupeId).eq('statut', 'actif').maybeSingle()
  return !!data && (data.role === 'leader' || data.role === 'co-leader')
}

// ── Flux d'adhésion ───────────────────────────────────────────────────────────

async function resolveGroupId(groupId?: string | null, nom?: string | null): Promise<string | null> {
  if (groupId && UUID_RE.test(groupId)) {
    const { data } = await supabaseAdmin.from('groupes').select('id').eq('id', groupId).maybeSingle()
    if (data) return data.id
  }
  if (groupId) {
    const { data } = await supabaseAdmin.from('groupes').select('id').eq('code', groupId).maybeSingle()
    if (data) return data.id
  }
  if (nom) {
    const { data } = await supabaseAdmin.from('groupes').select('id').eq('nom', nom).eq('statut', 'actif').maybeSingle()
    if (data) return data.id
  }
  return null
}

/** Un membre demande à rejoindre un groupe (crée une group_join_request). */
export async function createJoinRequest(uid: string, profile: any, groupeId: string) {
  const { data: g } = await supabaseAdmin.from('groupes')
    .select('id, nom, statut, capacite_max, membres_count, responsable_id').eq('id', groupeId).maybeSingle()
  if (!g) throw new Error('Groupe introuvable.')
  const chk = canJoinGroup(g as any)
  if (!chk.ok) throw new Error(chk.reason || 'Adhésion impossible.')

  const { data: existing } = await supabaseAdmin.from('membres_groupe')
    .select('statut').eq('user_id', uid).eq('groupe_id', groupeId).maybeSingle()
  if (existing && existing.statut === 'actif') throw new Error('Vous êtes déjà membre de ce groupe.')

  const { data: pending } = await supabaseAdmin.from('group_join_requests')
    .select('id').eq('user_id', uid).eq('group_id', groupeId).eq('statut', 'en_attente').maybeSingle()
  if (pending) throw new Error('Une demande est déjà en attente pour ce groupe.')

  const nomMembre = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || null
  const { error } = await supabaseAdmin.from('group_join_requests').insert({
    group_id: groupeId, group_nom: g.nom, user_id: uid, user_nom: nomMembre, user_email: profile?.email ?? null,
  })
  if (error) throw new Error(error.message)

  if (g.responsable_id) {
    await notifyUser(g.responsable_id, {
      type: 'membre', title: "Nouvelle demande d'adhésion",
      body: `${nomMembre || 'Un membre'} souhaite rejoindre « ${g.nom} ».`, href: '/admin/groupes',
    })
  }
  return { ok: true }
}

/** Approuve une demande : crée l'appartenance + notifie le membre. */
export async function approveJoinRequest(requestId: string) {
  const { data: r } = await supabaseAdmin.from('group_join_requests').select('*').eq('id', requestId).maybeSingle()
  if (!r) throw new Error('Demande introuvable.')
  if (r.statut === 'accepte') return { ok: true, already: true }
  if (!r.user_id) throw new Error('Demande sans compte membre (utilisateur non inscrit).')
  const groupeId = await resolveGroupId(r.group_id, r.group_nom)
  if (!groupeId) throw new Error('Groupe cible introuvable.')
  await addMember(groupeId, r.user_id, 'membre')
  await supabaseAdmin.from('group_join_requests').update({ statut: 'accepte' }).eq('id', requestId)
  await notifyUser(r.user_id, {
    type: 'membre', title: 'Adhésion acceptée',
    body: `Vous avez rejoint « ${r.group_nom} ».`, href: '/member/dashboard/groupes',
  })
  return { ok: true, groupe_id: groupeId }
}

/**
 * Matérialise l'appartenance quand une demande passe à « accepte » via un autre
 * chemin (ex. back-office submissions). Idempotent (upsert) ; n'écrit pas le statut.
 */
export async function onJoinRequestAccepted(requestId: string) {
  const { data: r } = await supabaseAdmin.from('group_join_requests').select('*').eq('id', requestId).maybeSingle()
  if (!r || !r.user_id) return
  const groupeId = await resolveGroupId(r.group_id, r.group_nom)
  if (!groupeId) {
    // Statut déjà passé à « accepte » par l'appelant mais groupe introuvable :
    // on trace pour éviter une adhésion perdue silencieusement.
    console.warn(`[groups] onJoinRequestAccepted: groupe introuvable pour la demande ${requestId} (group_id="${r.group_id}", nom="${r.group_nom}")`)
    return
  }
  await addMember(groupeId, r.user_id, 'membre')
  await notifyUser(r.user_id, {
    type: 'membre', title: 'Adhésion acceptée',
    body: `Vous avez rejoint « ${r.group_nom} ».`, href: '/member/dashboard/groupes',
  })
}

export async function rejectJoinRequest(requestId: string) {
  const { data: r } = await supabaseAdmin.from('group_join_requests').select('*').eq('id', requestId).maybeSingle()
  if (!r) throw new Error('Demande introuvable.')
  await supabaseAdmin.from('group_join_requests').update({ statut: 'refuse' }).eq('id', requestId)
  if (r.user_id) {
    await notifyUser(r.user_id, {
      type: 'membre', title: "Demande d'adhésion non retenue",
      body: `Votre demande pour « ${r.group_nom} » n'a pas été retenue pour le moment.`, href: '/member/dashboard/groupes',
    })
  }
  return { ok: true }
}

/** Résout l'id réel d'un groupe (pour les flux d'approbation externes). */
export { resolveGroupId }
