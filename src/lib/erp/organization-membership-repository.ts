/**
 * ERP Lot 1 — OrganizationMembershipRepository (lecture, client session, RLS).
 * Aucun supabaseAdmin.
 */

import 'server-only'

import type {
  ErpUserId,
  OrganizationId,
  OrganizationMembership,
  OrganizationMembershipRepository,
} from '@/core/erp'
import { createRouteClient } from '@/lib/supabase-server'
import {
  mapOrganizationMembershipRow,
  type OrganizationMembershipSqlRow,
} from './organization-mapper'
import {
  ErpDataError,
  requireAuthUserId,
  requireMatchingAuthUser,
  type ErpSessionClient,
} from './auth-client'

const MEM_COLUMNS =
  'id, organization_id, user_id, membership_role, status, is_default, joined_at, created_at, updated_at'

export function createOrganizationMembershipRepository(
  client?: ErpSessionClient,
): OrganizationMembershipRepository {
  const getClient = (): ErpSessionClient =>
    client ?? (createRouteClient() as unknown as ErpSessionClient)

  return {
    async findMembership(
      organizationId: OrganizationId,
      userId: ErpUserId,
    ): Promise<OrganizationMembership | null> {
      const c = getClient()
      await requireMatchingAuthUser(c, userId)
      const { data, error } = await c
        .from('organization_members')
        .select(MEM_COLUMNS)
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw new ErpDataError(error.message)
      if (!data) return null
      return mapOrganizationMembershipRow(data as OrganizationMembershipSqlRow)
    },

    async listByOrganization(organizationId: OrganizationId): Promise<OrganizationMembership[]> {
      const c = getClient()
      await requireAuthUserId(c)
      const { data, error } = await c
        .from('organization_members')
        .select(MEM_COLUMNS)
        .eq('organization_id', organizationId)
      if (error) throw new ErpDataError(error.message)
      const rows = (Array.isArray(data) ? data : []) as OrganizationMembershipSqlRow[]
      return rows
        .map((r) => mapOrganizationMembershipRow(r))
        .filter((m): m is OrganizationMembership => m != null)
    },

    async listByUser(userId: ErpUserId): Promise<OrganizationMembership[]> {
      const c = getClient()
      await requireMatchingAuthUser(c, userId)
      const { data, error } = await c
        .from('organization_members')
        .select(MEM_COLUMNS)
        .eq('user_id', userId)
      if (error) throw new ErpDataError(error.message)
      const rows = (Array.isArray(data) ? data : []) as OrganizationMembershipSqlRow[]
      return rows
        .map((r) => mapOrganizationMembershipRow(r))
        .filter((m): m is OrganizationMembership => m != null)
    },

    async hasActiveMembership(
      organizationId: OrganizationId,
      userId: ErpUserId,
    ): Promise<boolean> {
      const m = await this.findMembership(organizationId, userId)
      return !!m && m.status === 'active'
    },
  }
}
