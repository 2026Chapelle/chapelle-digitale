import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { can } from '@/lib/permissions'
import { resolveGroupScope, type GroupScope } from '@/lib/group-scope'
import { validateGroupInput, canScopeManageGroup, canScopeCreateInPays, type ScopeCtx } from '@/lib/community/groups-access'
import {
  resolveMyPays, listGroups, getGroup, getGroupMembers, memberGroups, directory, myPendingRequests,
  createGroup, updateGroup, updateGroupInfos, archiveGroup, addMember, removeMember, setMemberRole,
  setPrimaryForUser, isGroupLeader, createJoinRequest, approveJoinRequest, rejectJoinRequest, resolveGroupId,
  groupsLedBy, pendingRequestsForGroups,
} from '@/lib/community/groups-server'

/**
 * Espace membre — GROUPES. Portée imposée CÔTÉ SERVEUR.
 *   GET                       → { mes_groupes, annuaire, demandes, scope }
 *   GET ?manage=1             → groupes du périmètre (rôles élevés) ; ?members=<id> → membres
 *   POST { action, ... }
 *     self    : join | leave | set_primary               (tout membre, sur lui-même)
 *     gestion : create|update|archive|add_member|remove_member|set_role
 *               (can_manage_groups + périmètre) | approve_request|reject_request
 *               (périmètre OU leader du groupe)
 * Aucune écriture directe client : tout passe par le service centralisé groups-server.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SELF_ACTIONS = new Set(['join', 'leave', 'set_primary'])

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const q = req.nextUrl.searchParams
  const myPays = await resolveMyPays(sp.uid)
  const scope = resolveGroupScope({ role: sp.role, hasNationAssignment: myPays.length > 0 })

  try {
    if (q.get('manage')) {
      // Vue de gestion : rôles élevés (périmètre) ET/OU leaders (groupes animés).
      const members = q.get('members')
      if (members) {
        const g = await getGroup(members)
        const allowed = !!g && (canScopeManageGroup(scope, g, { uid: sp.uid, myPays }) || await isGroupLeader(sp.uid, members))
        if (!allowed) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        return NextResponse.json({ ok: true, data: await getGroupMembers(members) })
      }
      // Union : groupes du périmètre RBAC + groupes dont l'utilisateur est leader.
      const [scoped, led] = await Promise.all([
        scope === 'denied' ? Promise.resolve([]) : listGroups({
          scope, uid: sp.uid, myPays,
          plateforme_id: q.get('plateforme_id'), type: q.get('type'), statut: q.get('statut'),
        }),
        groupsLedBy(sp.uid),
      ])
      const byId = new Map<string, any>()
      for (const g of [...scoped, ...led]) byId.set(g.id, g)
      const data = Array.from(byId.values())
      if (data.length === 0 && scope === 'denied') return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
      const demandes = await pendingRequestsForGroups(data.map((g) => g.id))
      return NextResponse.json({ ok: true, data, demandes, scope })
    }

    // Vue membre par défaut.
    const [mes_groupes, annuaire, demandes] = await Promise.all([
      memberGroups(sp.uid),
      directory({ plateforme_id: q.get('plateforme_id'), type: q.get('type') }),
      myPendingRequests(sp.uid),
    ])
    return NextResponse.json({ ok: true, data: { mes_groupes, annuaire, demandes, scope } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')

  try {
    // ── Self-service (tout membre, sur lui-même) ──────────────────────────────
    if (SELF_ACTIONS.has(action)) {
      if (!body.groupe_id) return NextResponse.json({ ok: false, message: 'groupe_id requis.' }, { status: 400 })
      if (action === 'join') return NextResponse.json(await createJoinRequest(sp.uid, sp.profile, body.groupe_id))
      if (action === 'leave') { await removeMember(body.groupe_id, sp.uid); return NextResponse.json({ ok: true }) }
      if (action === 'set_primary') { await setPrimaryForUser(sp.uid, body.groupe_id); return NextResponse.json({ ok: true }) }
    }

    // ── Gestion (rôles élevés) ────────────────────────────────────────────────
    const myPays = await resolveMyPays(sp.uid)
    const scope = resolveGroupScope({ role: sp.role, hasNationAssignment: myPays.length > 0 })
    const ctx = { uid: sp.uid, myPays }

    // Approbation / rejet : périmètre de gestion OU leader du groupe concerné.
    if (action === 'approve_request' || action === 'reject_request') {
      if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
      const allowed = await canActOnRequest(body.id, scope, ctx, sp.uid)
      if (!allowed) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
      return NextResponse.json(action === 'approve_request' ? await approveJoinRequest(body.id) : await rejectJoinRequest(body.id))
    }

    // Modification restreinte (leader) : horaires / lieu / description.
    if (action === 'update_infos') {
      if (!body.groupe_id) return NextResponse.json({ ok: false, message: 'groupe_id requis.' }, { status: 400 })
      const g = await getGroup(body.groupe_id)
      const allowed = !!g && (canScopeManageGroup(scope, g, ctx) || await isGroupLeader(sp.uid, body.groupe_id))
      if (!allowed) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
      await updateGroupInfos(body.groupe_id, body)
      return NextResponse.json({ ok: true })
    }

    // Actions de gestion complètes : exigent can_manage_groups + périmètre.
    if (!can(sp.role, 'can_manage_groups')) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })

    switch (action) {
      case 'create': {
        const v = validateGroupInput(body)
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        if (!canScopeCreateInPays(scope, v.value!.pays, myPays)) {
          return NextResponse.json({ ok: false, message: 'Création hors de votre périmètre national.' }, { status: 403 })
        }
        return NextResponse.json({ ok: true, data: await createGroup(v.value!) })
      }
      case 'update': {
        const g = body.id ? await getGroup(body.id) : null
        if (!g || !canScopeManageGroup(scope, g, ctx)) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        const v = validateGroupInput(body)
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        await updateGroup(body.id, v.value!)
        return NextResponse.json({ ok: true })
      }
      case 'archive': {
        const g = body.id ? await getGroup(body.id) : null
        if (!g || !canScopeManageGroup(scope, g, ctx)) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        await archiveGroup(body.id)
        return NextResponse.json({ ok: true })
      }
      case 'add_member':
      case 'remove_member':
      case 'set_role': {
        if (!body.groupe_id || !body.user_id) return NextResponse.json({ ok: false, message: 'groupe_id et user_id requis.' }, { status: 400 })
        const g = await getGroup(body.groupe_id)
        if (!g || !canScopeManageGroup(scope, g, ctx)) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        if (action === 'add_member') await addMember(body.groupe_id, body.user_id, body.role || 'membre')
        else if (action === 'remove_member') await removeMember(body.groupe_id, body.user_id)
        else { if (!body.role) return NextResponse.json({ ok: false, message: 'role requis.' }, { status: 400 }); await setMemberRole(body.groupe_id, body.user_id, body.role) }
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ ok: false, message: 'Action inconnue.' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 400 })
  }
}

/** Peut-on approuver/rejeter cette demande ? (périmètre de gestion OU leader du groupe). */
async function canActOnRequest(requestId: string, scope: GroupScope, ctx: ScopeCtx, uid: string): Promise<boolean> {
  const { data: r } = await supabaseAdmin.from('group_join_requests').select('group_id, group_nom').eq('id', requestId).maybeSingle()
  if (!r) return false
  const gid = await resolveGroupId(r.group_id, r.group_nom)
  if (!gid) return false
  const g = await getGroup(gid)
  if (g && canScopeManageGroup(scope, g, ctx)) return true
  return await isGroupLeader(uid, gid)
}
