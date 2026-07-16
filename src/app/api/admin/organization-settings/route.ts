import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { requireGuardedAdminUnit, mapUnitGuardError } from '@/lib/erp'
import { canManageWorldSettings, canUnlockBranding } from '@/lib/erp/unit-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLS =
  'organization_id, display_name, short_name, slogan, logo_url, logo_light_url, logo_dark_url, primary_color, secondary_color, official_email, official_phone, official_website, headquarters_address, branding_locked, pastoral_locked, notifications_locked, updated_at'

const ALLOWED = [
  'display_name',
  'short_name',
  'slogan',
  'logo_url',
  'logo_light_url',
  'logo_dark_url',
  'primary_color',
  'secondary_color',
  'official_email',
  'official_phone',
  'official_website',
  'headquarters_address',
  'branding_locked',
  'pastoral_locked',
  'notifications_locked',
] as const

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('organization_settings')
      .select(COLS)
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      data: {
        settings: data,
        meta: {
          canEdit: canManageWorldSettings(guarded.actor),
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
    if (!canManageWorldSettings(guarded.actor)) {
      return NextResponse.json({ ok: false, message: 'Modification mondiale non autorisée.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
    }
    const keys = Object.keys(body)
    if (!keys.length) {
      return NextResponse.json({ ok: false, message: 'Payload vide.' }, { status: 400 })
    }
    for (const k of keys) {
      if (!(ALLOWED as readonly string[]).includes(k)) {
        return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
      }
    }
    if ('organization_id' in body || 'organizationId' in body || 'id' in body) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }

    const { data: current } = await supabaseAdmin
      .from('organization_settings')
      .select('branding_locked, pastoral_locked, notifications_locked')
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    const brandingLocked = current?.branding_locked !== false
    const brandingFields = [
      'display_name',
      'short_name',
      'slogan',
      'logo_url',
      'logo_light_url',
      'logo_dark_url',
      'primary_color',
      'secondary_color',
      'official_email',
      'official_phone',
      'official_website',
      'headquarters_address',
    ]
    if (brandingLocked && brandingFields.some((f) => f in body) && !canUnlockBranding(guarded.actor)) {
      return NextResponse.json(
        { ok: false, message: 'Branding verrouillé par le siège mondial.' },
        { status: 403 },
      )
    }
    if (
      ('branding_locked' in body || 'pastoral_locked' in body || 'notifications_locked' in body) &&
      !canUnlockBranding(guarded.actor)
    ) {
      return NextResponse.json(
        { ok: false, message: 'Verrous réservés au super admin mondial.' },
        { status: 403 },
      )
    }

    const patch: Record<string, unknown> = { updated_by: guarded.userId }
    if ('display_name' in body) {
      if (typeof body.display_name !== 'string' || !body.display_name.trim()) {
        return NextResponse.json({ ok: false, message: 'Nom invalide.' }, { status: 400 })
      }
      patch.display_name = body.display_name.trim()
    }
    for (const k of [
      'short_name',
      'slogan',
      'logo_url',
      'logo_light_url',
      'logo_dark_url',
      'primary_color',
      'secondary_color',
      'official_email',
      'official_phone',
      'official_website',
      'headquarters_address',
    ] as const) {
      if (k in body) {
        if (body[k] === null) patch[k] = null
        else if (typeof body[k] === 'string') patch[k] = body[k].trim() || null
        else return NextResponse.json({ ok: false, message: `Champ ${k} invalide.` }, { status: 400 })
      }
    }
    for (const k of ['branding_locked', 'pastoral_locked', 'notifications_locked'] as const) {
      if (k in body) {
        if (typeof body[k] !== 'boolean') {
          return NextResponse.json({ ok: false, message: `Champ ${k} invalide.` }, { status: 400 })
        }
        patch[k] = body[k]
      }
    }

    const { data, error } = await supabaseAdmin
      .from('organization_settings')
      .update(patch)
      .eq('organization_id', guarded.organizationId)
      .select(COLS)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'Paramètres introuvables.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, data: { settings: data } })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}
