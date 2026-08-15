/**
 * Lot 5 — garde commune routes admin hiérarchie / settings.
 * 1. isAdminRequest (appelant)
 * 2. resolveAdminActorProfile
 * 3. resolveCanonicalOrganization
 * 4. resolveActorUnitContext
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { resolveAdminOrganizationForRequest } from '@/lib/erp/admin-profiles-scope'
import {
  resolveAdminActorProfile,
  resolveActorUnitContext,
  UnitAccessError,
  type ActorUnitContext,
} from '@/lib/erp/unit-access'
import { CanonicalOrganizationError } from '@/lib/erp/resolve-canonical-organization'

export type GuardedAdminUnitRequest = {
  actor: ActorUnitContext
  organizationId: string
  userId: string
  email: string | null
}

export async function requireGuardedAdminUnit(
  req: NextRequest,
): Promise<GuardedAdminUnitRequest | NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }

  try {
    const profile = await resolveAdminActorProfile()
    const organizationId = await resolveAdminOrganizationForRequest(true)
    const actor = await resolveActorUnitContext(organizationId, profile.userId)
    actor.email = profile.email
    return {
      actor,
      organizationId,
      userId: profile.userId,
      email: profile.email,
    }
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}

export function mapUnitGuardError(e: unknown): NextResponse {
  const err = e as { code?: string; status?: number; message?: string; errorCode?: string }
  if (err?.code === 'unit_access_error') {
    return NextResponse.json(
      {
        ok: false,
        message: err.message || 'Accès refusé.',
        code: err.errorCode || undefined,
      },
      { status: err.status || 403 },
    )
  }
  if (err?.code === 'admin_profile_scope_error' || err?.message?.includes('Autorisation')) {
    return NextResponse.json(
      { ok: false, message: err.message || 'Autorisation insuffisante.' },
      { status: err.status || 403 },
    )
  }
  if (err?.code === 'canonical_organization_error') {
    const msg = err.message || ''
    if (msg.includes('absente') || msg.includes('dupliquée')) {
      return NextResponse.json({ ok: false, message: 'Organisation introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ ok: false, message: 'Erreur serveur' }, { status: 500 })
  }
  return NextResponse.json(
    { ok: false, message: err?.message || 'Erreur' },
    { status: 500 },
  )
}
