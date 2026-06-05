import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { validateGroupInput } from '@/lib/community/groups-access'
import {
  listGroups, getGroupMembers, createGroup, updateGroup, archiveGroup,
  addMember, removeMember, setMemberRole, setPrimaryForUser,
  approveJoinRequest, rejectJoinRequest,
} from '@/lib/community/groups-server'
import { notifyUser } from '@/lib/notify'

/**
 * Back-office GROUPES — portée GLOBALE (cookie super_admin). Toute la gestion
 * communautaire passe par le service centralisé groups-server (zéro doublon).
 *   GET  ?members=<groupeId>  → membres d'un groupe
 *   GET  ?requests=1          → demandes d'adhésion
 *   GET  [filters]            → liste des groupes
 *   POST { action, ... }      → create|update|archive|add_member|remove_member|
 *                               set_role|set_primary|approve_request|reject_request
 * Écriture exclusivement via service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const sp = req.nextUrl.searchParams
  try {
    const members = sp.get('members')
    if (members) return NextResponse.json({ ok: true, data: await getGroupMembers(members) })
    if (sp.get('requests')) {
      const { data } = await supabaseAdmin.from('group_join_requests').select('*').order('created_at', { ascending: false }).limit(500)
      return NextResponse.json({ ok: true, data: data || [] })
    }
    const data = await listGroups({
      scope: 'all',
      plateforme_id: sp.get('plateforme_id'), type: sp.get('type'), statut: sp.get('statut'),
    })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')
  try {
    switch (action) {
      case 'create': {
        const v = validateGroupInput(body)
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        return NextResponse.json({ ok: true, data: await createGroup(v.value!) })
      }
      case 'update': {
        if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
        const v = validateGroupInput(body)
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        await updateGroup(body.id, v.value!)
        return NextResponse.json({ ok: true })
      }
      case 'archive': {
        if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
        await archiveGroup(body.id)
        return NextResponse.json({ ok: true })
      }
      case 'add_member': {
        if (!body.groupe_id || !body.user_id) return NextResponse.json({ ok: false, message: 'groupe_id et user_id requis.' }, { status: 400 })
        await addMember(body.groupe_id, body.user_id, body.role || 'membre')
        await notifyUser(body.user_id, { type: 'membre', title: 'Vous avez rejoint un groupe', href: '/member/dashboard/groupes' })
        return NextResponse.json({ ok: true })
      }
      case 'remove_member': {
        if (!body.groupe_id || !body.user_id) return NextResponse.json({ ok: false, message: 'groupe_id et user_id requis.' }, { status: 400 })
        await removeMember(body.groupe_id, body.user_id)
        return NextResponse.json({ ok: true })
      }
      case 'set_role': {
        if (!body.groupe_id || !body.user_id || !body.role) return NextResponse.json({ ok: false, message: 'groupe_id, user_id, role requis.' }, { status: 400 })
        await setMemberRole(body.groupe_id, body.user_id, body.role)
        return NextResponse.json({ ok: true })
      }
      case 'set_primary': {
        if (!body.groupe_id || !body.user_id) return NextResponse.json({ ok: false, message: 'groupe_id et user_id requis.' }, { status: 400 })
        await setPrimaryForUser(body.user_id, body.groupe_id)
        return NextResponse.json({ ok: true })
      }
      case 'approve_request': {
        if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
        return NextResponse.json(await approveJoinRequest(body.id))
      }
      case 'reject_request': {
        if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
        return NextResponse.json(await rejectJoinRequest(body.id))
      }
      default:
        return NextResponse.json({ ok: false, message: 'Action inconnue.' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 400 })
  }
}
