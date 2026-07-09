import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getSessionProfile } from '@/lib/member-auth'
import { isValidJourneyStatus, isValidJourneyStepKey, isPreContactStep } from '@/lib/pastoral/newcomer-journey-model'
import { toValidIso } from '@/lib/pastoral/newcomer-actions'

/**
 * Parcours pastoral d'un « Nouveau Venu » (V2.7-B lecture / V2.8-A mutations).
 *   GET  /api/admin/newcomer-journey?intake_id=<uuid>  → { ok, data: { events: [...] } }
 *   POST /api/admin/newcomer-journey { id, action, ... }  → mute le parcours + journalise
 *
 * Les mutations écrivent via le service role (comme le PATCH newcomer-intakes existant) :
 * UPDATE public.newcomer_intakes + INSERT public.newcomer_journey_events. Aucune migration,
 * aucun SQL brut/CLI. Le journal (events) est best-effort : un souci de schéma d'events ne
 * fait jamais échouer la mutation d'état (source de vérité = newcomer_intakes).
 * Garde : cookie admin (isAdminRequest). Service role (jamais exposé au client).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPDATED_COLS = 'id, journey_step_key, journey_status, journey_updated_at, journey_completed_at, follow_up_due_at, last_contacted_at'

const FK_CANDIDATES = ['newcomer_intake_id', 'intake_id'] as const

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { events: [] } })

  const intakeId = req.nextUrl.searchParams.get('intake_id') || ''
  if (!intakeId) return NextResponse.json({ ok: false, message: 'intake_id requis.' }, { status: 400 })

  // Tolérant : on tente plusieurs noms de FK et l'ordre par created_at ; tout échec → [].
  for (const fk of FK_CANDIDATES) {
    try {
      const ordered = await supabaseAdmin
        .from('newcomer_journey_events')
        .select('*')
        .eq(fk, intakeId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!ordered.error && Array.isArray(ordered.data)) {
        return NextResponse.json({ ok: true, data: { events: ordered.data } })
      }
      const plain = await supabaseAdmin
        .from('newcomer_journey_events')
        .select('*')
        .eq(fk, intakeId)
        .limit(20)
      if (!plain.error && Array.isArray(plain.data)) {
        return NextResponse.json({ ok: true, data: { events: plain.data } })
      }
    } catch { /* essaie le candidat FK suivant */ }
  }
  // Historique indisponible (table/colonnes absentes) → repli sobre côté UI.
  return NextResponse.json({ ok: true, data: { events: [] } })
}

/**
 * Mutations du parcours pastoral (V2.8-A). Actions :
 *  - mark_contact       : last_contacted_at=now ; si étape received/needs_contact → first_contact_done
 *  - change_step        : { step_key } ; si completed → status=completed + completed_at
 *  - change_status      : { status ∈ active|paused|completed|closed }
 *  - schedule_follow_up : { follow_up_due_at } ou { clear:true }
 * Chaque action journalise un événement (event_type) best-effort.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    const action = typeof body?.action === 'string' ? body.action : ''
    if (!id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    if (!action) return NextResponse.json({ ok: false, message: 'action requise.' }, { status: 400 })

    const { data: cur, error: readErr } = await supabaseAdmin
      .from('newcomer_intakes')
      .select('id, journey_step_key, journey_status, follow_up_due_at')
      .eq('id', id)
      .single()
    if (readErr || !cur) return NextResponse.json({ ok: false, message: readErr?.message || 'Demande introuvable.' }, { status: 400 })

    const nowIso = new Date().toISOString()
    const curStep = typeof cur.journey_step_key === 'string' ? cur.journey_step_key : null
    const curStatus = typeof cur.journey_status === 'string' ? cur.journey_status : null

    let createdBy: string | null = null
    try { const sp = await getSessionProfile(); createdBy = sp?.uid || null } catch { /* login legacy sans session Supabase → null */ }

    const patch: Record<string, unknown> = { journey_updated_at: nowIso }
    const event: Record<string, unknown> = {
      newcomer_intake_id: id, created_by: createdBy, created_at: nowIso,
      from_step_key: curStep, from_status: curStatus, to_step_key: curStep, to_status: curStatus,
    }

    if (action === 'mark_contact') {
      patch.last_contacted_at = nowIso
      if (isPreContactStep(curStep)) { patch.journey_step_key = 'first_contact_done'; event.to_step_key = 'first_contact_done' }
      event.event_type = 'contact'
    } else if (action === 'change_step') {
      const step = typeof body?.step_key === 'string' ? body.step_key : ''
      if (!isValidJourneyStepKey(step)) return NextResponse.json({ ok: false, message: 'Étape invalide.' }, { status: 400 })
      patch.journey_step_key = step
      event.to_step_key = step
      if (step === 'completed') { patch.journey_status = 'completed'; patch.journey_completed_at = nowIso; event.to_status = 'completed' }
      event.event_type = 'step_change'
    } else if (action === 'change_status') {
      const status = typeof body?.status === 'string' ? body.status : ''
      if (!isValidJourneyStatus(status)) return NextResponse.json({ ok: false, message: 'Statut invalide.' }, { status: 400 })
      patch.journey_status = status
      if (status === 'completed') patch.journey_completed_at = nowIso
      event.to_status = status
      event.event_type = 'status_change'
    } else if (action === 'schedule_follow_up') {
      const clear = body?.clear === true
      const iso = clear ? null : (typeof body?.follow_up_due_at === 'string' ? body.follow_up_due_at : null)
      if (!clear && (!iso || !toValidIso(iso))) return NextResponse.json({ ok: false, message: 'Date de relance invalide.' }, { status: 400 })
      patch.follow_up_due_at = iso
      event.event_type = 'follow_up'
      event.metadata = { follow_up_due_at: iso }
    } else {
      return NextResponse.json({ ok: false, message: 'Action inconnue.' }, { status: 400 })
    }

    const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : null
    if (note) event.note = note

    // Source de vérité : mutation de newcomer_intakes (doit réussir).
    const { data: updated, error: upErr } = await supabaseAdmin
      .from('newcomer_intakes')
      .update(patch)
      .eq('id', id)
      .select(UPDATED_COLS)
      .single()
    if (upErr || !updated) return NextResponse.json({ ok: false, message: upErr?.message || 'Mise à jour impossible.' }, { status: 400 })

    // Journal best-effort (non bloquant) : un souci de schéma events n'annule pas la mutation.
    try { await supabaseAdmin.from('newcomer_journey_events').insert(event) } catch { /* journal indisponible */ }

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
