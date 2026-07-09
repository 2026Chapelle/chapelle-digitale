import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { mergeAdminNote, normalizeAdminNote } from '@/lib/pastoral/newcomer-notes'
import { isValidActionKey, applyAction, setNextFollowUp, parseJourney, mergePastoralJourney, toValidIso } from '@/lib/pastoral/newcomer-actions'

/**
 * Demandes « Nouveau Venu » (back-office) — table public.newcomer_intakes.
 *   GET   /api/admin/newcomer-intakes?status=  → liste réelle (triée created_at desc)
 *   PATCH /api/admin/newcomer-intakes { id, status?, note? }  → statut et/ou note pastorale
 * Garde : cookie admin (isAdminRequest). Service role (jamais exposé au client).
 * N'écrit QUE dans newcomer_intakes (jamais profiles / auth.users / newcomer_pipeline).
 * La note pastorale est stockée dans metadata.admin_note (jsonb existant, sans SQL).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// V2.5-B.2-A : on expose EN PLUS trois colonnes DÉJÀ existantes (aucune migration,
// aucune écriture) — assigned_to_profile_id / converted_profile_id / intake_payload —
// pour que le moteur d'intelligence pastorale puisse raisonner sur l'assignation et
// la conversion. Lecture seule stricte : ces colonnes ne sont jamais écrites ici.
const COLS = 'id, prenom, nom, telephone, email, source, message, priority, status, created_at, processed_at, archived_at, metadata, assigned_to_profile_id, converted_profile_id, intake_payload'
const ALLOWED_STATUS = ['new', 'to_review', 'contacted', 'converted', 'duplicate', 'archived'] as const

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { intakes: [] } })
  try {
    const status = req.nextUrl.searchParams.get('status') || ''
    let query = supabaseAdmin
      .from('newcomer_intakes')
      .select(COLS)
      .order('created_at', { ascending: false })
      .limit(500)
    if (status && (ALLOWED_STATUS as readonly string[]).includes(status)) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    // V2.7-B (best-effort, lecture seule) : enrichit chaque demande avec les colonnes de
    // parcours (modèle SQL V2.7-A) via une requête SÉPARÉE. Si ces colonnes n'existent pas
    // encore, on ignore silencieusement — l'inbox n'est jamais cassée (compatibilité totale).
    let intakes = data || []
    try {
      const ids = intakes.map((i: { id: string }) => i.id).filter(Boolean)
      if (ids.length) {
        const { data: jrows, error: jerr } = await supabaseAdmin
          .from('newcomer_intakes')
          .select('id, journey_step_key, journey_status, journey_updated_at, journey_completed_at, follow_up_due_at, last_contacted_at')
          .in('id', ids)
        if (!jerr && Array.isArray(jrows)) {
          const map = new Map((jrows as Array<{ id: string }>).map((r) => [r.id, r]))
          intakes = intakes.map((i) => ({ ...i, ...(map.get(i.id) || {}) }))
        }
      }
    } catch { /* modèle parcours absent → fallback UI « Parcours non renseigné » */ }

    // V2.7-C (best-effort, lecture seule) : référentiel d'étapes pour libellés FR.
    // Si la table est absente/vide, on renvoie [] → l'app applique ses libellés FR intégrés.
    let journeySteps: unknown[] = []
    try {
      const { data: steps, error: serr } = await supabaseAdmin
        .from('newcomer_journey_steps')
        .select('step_key, label, sort_order')
        .order('sort_order', { ascending: true })
      if (!serr && Array.isArray(steps)) journeySteps = steps
    } catch { /* référentiel absent → fallback FR intégré côté app */ }

    return NextResponse.json({ ok: true, data: { intakes, journeySteps } })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    const status = typeof body?.status === 'string' ? body.status : ''
    const note = normalizeAdminNote(body?.note)
    // V2.6-C (additif, 0 SQL) : action pastorale enregistrable + relance manuelle, stockées
    // dans metadata.pastoral_journey via un merge NON destructif (préserve admin_note).
    const action = typeof body?.action === 'string' ? body.action : ''
    const followUpProvided = body?.clear_follow_up === true || Object.prototype.hasOwnProperty.call(body ?? {}, 'next_follow_up_at')
    const followUpValue: string | null = body?.clear_follow_up === true ? null : (typeof body?.next_follow_up_at === 'string' ? body.next_follow_up_at : null)

    if (!id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    if (!status && !note && !action && !followUpProvided) return NextResponse.json({ ok: false, message: 'status, note, action ou relance requis.' }, { status: 400 })
    if (status && !(ALLOWED_STATUS as readonly string[]).includes(status)) {
      return NextResponse.json({ ok: false, message: 'Statut invalide.' }, { status: 400 })
    }
    if (action && !isValidActionKey(action)) return NextResponse.json({ ok: false, message: 'Action inconnue.' }, { status: 400 })
    if (followUpProvided && followUpValue !== null && !toValidIso(followUpValue)) return NextResponse.json({ ok: false, message: 'Date de relance invalide.' }, { status: 400 })

    const nowIso = new Date().toISOString()
    const patch: Record<string, unknown> = {}
    if (status) {
      patch.status = status
      if (status === 'archived') patch.archived_at = nowIso
      if (status === 'contacted' || status === 'converted') patch.processed_at = nowIso
    }
    // Toute écriture metadata part du metadata COURANT (lecture unique) et applique des
    // merges NON destructifs successifs — admin_note et pastoral_journey coexistent.
    if (note || action || followUpProvided) {
      const { data: cur, error: readErr } = await supabaseAdmin
        .from('newcomer_intakes')
        .select('metadata')
        .eq('id', id)
        .single()
      if (readErr || !cur) return NextResponse.json({ ok: false, message: readErr?.message || 'Demande introuvable.' }, { status: 400 })
      let meta: unknown = cur.metadata
      if (note) meta = mergeAdminNote(meta, note, nowIso).metadata
      if (action || followUpProvided) {
        let journey = parseJourney(meta)
        if (action) journey = applyAction(journey, action, nowIso)
        if (followUpProvided) journey = setNextFollowUp(journey, followUpValue)
        meta = mergePastoralJourney(meta, journey, nowIso).metadata
      }
      patch.metadata = meta
    }

    const { data, error } = await supabaseAdmin
      .from('newcomer_intakes')
      .update(patch)
      .eq('id', id)
      .select('id, status, processed_at, archived_at, metadata')
      .single()

    if (error || !data) return NextResponse.json({ ok: false, message: error?.message || 'Mise à jour impossible.' }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
