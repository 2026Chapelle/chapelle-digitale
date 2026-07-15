/**
 * ERP Lot 1 — OrganizationRepository (lecture, client session, RLS).
 * Aucun supabaseAdmin.
 */

import 'server-only'

import type { Organization, OrganizationId, OrganizationRepository, ErpUserId } from '@/core/erp'
import { createRouteClient } from '@/lib/supabase-server'
import {
  mapOrganizationMembershipRow,
  mapOrganizationRow,
  type OrganizationMembershipSqlRow,
  type OrganizationSqlRow,
} from './organization-mapper'
import {
  ErpDataError,
  requireAuthUserId,
  requireMatchingAuthUser,
  type ErpSessionClient,
} from './auth-client'

const ORG_COLUMNS =
  'id, name, slug, status, country, timezone, default_locale, default_currency, logo_url, created_by, created_at, updated_at'

const MEM_COLUMNS =
  'id, organization_id, user_id, membership_role, status, is_default, joined_at, created_at, updated_at'

export function createOrganizationRepository(client?: ErpSessionClient): OrganizationRepository {
  const getClient = (): ErpSessionClient =>
    client ?? (createRouteClient() as unknown as ErpSessionClient)

  return {
    async findById(id: OrganizationId): Promise<Organization | null> {
      const c = getClient()
      await requireAuthUserId(c)
      const { data, error } = await c.from('organizations').select(ORG_COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new ErpDataError(error.message)
      if (!data) return null
      return mapOrganizationRow(data as OrganizationSqlRow)
    },

    async findBySlug(slug: string): Promise<Organization | null> {
      const c = getClient()
      await requireAuthUserId(c)
      const { data, error } = await c
        .from('organizations')
        .select(ORG_COLUMNS)
        .eq('slug', slug)
        .maybeSingle()
      if (error) throw new ErpDataError(error.message)
      if (!data) return null
      return mapOrganizationRow(data as OrganizationSqlRow)
    },

    async listForUser(userId: ErpUserId): Promise<Organization[]> {
      const c = getClient()
      await requireMatchingAuthUser(c, userId)
      const memRes = await c
        .from('organization_members')
        .select(MEM_COLUMNS)
        .eq('user_id', userId)
      if (memRes.error) throw new ErpDataError(memRes.error.message)
      const memRows = (Array.isArray(memRes.data) ? memRes.data : []) as OrganizationMembershipSqlRow[]
      const orgIds = Array.from(
        new Set(
          memRows
            .map((r) => mapOrganizationMembershipRow(r))
            .filter((m) => m != null && m.status === 'active')
            .map((m) => m!.organizationId),
        ),
      )
      if (orgIds.length === 0) return []

      const orgRes = await c.from('organizations').select(ORG_COLUMNS).in('id', orgIds)
      if (orgRes.error) throw new ErpDataError(orgRes.error.message)
      const orgRows = (Array.isArray(orgRes.data) ? orgRes.data : []) as OrganizationSqlRow[]
      return orgRows
        .map((r) => mapOrganizationRow(r))
        .filter((o): o is Organization => o != null)
    },

    async findDefaultForUser(userId: ErpUserId): Promise<Organization | null> {
      const c = getClient()
      await requireMatchingAuthUser(c, userId)
      const memRes = await c
        .from('organization_members')
        .select(MEM_COLUMNS)
        .eq('user_id', userId)
      if (memRes.error) throw new ErpDataError(memRes.error.message)
      const memRows = (Array.isArray(memRes.data) ? memRes.data : []) as OrganizationMembershipSqlRow[]
      const def = memRows
        .map((r) => mapOrganizationMembershipRow(r))
        .find((m) => m != null && m.isDefault && m.status === 'active')
      if (!def) return null
      return this.findById(def.organizationId)
    },
  }
}
