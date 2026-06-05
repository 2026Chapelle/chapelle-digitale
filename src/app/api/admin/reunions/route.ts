import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { validateReunionInput } from '@/lib/community/attendance'
import {
  listReunions, getReunion, getReunionAttendance, groupAttendanceStats, recentReunionsAll,
  createReunion, updateReunion, setReunionStatut, recordAttendance, presenceOverview,
} from '@/lib/community/presences-server'

/**
 * Back-office RÉUNIONS & PRÉSENCES — portée GLOBALE (cookie super_admin).
 *   GET                          → réunions récentes (toutes plateformes)
 *   GET ?groupe_id=<id>          → réunions d'un groupe
 *   GET ?groupe_id&stats=1       → statistiques d'assiduité
 *   GET ?reunion_id&attendance=1 → feuille de présence
 *   POST { action }              → create | update | set_statut | record_attendance
 * Tout délègue au service centralisé presences-server (zéro doublon).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const q = req.nextUrl.searchParams
  try {
    if (q.get('overview')) {
      // Synthèse d'assiduité GLOBAL / national / plateforme (gouvernement des présences).
      return NextResponse.json({ ok: true, data: await presenceOverview({ pays: q.get('pays'), plateforme: q.get('plateforme') }) })
    }
    const reunionId = q.get('reunion_id')
    if (reunionId && q.get('attendance')) return NextResponse.json({ ok: true, data: await getReunionAttendance(reunionId) })
    const groupeId = q.get('groupe_id')
    if (groupeId) {
      if (q.get('stats')) return NextResponse.json({ ok: true, data: await groupAttendanceStats(groupeId) })
      return NextResponse.json({ ok: true, data: await listReunions(groupeId), manage: true })
    }
    return NextResponse.json({ ok: true, data: await recentReunionsAll() })
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
        const v = validateReunionInput(body)
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        return NextResponse.json({ ok: true, data: await createReunion(v.value!, null) })
      }
      case 'update': {
        if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
        const r = await getReunion(body.id)
        if (!r) return NextResponse.json({ ok: false, message: 'Réunion introuvable.' }, { status: 404 })
        const v = validateReunionInput({ ...body, groupe_id: r.groupe_id })
        if (!v.ok) return NextResponse.json({ ok: false, message: v.errors.join(' ') }, { status: 400 })
        await updateReunion(body.id, v.value!)
        return NextResponse.json({ ok: true })
      }
      case 'set_statut': {
        if (!body.id || !['planifiee', 'tenue', 'annulee'].includes(body.statut)) return NextResponse.json({ ok: false, message: 'id et statut valides requis.' }, { status: 400 })
        await setReunionStatut(body.id, body.statut)
        return NextResponse.json({ ok: true })
      }
      case 'record_attendance': {
        if (!body.reunion_id || !Array.isArray(body.entries)) return NextResponse.json({ ok: false, message: 'reunion_id et entries requis.' }, { status: 400 })
        return NextResponse.json(await recordAttendance(body.reunion_id, body.entries, null))
      }
      default:
        return NextResponse.json({ ok: false, message: 'Action inconnue.' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 400 })
  }
}
