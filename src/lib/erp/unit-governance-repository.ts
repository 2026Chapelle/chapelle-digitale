/**
 * Lot 6 — lectures memberships / invitations / events (service_role).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { INVITATION_TTL_MS, normalizeEmail } from '@/lib/erp/unit-governance-rules'
import { generateInviteToken, hashInviteToken } from '@/lib/erp/unit-governance-rpc'

const MEM_COLS =
  'id, organization_id, organization_unit_id, user_id, unit_role, status, is_primary, nominated_by, nominated_at, suspended_by, suspended_at, removed_by, removed_at, notes, created_at, updated_at'

export async function listMembershipsForUnit(orgId: string, unitId: string) {
  const { data, error } = await supabaseAdmin
    .from('organization_unit_members')
    .select(MEM_COLS)
    .eq('organization_id', orgId)
    .eq('organization_unit_id', unitId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getMembershipById(orgId: string, membershipId: string) {
  const { data, error } = await supabaseAdmin
    .from('organization_unit_members')
    .select(MEM_COLS)
    .eq('organization_id', orgId)
    .eq('id', membershipId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function listGovernanceEvents(orgId: string, unitId: string, limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('organization_unit_governance_events')
    .select(
      'id, organization_id, organization_unit_id, subject_user_id, actor_user_id, action, from_role, to_role, from_unit_id, to_unit_id, invitation_id, metadata, created_at',
    )
    .eq('organization_id', orgId)
    .eq('organization_unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)))
  if (error) throw new Error(error.message)
  return data || []
}

export async function createInvitation(params: {
  orgId: string
  unitId: string
  email: string
  proposedRole: string
  invitedBy: string
}): Promise<{ invitationId: string; token: string; expiresAt: string }> {
  const token = generateInviteToken()
  const tokenHash = hashInviteToken(token)
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString()
  const email = normalizeEmail(params.email)

  const { data, error } = await supabaseAdmin
    .from('organization_unit_invitations')
    .insert({
      organization_id: params.orgId,
      organization_unit_id: params.unitId,
      email,
      proposed_unit_role: params.proposedRole,
      token_hash: tokenHash,
      status: 'pending',
      invited_by: params.invitedBy,
      expires_at: expiresAt,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) throw new Error(error?.message || 'Invitation insert failed')

  await supabaseAdmin.from('organization_unit_governance_events').insert({
    organization_id: params.orgId,
    organization_unit_id: params.unitId,
    actor_user_id: params.invitedBy,
    action: 'invite_create',
    to_role: params.proposedRole,
    invitation_id: data.id,
    metadata: { email },
  })

  return { invitationId: data.id as string, token, expiresAt }
}

export async function revokeInvitation(params: {
  orgId: string
  invitationId: string
  actorId: string
}) {
  const { data: inv, error } = await supabaseAdmin
    .from('organization_unit_invitations')
    .select('*')
    .eq('organization_id', params.orgId)
    .eq('id', params.invitationId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!inv) throw new Error('Invitation introuvable')
  if (inv.status !== 'pending') throw new Error('Invitation non pending')

  const { error: uerr } = await supabaseAdmin
    .from('organization_unit_invitations')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: params.actorId,
    })
    .eq('id', params.invitationId)
  if (uerr) throw new Error(uerr.message)

  await supabaseAdmin.from('organization_unit_governance_events').insert({
    organization_id: params.orgId,
    organization_unit_id: inv.organization_unit_id,
    actor_user_id: params.actorId,
    action: 'invite_revoke',
    invitation_id: params.invitationId,
    metadata: {},
  })
}

export async function getInvitationByTokenHash(tokenHash: string) {
  const { data, error } = await supabaseAdmin
    .from('organization_unit_invitations')
    .select(
      'id, organization_id, organization_unit_id, email, email_normalized, proposed_unit_role, status, expires_at, invited_by, created_at',
    )
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getUnitPublicLabel(orgId: string, unitId: string) {
  const { data } = await supabaseAdmin
    .from('organization_units')
    .select('id, name, unit_type, organization_id')
    .eq('organization_id', orgId)
    .eq('id', unitId)
    .maybeSingle()
  return data
}

export async function countActiveWorldSuperAdmins(orgId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('organization_unit_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('unit_role', 'world_super_admin')
    .eq('status', 'active')
  if (error) throw new Error(error.message)
  return count ?? 0
}
