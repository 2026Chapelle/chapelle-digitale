import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveGroupScope } from '@/lib/group-scope'
import { canScopeManageGroup } from './groups-access'
import { resolveMyPays } from './groups-server'
import {
  canReadGroupPost,
  validateGroupPost,
  type GroupSpaceActor,
  type GroupPostAccess,
  type ValidatedGroupPost,
} from './group-space'

export interface GroupSpaceSession {
  uid: string
  role: string
}

export interface GroupSpaceAccess extends GroupSpaceActor {
  groupId: string
  group: { id: string; nom: string; description: string | null }
}

export interface GroupSpacePost extends GroupPostAccess, ValidatedGroupPost {
  id: string
  groupe_id: string
  created_at: string
  updated_at: string
  moderated_by: string | null
  moderated_at: string | null
}

export class GroupSpaceError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'GroupSpaceError'
  }
}

const FIELDS = 'id,groupe_id,author_id,kind,title,body,resource_url,visibility,state,consent,moderated_by,moderated_at,created_at,updated_at' as const

function denied(): never {
  throw new GroupSpaceError(403, 'Acces refuse.')
}

function databaseFailure(): never {
  throw new GroupSpaceError(500, 'Impossible de traiter le contenu du groupe.')
}

// The session must come from getVerifiedRouteProfile, never from request JSON.
// Resolve group-scoped permissions afresh for every operation.
export async function getGroupSpaceAccess(
  session: GroupSpaceSession,
  groupId: string,
): Promise<GroupSpaceAccess> {
  if (!session?.uid) throw new GroupSpaceError(401, 'Connexion requise.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId)) {
    throw new GroupSpaceError(400, 'Identifiant de groupe invalide.')
  }

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groupes')
    .select('id,nom,description,statut,pays,responsable_id')
    .eq('id', groupId)
    .maybeSingle()

  if (groupError) databaseFailure()
  if (!group || group.id !== groupId || group.statut !== 'actif') denied()

  const { data: membership, error: memberError } = await supabaseAdmin
    .from('membres_groupe')
    .select('statut,role')
    .eq('groupe_id', groupId)
    .eq('user_id', session.uid)
    .maybeSingle()

  if (memberError) databaseFailure()
  const activeMember = membership?.statut === 'actif'
  const leader = activeMember &&
    (membership.role === 'leader' || membership.role === 'co-leader')

  const myPays = await resolveMyPays(session.uid)
  const scope = resolveGroupScope({
    role: session.role,
    hasNationAssignment: myPays.length > 0,
  })
  const manager = Boolean(leader || canScopeManageGroup(
    scope, group, { uid: session.uid, myPays },
  ))
  if (!activeMember && !manager) denied()

  return {
    uid: session.uid,
    groupId,
    activeMember,
    manager,
    activeGroup: true,
    group: {
      id: group.id,
      nom: group.nom || 'Groupe',
      description: group.description || null,
    },
  }
}

export async function listGroupPosts(
  session: GroupSpaceSession,
  groupId: string,
): Promise<GroupSpacePost[]> {
  const actor = await getGroupSpaceAccess(session, groupId)
  let query = supabaseAdmin.from('group_space_posts')
    .select(FIELDS)
    .eq('groupe_id', groupId)

  if (!actor.manager) {
    // UID is obtained from the verified session.
    query = query.or(
      `and(state.eq.publie,visibility.eq.groupe),author_id.eq.${actor.uid}`,
    )
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) databaseFailure()
  return ((data || []) as GroupSpacePost[]).filter(
    (post) => post.groupe_id === groupId && canReadGroupPost(actor, post),
  )
}

export async function createGroupPost(
  session: GroupSpaceSession,
  groupId: string,
  input: unknown,
): Promise<GroupSpacePost> {
  const actor = await getGroupSpaceAccess(session, groupId)
  const validation = validateGroupPost(input)
  if (!validation.ok) {
    throw new GroupSpaceError(400, validation.errors.join(' '))
  }
  const value = validation.value
  if (!actor.manager && (value.kind === 'annonce' || value.kind === 'ressource')) {
    denied()
  }

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('group_space_posts')
    .insert({
      ...value,
      groupe_id: groupId,
      author_id: actor.uid,
      state: actor.manager ? 'publie' : 'en_attente',
      moderated_by: actor.manager ? actor.uid : null,
      moderated_at: actor.manager ? now : null,
    })
    .select(FIELDS)
    .single()

  if (error || !data) databaseFailure()
  return data as GroupSpacePost
}

async function getScopedPost(
  groupId: string,
  postId: string,
): Promise<GroupSpacePost> {
  const { data, error } = await supabaseAdmin.from('group_space_posts')
    .select(FIELDS)
    .eq('groupe_id', groupId)
    .eq('id', postId)
    .maybeSingle()

  if (error) databaseFailure()
  if (!data || data.groupe_id !== groupId || data.id !== postId) denied()
  return data as GroupSpacePost
}

export async function moderateGroupPost(
  session: GroupSpaceSession,
  groupId: string,
  postId: string,
  decision: unknown,
): Promise<GroupSpacePost> {
  const actor = await getGroupSpaceAccess(session, groupId)
  if (!actor.manager) denied()
  if (decision !== 'publie' && decision !== 'refuse' && decision !== 'archive') {
    throw new GroupSpaceError(400, 'Decision invalide.')
  }

  const post = await getScopedPost(groupId, postId)
  if (decision !== 'archive' && post.state !== 'en_attente') {
    throw new GroupSpaceError(409, 'Cette proposition a deja ete traitee.')
  }
  if (decision === 'publie' && post.kind === 'temoignage' && post.consent !== true) {
    throw new GroupSpaceError(400, 'Accord de publication manquant.')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('group_space_posts')
    .update({
      state: decision,
      moderated_by: actor.uid,
      moderated_at: now,
      updated_at: now,
    })
    .eq('groupe_id', groupId)
    .eq('id', postId)
    .eq('state', post.state)
    .select(FIELDS)
    .maybeSingle()

  // Visibility is deliberately never changed during moderation.
  if (error) databaseFailure()
  if (!data) throw new GroupSpaceError(409, 'Contenu modifie. Actualisez la page.')
  return data as GroupSpacePost
}

export async function withdrawGroupPost(
  session: GroupSpaceSession,
  groupId: string,
  postId: string,
): Promise<void> {
  const actor = await getGroupSpaceAccess(session, groupId)
  const post = await getScopedPost(groupId, postId)
  if (post.author_id !== actor.uid) denied()
  if (post.state === 'archive') return

  const { data, error } = await supabaseAdmin.from('group_space_posts')
    .update({ state: 'archive', updated_at: new Date().toISOString() })
    .eq('groupe_id', groupId)
    .eq('id', postId)
    .eq('author_id', actor.uid)
    .eq('state', post.state)
    .select('id')
    .maybeSingle()

  if (error) databaseFailure()
  if (!data) throw new GroupSpaceError(409, 'Contenu modifie. Actualisez la page.')
}