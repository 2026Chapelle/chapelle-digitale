import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { unitGovernanceInviteEmail } from '@/lib/email-templates-unit-governance'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  assertUnitAccess,
  canAssignRoleOnUnit,
  createInvitation,
  listInvitationsForUnit,
  UnitAccessError,
} from '@/lib/erp'
import { isInvitableRole, normalizeEmail, isUuid } from '@/lib/erp/unit-governance-rules'
import type { OrganizationUnitRole } from '@/core/erp/unit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: true, demo: true, data: { invitations: [] } })
  }
  try {
    const unitId = req.nextUrl.searchParams.get('unitId') || ''
    if (!unitId) {
      return NextResponse.json({ ok: false, message: 'unitId requis.' }, { status: 400 })
    }
    if (!isUuid(unitId)) {
      return NextResponse.json({ ok: false, message: 'Identifiant invalide.' }, { status: 400 })
    }
    await assertUnitAccess(guarded.actor, unitId)
    const invitations = await listInvitationsForUnit(guarded.organizationId, unitId)
    return NextResponse.json({ ok: true, data: { invitations } })
  } catch (e) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}

export async function POST(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    if ('organization_id' in body || 'token' in body || 'token_hash' in body || 'actor_user_id' in body) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }
    const unitId = typeof body.organization_unit_id === 'string' ? body.organization_unit_id : ''
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
    const role = body.unit_role
    if (!unitId || !email.includes('@') || !isInvitableRole(role)) {
      return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
    }
    if (!isUuid(unitId)) {
      return NextResponse.json({ ok: false, message: 'Identifiant invalide.' }, { status: 400 })
    }
    if (role === 'world_super_admin') {
      return NextResponse.json({ ok: false, message: 'Rôle non invitable.' }, { status: 400 })
    }
    const unit = await assertUnitAccess(guarded.actor, unitId, { write: true })
    if (!canAssignRoleOnUnit(guarded.actor, role as OrganizationUnitRole, unit.unit_type as any)) {
      return NextResponse.json({ ok: false, message: 'Rôle non attribuable.' }, { status: 403 })
    }

    let inv: { invitationId: string; token: string; expiresAt: string }
    try {
      inv = await createInvitation({
        orgId: guarded.organizationId,
        unitId,
        email,
        proposedRole: role,
        invitedBy: guarded.userId,
      })
    } catch (createErr) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INVITATION_CREATE_FAILED',
          message:
            createErr instanceof Error
              ? createErr.message
              : 'Création de l’invitation impossible.',
        },
        { status: 400 },
      )
    }

    const origin = req.nextUrl.origin
    const acceptUrl = `${origin}/invite/unit?token=${encodeURIComponent(inv.token)}`
    const built = unitGovernanceInviteEmail({
      unitName: unit.name || unitId,
      roleLabel: role,
      acceptUrl,
      expiresLabel: new Date(inv.expiresAt).toLocaleString('fr-FR'),
    })
    const sent = await sendEmail({
      to: email,
      subject: built.subject,
      html: built.html,
      text: built.text,
    })

    let email_outcome: string
    let email_sent: boolean
    let message_fr: string
    if (sent.ok && !sent.skipped) {
      email_outcome = 'INVITATION_CREATED_EMAIL_SENT'
      email_sent = true
      message_fr = 'Invitation créée et email envoyé avec succès.'
    } else if (sent.skipped) {
      email_outcome = 'INVITATION_CREATED_EMAIL_PROVIDER_UNAVAILABLE'
      email_sent = false
      message_fr =
        'Invitation créée, mais le fournisseur d’email n’est pas configuré (envoi non effectué).'
    } else {
      email_outcome = 'INVITATION_CREATED_EMAIL_DELIVERY_FAILED'
      email_sent = false
      message_fr =
        sent.error ||
        'Invitation créée, mais l’envoi de l’email a échoué. Vous pouvez renvoyer plus tard.'
    }

    // JAMAIS token / token_hash dans la réponse API
    return NextResponse.json({
      ok: true,
      data: {
        invitation_id: inv.invitationId,
        expires_at: inv.expiresAt,
        email_outcome,
        email_sent,
        message_fr,
      },
    })
  } catch (e) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return NextResponse.json(
      {
        ok: false,
        code: 'INVITATION_CREATE_FAILED',
        message: e instanceof Error ? e.message : 'Erreur',
      },
      { status: 400 },
    )
  }
}
