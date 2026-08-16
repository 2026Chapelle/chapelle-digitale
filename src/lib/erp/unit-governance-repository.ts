/**
 * Lot 6 — lectures memberships / invitations / events (service_role).
 * Mutations invite = RPC only (jamais INSERT/UPDATE direct invitations).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { INVITATION_TTL_MS, normalizeEmail } from '@/lib/erp/unit-governance-rules'
import {
  generateInviteToken,
  hashInviteToken,
  rpcCreateInvitation,
  rpcRevokeInvitation,
} from '@/lib/erp/unit-governance-rpc'

const MEM_COLS =
  'id, organization_id, organization_unit_id, user_id, unit_role, status, is_primary, nominated_by, nominated_at, suspended_by, suspended_at, removed_by, removed_at, notes, created_at, updated_at'

/** Colonnes invitation sans token_hash (ne jamais exposer le hash). */
const INV_COLS =
  'id, organization_id, organization_unit_id, email, email_normalized, proposed_unit_role, status, expires_at, invited_by, created_at, accepted_at, revoked_at, revoked_by'

export async function listMembershipsForUnit(orgId: string, unitId: string) {
  const { data, error } = await supabaseAdmin
    .from('organization_unit_members')
    .select(MEM_COLS)
    .eq('organization_id', orgId)
    .eq('organization_unit_id', unitId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const memberships = data || []
  const userIds = Array.from(new Set(memberships.map((m) => m.user_id).filter(Boolean)))
  const profilesById: Record<
    string,
    { id: string; prenom: string | null; nom: string | null; email: string | null }
  > = {}
  if (userIds.length > 0) {
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, nom, email')
      .in('id', userIds)
    if (pErr) throw new Error(pErr.message)
    for (const p of profiles || []) {
      profilesById[p.id] = p as {
        id: string
        prenom: string | null
        nom: string | null
        email: string | null
      }
    }
  }
  return memberships.map((m) => ({
    ...m,
    profile: profilesById[m.user_id] || null,
  }))
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

  const { id, error } = await rpcCreateInvitation({
    orgId: params.orgId,
    unitId: params.unitId,
    email,
    role: params.proposedRole,
    actorId: params.invitedBy,
    tokenHash,
    expiresAt,
  })
  if (error || !id) throw new Error(error || 'Invitation create failed')

  return { invitationId: id, token, expiresAt }
}

export async function revokeInvitation(params: {
  orgId: string
  invitationId: string
  actorId: string
}) {
  const { id, error } = await rpcRevokeInvitation({
    orgId: params.orgId,
    invitationId: params.invitationId,
    actorId: params.actorId,
  })
  if (error || !id) throw new Error(error || 'Invitation revoke failed')
}

/** Liste les invitations d'une unité (tous statuts, max 50) — sans token_hash. */
export async function listInvitationsForUnit(orgId: string, unitId: string) {
  const { data, error } = await supabaseAdmin
    .from('organization_unit_invitations')
    .select(INV_COLS)
    .eq('organization_id', orgId)
    .eq('organization_unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data || []
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
