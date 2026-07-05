import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { resolveGroupScope } from '@/lib/group-scope'
import { canScopeManageGroup } from '@/lib/community/groups-access'
import { resolveMyPays, getGroup, isGroupLeader, listGroups } from '@/lib/community/groups-server'
import { validateReunionInput } from '@/lib/community/attendance'
import {
  listReunions, getReunion, getReunionAttendance, groupAttendanceStats, memberReunions,
  createReunion, updateReunion, setReunionStatut, recordAttendance, isActiveMember,
  leaderAttendanceSummary, presenceForGroupIds,
} from '@/lib/community/presences-server'

/**
 * Espace membre — RÉUNIONS & PRÉSENCES.
 *   GET                         → mes réunions à venir/récentes + mon statut
 *   GET ?groupe_id=<id>         → réunions du groupe (membre du groupe requis)
 *   GET ?groupe_id&stats=1      → statistiques d'assiduité (gestion/leader)
 *   GET ?reunion_id&attendance=1→ feuille de présence (gestion/leader)
 *   POST { action }             → create | update | set_statut | record_attendance
 *                                 (gestion : périmètre RBAC OU leader du groupe)
 * Autorisation imposée serveur ; écriture via service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Périmètre de gestion sur un groupe : national/admin (scope) OU leader local. */
async function canManageGroup(sp: any, groupeId: string): Promise<boolean> {
  const myPays = await resolveMyPays(sp.uid)
  const scope = resolveGroupScope({ role: sp.role, hasNationAssignment: myPays.length > 0 })
  const g = await getGroup(groupeId)
  if (!g) return false
  if (canScopeManageGroup(scope, g, { uid: sp.uid, myPays })) return true
  return isGroupLeader(sp.uid, groupeId)
}

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const q = req.nextUrl.searchParams
  try {
    if (q.get('overview')) {
      // Synthèse d'assiduité du LEADER (ses groupes animés) + de son PÉRIMÈTRE RBAC (national/all).
      const myPays = await resolveMyPays(sp.uid)
      const scope = resolveGroupScope({ role: sp.role, hasNationAssignment: myPays.length > 0 })
      const leader = await leaderAttendanceSummary(sp.uid)
      let perimetre: any = null
      if (scope !== 'denied') {
        const groups = await listGroups({ scope, uid: sp.uid, myPays })
        perimetre = await presenceForGroupIds(groups.map((g: any) => g.id))
      }
      if (!leader.nb_groupes && !perimetre) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
      return NextResponse.json({ ok: true, data: { leader, perimetre, scope } })
    }
    const reunionId = q.get('reunion_id')
    if (reunionId && q.get('attendance')) {
      const r = await getReunion(reunionId)
      if (!r || !(await canManageGroup(sp, r.groupe_id))) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
      return NextResponse.json({ ok: true, data: await getReunionAttendance(reunionId) })
    }
    const groupeId = q.get('groupe_id')
    if (groupeId) {
      const manage = await canManageGroup(sp, groupeId)
      if (!manage && !(await isActiveMember(sp.uid, groupeId))) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
      if (q.get('stats')) {
        if (!manage) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        return NextResponse.json({ ok: true, data: await groupAttendanceStats(groupeId) })
      }
      return NextResponse.json({ ok: true, data: await listReunions(groupeId), manage })
    }
    // Vue membre par défaut.
    return NextResponse.json({ ok: true, data: await memberReunions(sp.uid) })
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
    switch (action) {
      case 'create': {
        const v = validateReunionInput(body)
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        if (!(await canManageGroup(sp, v.value!.groupe_id))) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        return NextResponse.json({ ok: true, data: await createReunion(v.value!, sp.uid) })
      }
      case 'update': {
        if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
        const r = await getReunion(body.id)
        if (!r || !(await canManageGroup(sp, r.groupe_id))) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        const v = validateReunionInput({ ...body, groupe_id: r.groupe_id })
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        await updateReunion(body.id, v.value!)
        return NextResponse.json({ ok: true })
      }
      case 'set_statut': {
        if (!body.id || !['planifiee', 'tenue', 'annulee'].includes(body.statut)) return NextResponse.json({ ok: false, message: 'id et statut valides requis.' }, { status: 400 })
        const r = await getReunion(body.id)
        if (!r || !(await canManageGroup(sp, r.groupe_id))) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        await setReunionStatut(body.id, body.statut)
        return NextResponse.json({ ok: true })
      }
      case 'record_attendance': {
        if (!body.reunion_id || !Array.isArray(body.entries)) return NextResponse.json({ ok: false, message: 'reunion_id et entries requis.' }, { status: 400 })
        const r = await getReunion(body.reunion_id)
        if (!r || !(await canManageGroup(sp, r.groupe_id))) return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })
        return NextResponse.json(await recordAttendance(body.reunion_id, body.entries, sp.uid))
      }
      default:
        return NextResponse.json({ ok: false, message: 'Action inconnue.' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 400 })
  }
}
