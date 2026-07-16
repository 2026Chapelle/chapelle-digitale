import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  resolveAdminOrganizationForRequest,
  requireActiveOwnerOrAdmin,
} from '@/lib/erp/admin-profiles-scope'

/**
 * Lot 4 — Paramètres essentiels de l'organisation canonique.
 *   GET   /api/admin/organization  → lecture bornée
 *   PATCH /api/admin/organization  → update whitelist stricte
 *
 * Garde : cookie admin + org canonique serveur + owner/admin actif.
 * service_role uniquement après les gardes. Aucun organization_id client.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PUBLIC_COLS =
  'id, name, slug, status, country, timezone, default_locale, default_currency, updated_at'

const ALLOWED_PATCH_KEYS = [
  'name',
  'country',
  'timezone',
  'default_locale',
  'default_currency',
] as const

type AllowedPatchKey = (typeof ALLOWED_PATCH_KEYS)[number]

const PROTECTED_OR_UNKNOWN_HINTS = [
  'id',
  'slug',
  'status',
  'created_by',
  'created_at',
  'updated_at',
  'logo_url',
  'organization_id',
  'organizationId',
] as const

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function publicOrgPayload(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    country: row.country ?? null,
    timezone: row.timezone,
    default_locale: row.default_locale,
    default_currency: row.default_currency,
    updated_at: row.updated_at,
  }
}

function mapGuardError(e: unknown): NextResponse | null {
  const err = e as { code?: string; status?: number; message?: string }
  if (err?.code === 'admin_profile_scope_error' || err?.message?.includes('Autorisation')) {
    return NextResponse.json(
      { ok: false, message: err.message || 'Autorisation organisationnelle insuffisante.' },
      { status: err.status || 403 },
    )
  }
  if (err?.code === 'canonical_organization_error') {
    const msg = err.message || ''
    if (msg.includes('absente') || msg.includes('dupliquée')) {
      return NextResponse.json(
        { ok: false, message: 'Organisation introuvable.' },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: false, message: 'Erreur serveur' }, { status: 500 })
  }
  return null
}

function parsePatchBody(body: unknown):
  | { ok: true; payload: Record<AllowedPatchKey, string | null> }
  | { ok: false; message: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Payload invalide.' }
  }
  const raw = body as Record<string, unknown>
  const keys = Object.keys(raw)

  if (keys.length === 0) {
    return { ok: false, message: 'Payload vide.' }
  }

  for (const key of keys) {
    if (!(ALLOWED_PATCH_KEYS as readonly string[]).includes(key)) {
      return { ok: false, message: 'Champs non modifiables.' }
    }
  }

  for (const hint of PROTECTED_OR_UNKNOWN_HINTS) {
    if (hint in raw) {
      return { ok: false, message: 'Champs non modifiables.' }
    }
  }

  const payload: Partial<Record<AllowedPatchKey, string | null>> = {}

  if ('name' in raw) {
    if (typeof raw.name !== 'string') {
      return { ok: false, message: 'Nom invalide.' }
    }
    const name = raw.name.trim()
    if (!name || name.length > 200) {
      return { ok: false, message: 'Nom invalide.' }
    }
    payload.name = name
  }

  if ('country' in raw) {
    if (raw.country === null) {
      payload.country = null
    } else if (typeof raw.country === 'string') {
      const country = raw.country.trim()
      if (country.length === 0) {
        payload.country = null
      } else if (country.length > 100) {
        return { ok: false, message: 'Pays invalide.' }
      } else {
        payload.country = country
      }
    } else {
      return { ok: false, message: 'Pays invalide.' }
    }
  }

  if ('timezone' in raw) {
    if (typeof raw.timezone !== 'string') {
      return { ok: false, message: 'Fuseau horaire invalide.' }
    }
    const timezone = raw.timezone.trim()
    if (!timezone || timezone.length > 64 || !isValidIanaTimezone(timezone)) {
      return { ok: false, message: 'Fuseau horaire invalide.' }
    }
    payload.timezone = timezone
  }

  if ('default_locale' in raw) {
    if (typeof raw.default_locale !== 'string') {
      return { ok: false, message: 'Locale invalide.' }
    }
    const locale = raw.default_locale.trim().toLowerCase()
    // BCP 47 simple : fr | en | fr-fr | en-us | …
    if (!locale || locale.length > 35 || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(locale)) {
      return { ok: false, message: 'Locale invalide.' }
    }
    payload.default_locale = locale
  }

  if ('default_currency' in raw) {
    if (typeof raw.default_currency !== 'string') {
      return { ok: false, message: 'Devise invalide.' }
    }
    const currency = raw.default_currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { ok: false, message: 'Devise invalide.' }
    }
    payload.default_currency = currency
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, message: 'Payload vide.' }
  }

  return { ok: true, payload: payload as Record<AllowedPatchKey, string | null> }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    const organizationId = await resolveAdminOrganizationForRequest(true)
    await requireActiveOwnerOrAdmin(organizationId)

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select(PUBLIC_COLS)
      .eq('id', organizationId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'Organisation introuvable.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: publicOrgPayload(data as Record<string, unknown>) })
  } catch (e: unknown) {
    const mapped = mapGuardError(e)
    if (mapped) return mapped
    const message = e instanceof Error ? e.message : 'Erreur'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => null)
    const parsed = parsePatchBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 })
    }

    const organizationId = await resolveAdminOrganizationForRequest(true)
    await requireActiveOwnerOrAdmin(organizationId)

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(parsed.payload)
      .eq('id', organizationId)
      .select(PUBLIC_COLS)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'Organisation introuvable.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: publicOrgPayload(data as Record<string, unknown>) })
  } catch (e: unknown) {
    const mapped = mapGuardError(e)
    if (mapped) return mapped
    const message = e instanceof Error ? e.message : 'Erreur'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
