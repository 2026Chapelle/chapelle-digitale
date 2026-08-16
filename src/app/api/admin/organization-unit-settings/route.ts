import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { requireGuardedAdminUnit, mapUnitGuardError, assertUnitAccess } from '@/lib/erp'
import { UnitAccessError } from '@/lib/erp/unit-access'
import {
  ancestorUnitIdsFromPath,
  resolveInheritedUnitSettings,
  type UnitSettingsRow,
} from '@/lib/erp/unit-settings-inheritance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLS =
  'organization_unit_id, organization_id, local_display_name, contact_email, contact_phone, address, timezone, default_locale, default_currency, notif_email_enabled, notif_push_enabled, notif_digest_enabled, notif_newcomer_alert, notif_followup_alert, notif_new_member_alert, notif_escalate_national, notif_escalate_zone, notif_recipients_json, updated_at'

const ALLOWED = [
  'local_display_name',
  'contact_email',
  'contact_phone',
  'address',
  'timezone',
  'default_locale',
  'default_currency',
  'notif_email_enabled',
  'notif_push_enabled',
  'notif_digest_enabled',
  'notif_newcomer_alert',
  'notif_followup_alert',
  'notif_new_member_alert',
  'notif_escalate_national',
  'notif_escalate_zone',
  'notif_recipients_json',
] as const

