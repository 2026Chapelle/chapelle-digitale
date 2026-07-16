import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { requireGuardedAdminUnit, mapUnitGuardError } from '@/lib/erp'
import { canEditPastoralTemplate, canUnlockBranding } from '@/lib/erp/unit-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    const { data: template, error: tErr } = await supabaseAdmin
      .from('pastoral_journey_templates')
      .select('id, organization_id, key, name, is_active, locked, updated_at')
      .eq('organization_id', guarded.organizationId)
      .eq('key', 'default')
      .maybeSingle()

    if (tErr) {
      return NextResponse.json({ ok: false, message: tErr.message }, { status: 500 })
    }

    let steps: unknown[] = []
    if (template?.id) {
      const { data: sdata, error: sErr } = await supabaseAdmin
        .from('pastoral_journey_template_steps')
        .select('id, step_key, label, position, is_enabled, follow_up_hours')
        .eq('template_id', template.id)
        .order('position', { ascending: true })
      if (sErr) {
        return NextResponse.json({ ok: false, message: sErr.message }, { status: 500 })
      }
      steps = sdata || []
    }

    const { data: world } = await supabaseAdmin
      .from('organization_settings')
      .select('pastoral_locked')
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      data: {
        template,
        steps,
        meta: {
          pastoralLocked: world?.pastoral_locked !== false || template?.locked === true,
          canEdit: canEditPastoralTemplate(guarded.actor),
          canUnlock: canUnlockBranding(guarded.actor),
        },
      },
    })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}

export async function PATCH(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    if (!canEditPastoralTemplate(guarded.actor)) {
      return NextResponse.json({ ok: false, message: 'Modification pastorale non autorisée.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
    }

    if ('organization_id' in body || 'organizationId' in body) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }

    const { data: template } = await supabaseAdmin
      .from('pastoral_journey_templates')
      .select('id, locked')
      .eq('organization_id', guarded.organizationId)
      .eq('key', 'default')
      .maybeSingle()

    if (!template) {
      return NextResponse.json({ ok: false, message: 'Template pastoral introuvable.' }, { status: 404 })
    }

    const { data: world } = await supabaseAdmin
      .from('organization_settings')
      .select('pastoral_locked')
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    const locked = world?.pastoral_locked !== false || template.locked === true
    if (locked && !canUnlockBranding(guarded.actor)) {
      return NextResponse.json(
        { ok: false, message: 'Parcours verrouillé par le siège mondial.' },
        { status: 403 },
      )
    }

    // steps: [{ id, is_enabled?, follow_up_hours?, label? }]
    if (Array.isArray(body.steps)) {
      for (const step of body.steps) {
        if (!step || typeof step !== 'object' || typeof step.id !== 'string') {
          return NextResponse.json({ ok: false, message: 'Étape invalide.' }, { status: 400 })
        }
        if ('step_key' in step) {
          return NextResponse.json(
            { ok: false, message: 'step_key non modifiable (clé technique stable).' },
            { status: 400 },
          )
        }
        const patch: Record<string, unknown> = {}
        if ('is_enabled' in step) {
          if (typeof step.is_enabled !== 'boolean') {
            return NextResponse.json({ ok: false, message: 'is_enabled invalide.' }, { status: 400 })
          }
          patch.is_enabled = step.is_enabled
        }
        if ('follow_up_hours' in step) {
          if (step.follow_up_hours !== null && (typeof step.follow_up_hours !== 'number' || step.follow_up_hours < 0)) {
            return NextResponse.json({ ok: false, message: 'follow_up_hours invalide.' }, { status: 400 })
          }
          patch.follow_up_hours = step.follow_up_hours
        }
        if ('label' in step) {
          if (typeof step.label !== 'string' || !step.label.trim()) {
            return NextResponse.json({ ok: false, message: 'label invalide.' }, { status: 400 })
          }
          patch.label = step.label.trim()
        }
        if (Object.keys(patch).length === 0) continue

        const { error } = await supabaseAdmin
          .from('pastoral_journey_template_steps')
          .update(patch)
          .eq('id', step.id)
          .eq('template_id', template.id)

        if (error) {
          return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
        }
      }
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      await supabaseAdmin
        .from('pastoral_journey_templates')
        .update({ name: body.name.trim() })
        .eq('id', template.id)
    }

    if (typeof body.is_active === 'boolean') {
      await supabaseAdmin
        .from('pastoral_journey_templates')
        .update({ is_active: body.is_active })
        .eq('id', template.id)
    }

    // Relecture
    const { data: t2 } = await supabaseAdmin
      .from('pastoral_journey_templates')
      .select('id, organization_id, key, name, is_active, locked, updated_at')
      .eq('id', template.id)
      .maybeSingle()

    const { data: steps } = await supabaseAdmin
      .from('pastoral_journey_template_steps')
      .select('id, step_key, label, position, is_enabled, follow_up_hours')
      .eq('template_id', template.id)
      .order('position', { ascending: true })

    return NextResponse.json({
      ok: true,
      data: { template: t2, steps: steps || [] },
    })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}
