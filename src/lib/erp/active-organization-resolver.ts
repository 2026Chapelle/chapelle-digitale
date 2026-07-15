/**
 * ERP Lot 1 — ActiveOrganizationResolver branché sur repositories authentifiés.
 * Délègue la logique pure au Core. Aucun supabaseAdmin.
 */

import 'server-only'

import {
  createActiveOrganizationResolver as createPureResolver,
  type OrganizationMembershipRepository,
  type OrganizationRepository,
  type ActiveOrganizationResolver,
} from '@/core/erp'

export function createSessionActiveOrganizationResolver(
  organizations: OrganizationRepository,
  memberships: OrganizationMembershipRepository,
  options?: { nowIso?: () => string },
): ActiveOrganizationResolver {
  return createPureResolver(
    {
      async loadForUser(userId) {
        const [mems, orgs] = await Promise.all([
          memberships.listByUser(userId),
          organizations.listForUser(userId),
        ])
        return { memberships: mems, organizations: orgs }
      },
    },
    options,
  )
}