function resolveUnitId(req: NextRequest, body?: Record<string, unknown>): string {
  const q = req.nextUrl.searchParams.get('unitId') || req.nextUrl.searchParams.get('unit_id') || ''
  if (q) return q
  if (body && typeof body.organization_unit_id === 'string') return body.organization_unit_id
  if (body && typeof body.unitId === 'string') return body.unitId
  return ''
}

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    const unitId = resolveUnitId(req) || guarded.actor.homeUnitIds[0] || ''
    if (!unitId) {
      return NextResponse.json({ ok: false, message: 'unitId requis.' }, { status: 400 })
    }
    const unit = await assertUnitAccess(guarded.actor, unitId)

    const { data, error } = await supabaseAdmin
      .from('organization_unit_settings')
      .select(COLS)
      .eq('organization_unit_id', unitId)
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }

    // Chaîne d'héritage : locale → nationale → zone → HQ (path reversed)
    const chainIds = ancestorUnitIdsFromPath(unit.materialized_path, unitId)
    const { data: chainRows } = await supabaseAdmin
      .from('organization_unit_settings')
      .select(
        'organization_unit_id, timezone, default_locale, default_currency, contact_email, contact_phone, address, local_display_name',
      )
      .eq('organization_id', guarded.organizationId)
      .in('organization_unit_id', chainIds)

    const byId = new Map(
      ((chainRows || []) as UnitSettingsRow[]).map((r) => [r.organization_unit_id, r]),
    )
    const ordered: UnitSettingsRow[] = chainIds
      .map((id) => byId.get(id))
      .filter((r): r is UnitSettingsRow => !!r)

    const { data: orgRow } = await supabaseAdmin
      .from('organizations')
      .select('timezone, default_locale, default_currency')
      .eq('id', guarded.organizationId)
      .maybeSingle()

    const { data: world } = await supabaseAdmin
      .from('organization_settings')
      .select(
        'display_name, branding_locked, pastoral_locked, notifications_locked, official_email, official_phone',
      )
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    const effective = resolveInheritedUnitSettings(ordered, orgRow)

    return NextResponse.json({
      ok: true,
      data: {
        settings: data,
        effective,
        inherited: {
          worldDisplayName: world?.display_name ?? null,
          brandingLocked: world?.branding_locked !== false,
          pastoralLocked: world?.pastoral_locked !== false,
          notificationsLocked: world?.notifications_locked === true,
          officialEmail: world?.official_email ?? null,
          officialPhone: world?.official_phone ?? null,
          chain: chainIds,
          sources: effective.sources,
        },
        unitId,
      },
    })
  } catch (e: unknown) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
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
    const body = await req.json().catch(() => ({}))
    const unitId = resolveUnitId(req, body)
    if (!unitId) {
      return NextResponse.json({ ok: false, message: 'unitId requis.' }, { status: 400 })
    }
    await assertUnitAccess(guarded.actor, unitId, { write: true })

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
    }

    const keys = Object.keys(body).filter(
      (k) => k !== 'unitId' && k !== 'organization_unit_id' && k !== 'unit_id',
    )
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

    const { data: world } = await supabaseAdmin
      .from('organization_settings')
      .select('notifications_locked')
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()

    const notifFields = [
      'notif_email_enabled',
      'notif_push_enabled',
      'notif_digest_enabled',
      'notif_newcomer_alert',
      'notif_followup_alert',
      'notif_new_member_alert',
      'notif_escalate_national',
      'notif_escalate_zone',
      'notif_recipients_json',
    ]
    if (world?.notifications_locked && notifFields.some((f) => f in body) && !guarded.actor.isWorldScope) {
      return NextResponse.json(
        { ok: false, message: 'Notifications verrouillées par le siège mondial.' },
        { status: 403 },
      )
    }

    const patch: Record<string, unknown> = { updated_by: guarded.userId }
    for (const k of [
      'local_display_name',
      'contact_email',
      'contact_phone',
      'address',
    ] as const) {
      if (k in body) {
        if (body[k] === null) patch[k] = null
        else if (typeof body[k] === 'string') patch[k] = body[k].trim() || null
        else return NextResponse.json({ ok: false, message: `Champ ${k} invalide.` }, { status: 400 })
      }
    }
    if ('timezone' in body) {
      if (body.timezone === null) patch.timezone = null
      else if (typeof body.timezone === 'string' && body.timezone.trim()) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: body.timezone.trim() })
        } catch {
          return NextResponse.json({ ok: false, message: 'Fuseau invalide.' }, { status: 400 })
        }
        patch.timezone = body.timezone.trim()
      } else {
        return NextResponse.json({ ok: false, message: 'Fuseau invalide.' }, { status: 400 })
      }
    }
    if ('default_locale' in body) {
      if (body.default_locale === null) patch.default_locale = null
      else if (typeof body.default_locale === 'string' && body.default_locale.trim()) {
        patch.default_locale = body.default_locale.trim().toLowerCase()
      } else {
        return NextResponse.json({ ok: false, message: 'Locale invalide.' }, { status: 400 })
      }
    }
    if ('default_currency' in body) {
      if (body.default_currency === null) patch.default_currency = null
      else if (typeof body.default_currency === 'string') {
        const c = body.default_currency.trim().toUpperCase()
        if (!/^[A-Z]{3}$/.test(c)) {
          return NextResponse.json({ ok: false, message: 'Devise invalide.' }, { status: 400 })
        }
        patch.default_currency = c
      } else {
        return NextResponse.json({ ok: false, message: 'Devise invalide.' }, { status: 400 })
      }
    }
    for (const k of [
      'notif_email_enabled',
      'notif_push_enabled',
      'notif_digest_enabled',
      'notif_newcomer_alert',
      'notif_followup_alert',
      'notif_new_member_alert',
      'notif_escalate_national',
      'notif_escalate_zone',
    ] as const) {
      if (k in body) {
        if (typeof body[k] !== 'boolean') {
          return NextResponse.json({ ok: false, message: `Champ ${k} invalide.` }, { status: 400 })
        }
        patch[k] = body[k]
      }
    }
    if ('notif_recipients_json' in body) {
      if (!Array.isArray(body.notif_recipients_json)) {
        return NextResponse.json({ ok: false, message: 'Destinataires invalides.' }, { status: 400 })
      }
      patch.notif_recipients_json = body.notif_recipients_json
    }

    const { data, error } = await supabaseAdmin
      .from('organization_unit_settings')
      .update(patch)
      .eq('organization_unit_id', unitId)
      .eq('organization_id', guarded.organizationId)
      .select(COLS)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'Paramètres d’unité introuvables.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, data: { settings: data } })
  } catch (e: unknown) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}
