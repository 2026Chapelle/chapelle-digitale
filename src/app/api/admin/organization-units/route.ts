import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  listAccessibleUnitIds,
  assertUnitAccess,
} from '@/lib/erp'
import { UnitAccessError } from '@/lib/erp/unit-access'
import {
  expectedChildType,
  expectedDepth,
  isOrganizationUnitType,
  type OrganizationUnitType,
} from '@/core/erp/unit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Colonnes structurelles uniquement (SSOT opérationnel = organization_unit_settings). */
const UNIT_COLS =
  'id, organization_id, parent_id, unit_type, name, slug, status, continent_code, country_code, city, materialized_path, depth, created_at, updated_at'

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: true, demo: true, data: { units: [] } })
  }

  try {
    const { actor, organizationId } = guarded
    const allowedIds = await listAccessibleUnitIds(actor)
    if (allowedIds.length === 0) {
      return NextResponse.json({ ok: true, data: { units: [] } })
    }

    const { data, error } = await supabaseAdmin
      .from('organization_units')
      .select(UNIT_COLS)
      .eq('organization_id', organizationId)
      .in('id', allowedIds)
      .order('depth', { ascending: true })

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, data: { units: data || [] } })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}

export async function POST(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    const { actor, organizationId, userId } = guarded
    const body = await req.json().catch(() => ({}))

    if (
      'organization_id' in body ||
      'organizationId' in body ||
      'id' in body ||
      'materialized_path' in body ||
      'depth' in body
    ) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }

    // Champs opérationnels refusés sur organization_units (SSOT = unit_settings)
    const operationalForbidden = [
      'address',
      'timezone',
      'default_locale',
      'default_currency',
      'contact_email',
      'contact_phone',
    ]
    for (const k of operationalForbidden) {
      if (k in body) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Champs opérationnels interdits sur organization_units (utiliser organization-unit-settings).',
          },
          { status: 400 },
        )
      }
    }

    const unitType = body.unit_type
    if (!isOrganizationUnitType(unitType) || unitType === 'world_headquarters') {
      return NextResponse.json({ ok: false, message: 'Type d’unité invalide.' }, { status: 400 })
    }

    const parentId = typeof body.parent_id === 'string' ? body.parent_id : ''
    if (!parentId) {
      return NextResponse.json({ ok: false, message: 'parent_id requis.' }, { status: 400 })
    }

    const parent = await assertUnitAccess(actor, parentId, { write: true })
    const expected = expectedChildType(parent.unit_type as OrganizationUnitType)
    if (expected !== unitType) {
      return NextResponse.json(
        { ok: false, message: `Type attendu sous ce parent : ${expected}.` },
        { status: 400 },
      )
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 200) {
      return NextResponse.json({ ok: false, message: 'Nom invalide.' }, { status: 400 })
    }

    let slug =
      typeof body.slug === 'string'
        ? body.slug.trim().toLowerCase()
        : name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80)
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      slug = `unit-${randomUUID().slice(0, 8)}`
    }

    const newId = randomUUID()
    const depth = expectedDepth(unitType)
    const materialized_path = `${parent.materialized_path}${newId}/`

    const row = {
      id: newId,
      organization_id: organizationId,
      parent_id: parentId,
      unit_type: unitType,
      name,
      slug,
      status: 'active',
      continent_code:
        typeof body.continent_code === 'string'
          ? body.continent_code.trim() || null
          : parent.continent_code,
      country_code:
        typeof body.country_code === 'string'
          ? body.country_code.trim() || null
          : parent.country_code,
      city: typeof body.city === 'string' ? body.city.trim() || null : null,
      materialized_path,
      depth,
      created_by: userId,
    }

    const { data, error } = await supabaseAdmin
      .from('organization_units')
      .insert(row)
      .select(UNIT_COLS)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    }

    // Paramètres initiaux dans SSOT (city structurelle reste sur organization_units)
    await supabaseAdmin.from('organization_unit_settings').insert({
      organization_unit_id: newId,
      organization_id: organizationId,
    })

    return NextResponse.json({ ok: true, data: { unit: data } })
  } catch (e: unknown) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}
