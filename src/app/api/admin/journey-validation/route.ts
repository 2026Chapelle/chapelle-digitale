import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getServerProfile } from '@/lib/supabase-server'
import { can } from '@/lib/permissions'
import {
  readCanonicalAxesRow, readAxisHistory, readActiveMinistryRows, validateAxis,
} from '@/lib/canonical/canonical-server'
import { checkValidationIntent, labelForAxisValue } from '@/lib/canonical/validation-service'
import { ministryRoleDef } from '@/lib/canonical/ministry'

/**
 * VALIDATION PASTORALE D'UN AXE CANONIQUE (Phase 3C).
 *   GET  /api/admin/journey-validation?member_id=<uuid>  → bundle admin (axes + audit + ministères)
 *   POST /api/admin/journey-validation { member_id, axis, new_value, justification }
 *        → validation ATOMIQUE nominative via RPC validate_member_canonical_axis
 *
 * GET : lecture ADMIN (garde cookie admin, comme le dossier 360°).
 * POST : sensible → EXIGE une identité nominative (getServerProfile) + la permission
 *        dédiée can_validate_journey_change. La portée pastorale (superviseur / berger
 *        direct) est re-vérifiée en DB par la RPC (défense en profondeur, fail-closed).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: null })

  const memberId = req.nextUrl.searchParams.get('member_id') || ''
  if (!memberId) return NextResponse.json({ ok: false, message: 'member_id requis.' }, { status: 400 })

  try {
    const [axes, history, ministries] = await Promise.all([
      readCanonicalAxesRow(memberId),
      readAxisHistory(memberId),
      readActiveMinistryRows(memberId),
    ])
    return NextResponse.json({
      ok: true,
      data: {
        axes: axes
          ? {
              growth_level: axes.growth_level,
              growth_label: labelForAxisValue('growth_level', axes.growth_level),
              growth_review_state: axes.growth_review_state,
              community_status: axes.community_status,
              community_label: labelForAxisValue('community_status', axes.community_status),
              community_review_state: axes.community_review_state,
              updated_at: axes.updated_at ?? null,
            }
          : null,
        ministries: ministries.map((m) => ({ key: m.role_key, label: ministryRoleDef(m.role_key)?.label_fr ?? m.role_key })),
        history: history.map((h) => ({
          id: h.id,
          axis: h.axis,
          old_label: labelForAxisValue(h.axis as 'growth_level' | 'community_status', h.old_value),
          new_label: labelForAxisValue(h.axis as 'growth_level' | 'community_status', h.new_value),
          actor_label: h.actor_label,
          justification: h.justification,
          provenance: h.provenance,
          created_at: h.created_at,
        })),
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Indisponible en démo.' }, { status: 400 })

  // Identité NOMINATIVE obligatoire : une validation pastorale ne peut jamais être anonyme.
  const actor = await getServerProfile().catch(() => null)
  if (!actor?.id) {
    return NextResponse.json(
      { ok: false, code: 'NO_IDENTITY', message: 'Identité nominative requise : connectez-vous avec votre compte pastoral pour valider.' },
      { status: 403 },
    )
  }
  if (!can({ role: actor.role, membre_statut: (actor as { membre_statut?: string | null }).membre_statut }, 'can_validate_journey_change')) {
    return NextResponse.json({ ok: false, code: 'FORBIDDEN', message: 'Vous n’avez pas la permission de valider un changement de parcours.' }, { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* body vide toléré → refus en aval */ }

  const check = checkValidationIntent({
    profileId: body.member_id,
    axis: body.axis,
    newValue: body.new_value,
    justification: body.justification,
  })
  if (!check.ok) return NextResponse.json({ ok: false, code: 'INVALID_INPUT', message: check.message }, { status: 400 })

  const actorLabel =
    [actor.prenom, actor.nom].filter(Boolean).join(' ').trim() || actor.email || null

  const result = await validateAxis({
    profileId: check.intent.profileId,
    axis: check.intent.axis,
    newValue: check.intent.newValue,
    actorId: actor.id,
    actorLabel,
    justification: check.intent.justification,
  })

  if (!result.ok) {
    const status = result.code === 'NOT_AUTHORIZED' ? 403 : result.code === 'INVALID_INPUT' ? 400 : 500
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status })
  }
  return NextResponse.json({ ok: true, data: result.data })
}
