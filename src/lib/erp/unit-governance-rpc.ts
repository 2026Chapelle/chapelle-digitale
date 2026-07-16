/**
 * Lot 6 — appels RPC service_role (atomiques).
 */
import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function rpcNominate(params: {
  orgId: string
  unitId: string
  userId: string
  role: string
  actorId: string
  notes?: string | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await (supabaseAdmin as any).rpc('erp_unit_membership_nominate', {
    p_org_id: params.orgId,
    p_unit_id: params.unitId,
    p_user_id: params.userId,
    p_role: params.role,
    p_actor_id: params.actorId,
    p_notes: params.notes ?? null,
  })
  if (error) return { id: null, error: error.message }
  return { id: data as string, error: null }
}

export async function rpcSetStatus(params: {
  membershipId: string
  status: 'active' | 'suspended' | 'removed'
  actorId: string
  notes?: string | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await (supabaseAdmin as any).rpc('erp_unit_membership_set_status', {
    p_membership_id: params.membershipId,
    p_status: params.status,
    p_actor_id: params.actorId,
    p_notes: params.notes ?? null,
  })
  if (error) return { id: null, error: error.message }
  return { id: data as string, error: null }
}

export async function rpcChangeRole(params: {
  membershipId: string
  newRole: string
  actorId: string
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await (supabaseAdmin as any).rpc('erp_unit_membership_change_role', {
    p_membership_id: params.membershipId,
    p_new_role: params.newRole,
    p_actor_id: params.actorId,
  })
  if (error) return { id: null, error: error.message }
  return { id: data as string, error: null }
}

export async function rpcTransfer(params: {
  membershipId: string
  toUnitId: string
  actorId: string
  role?: string | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await (supabaseAdmin as any).rpc('erp_unit_membership_transfer', {
    p_membership_id: params.membershipId,
    p_to_unit_id: params.toUnitId,
    p_actor_id: params.actorId,
    p_role: params.role ?? null,
  })
  if (error) return { id: null, error: error.message }
  return { id: data as string, error: null }
}

export async function rpcAcceptInvitation(params: {
  tokenHash: string
  userId: string
  email: string
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await (supabaseAdmin as any).rpc('erp_unit_invitation_accept', {
    p_token_hash: params.tokenHash,
    p_user_id: params.userId,
    p_email: params.email,
  })
  if (error) return { id: null, error: error.message }
  // RPC returns NULL when pending invitation was atomically marked expired (no SQL exception).
  if (data == null) return { id: null, error: 'invitation_expired' }
  return { id: data as string, error: null }
}
