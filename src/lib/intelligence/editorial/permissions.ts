import { NextResponse, type NextRequest } from 'next/server'
import { can } from '@/lib/permissions'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import {
  canManageWorldSettings,
  resolveActorUnitContext,
  type ActorUnitContext,
} from '@/lib/erp/unit-access'
import { resolveAdminOrganizationForRequest } from '@/lib/erp/admin-profiles-scope'

export type EditorialAccessMode = 'read' | 'write'

export interface EditorialRouteAccess {
  actor: ActorUnitContext
  profileRole: string | null
  organizationId: string
  userId: string
  email: string | null
}

function canUseEditorialPermission(profileRole: string | null): boolean {
  return can({ role: profileRole }, 'can_manage_editorial_intelligence')
}

function canUseAdminReader(profileRole: string | null): boolean {
  return can({ role: profileRole }, 'can_access_admin')
}

export function canReadEditorialIntelligence(
  actor: Pick<ActorUnitContext, 'memberships' | 'highestRole'>,
  profileRole: string | null,
): boolean {
  return canManageWorldSettings(actor as ActorUnitContext) || canUseAdminReader(profileRole) || canUseEditorialPermission(profileRole)
}

export function canWriteEditorialIntelligence(
  actor: Pick<ActorUnitContext, 'memberships' | 'highestRole'>,
  profileRole: string | null,
): boolean {
  return canManageWorldSettings(actor as ActorUnitContext) || canUseEditorialPermission(profileRole)
}

export async function resolveEditorialWorkspaceAccess(
  req: NextRequest,
  mode: EditorialAccessMode,
): Promise<EditorialRouteAccess | NextResponse> {
  const profile = await getVerifiedRouteProfile()
  if (!profile) {
    return NextResponse.json({ ok: false, message: 'Identité requise.' }, { status: 401 })
  }

  const organizationId = await resolveAdminOrganizationForRequest(true)
  const actor = await resolveActorUnitContext(organizationId, profile.uid)

  const canAccess =
    mode === 'write'
      ? canWriteEditorialIntelligence(actor, profile.role)
      : canReadEditorialIntelligence(actor, profile.role)

  if (!canAccess) {
    return NextResponse.json(
      { ok: false, message: 'Accès éditorial insuffisant.' },
      { status: 403 },
    )
  }

  return {
    actor,
    profileRole: profile.role ?? null,
    organizationId,
    userId: profile.uid,
    email: profile.email,
  }
}
