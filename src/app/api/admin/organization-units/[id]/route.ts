import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  assertUnitAccess,
} from '@/lib/erp'
import { UnitAccessError } from '@/lib/erp/unit-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Colonnes structurelles uniquement. */
const UNIT_COLS =
  'id, organization_id, parent_id, unit_type, name, slug, status, continent_code, country_code, city, materialized_path, depth, created_at, updated_at'

const ALLOWED_PATCH = ['name', 'status', 'continent_code', 'country_code', 'city'] as const

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    const unit = await assertUnitAccess(guarded.actor, ctx.params.id)
    const { data, error } = await supabaseAdmin
      .from('organization_units')
      .select(UNIT_COLS)
      .eq('id', unit.id)
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'Unité introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, data: { unit: data } })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    await assertUnitAccess(guarded.actor, ctx.params.id, { write: true })
    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
    }

    const keys = Object.keys(body)
    if (keys.length === 0) {
      return NextResponse.json({ ok: false, message: 'Payload vide.' }, { status: 400 })
    }

    for (const k of keys) {
      if (!(ALLOWED_PATCH as readonly string[]).includes(k)) {
        return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
      }
    }

    const protectedHints = [
      'id',
      'organization_id',
      'organizationId',
      'parent_id',
      'unit_type',
      'slug',
      'materialized_path',
      'depth',
      'created_at',
      'created_by',
      'address',
      'timezone',
      'default_locale',
      'default_currency',
      'contact_email',
      'contact_phone',
    ]
    for (const h of protectedHints) {
      if (h in body) {
        return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
      }
    }

    const patch: Record<string, unknown> = {}
    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 200) {
        return NextResponse.json({ ok: false, message: 'Nom invalide.' }, { status: 400 })
      }
      patch.name = body.name.trim()
    }
    if ('status' in body) {
      if (!['active', 'suspended', 'archived'].includes(body.status)) {
        return NextResponse.json({ ok: false, message: 'Statut invalide.' }, { status: 400 })
      }
      patch.status = body.status
    }
    for (const k of ['continent_code', 'country_code', 'city'] as const) {
      if (k in body) {
        if (body[k] === null) patch[k] = null
        else if (typeof body[k] === 'string') patch[k] = body[k].trim() || null
        else return NextResponse.json({ ok: false, message: `Champ ${k} invalide.` }, { status: 400 })
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, message: 'Payload vide.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('organization_units')
      .update(patch)
      .eq('id', ctx.params.id)
      .eq('organization_id', guarded.organizationId)
      .select(UNIT_COLS)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'Unité introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, data: { unit: data } })
  } catch (e: unknown) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}
