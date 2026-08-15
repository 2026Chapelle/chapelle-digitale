/**
 * Core ERP — résolution pure de l'organisation active (Lot 1).
 * Aucune infrastructure, aucun Supabase, aucun cookie.
 */

import { isActiveOrganizationMembership } from './constants'
import type { ActiveOrganizationResolver } from './contracts'
import type {
  ActiveOrganizationContext,
  ActiveOrganizationResolutionInput,
  Organization,
  OrganizationMembership,
} from './types'

export type ResolveActiveOrganizationData = {
  memberships: readonly OrganizationMembership[]
  organizations: readonly Organization[]
}

/**
 * Résout l'organisation active à partir de données déjà chargées.
 * `resolvedAt` doit être fourni (horloge injectée pour tests déterministes).
 */
export function resolveActiveOrganizationFromData(
  input: Pick<ActiveOrganizationResolutionInput, 'userId'>,
  data: ResolveActiveOrganizationData,
  resolvedAt: string,
): ActiveOrganizationContext | null {
  if (!input.userId) return null
  if (!resolvedAt || resolvedAt.trim() === '') return null

  const orgById = new Map(data.organizations.map((o) => [o.id, o]))

  const activeCandidates: Array<{ membership: OrganizationMembership; organization: Organization }> =
    []

  for (const m of data.memberships) {
    if (m.userId !== input.userId) continue
    if (!isActiveOrganizationMembership(m)) continue
    const org = orgById.get(m.organizationId)
    if (!org || org.status !== 'active') continue
    activeCandidates.push({ membership: m, organization: org })
  }

  if (activeCandidates.length === 0) return null

  // Defaults valides uniquement parmi les candidats déjà filtrés (membership+org actifs)
  const defaults = activeCandidates.filter((c) => c.membership.isDefault === true)
  if (defaults.length > 1) {
    // Incohérence : plusieurs isDefault — jamais le « premier trouvé »
    return null
  }
  if (defaults.length === 1) {
    const onlyDefault = defaults[0]
    return {
      organization: onlyDefault.organization,
      membership: onlyDefault.membership,
      source: 'default_membership',
      resolvedAt,
    }
  }

  // zéro default valide
  if (activeCandidates.length === 1) {
    const only = activeCandidates[0]
    return {
      organization: only.organization,
      membership: only.membership,
      source: 'default_membership',
      resolvedAt,
    }
  }

  // Plusieurs actives sans default → null (pas de choix arbitraire, pas de fallback monolithe)
  return null
}

export type ActiveOrganizationDataLoader = {
  loadForUser: (userId: string) => Promise<ResolveActiveOrganizationData>
}

/**
 * Implémentation ActiveOrganizationResolver pure côté I/O injecté.
 * Lot 1 : ignore cookie/slug/platform_override de l'input.
 */
export function createActiveOrganizationResolver(
  loader: ActiveOrganizationDataLoader,
  options?: { nowIso?: () => string },
): ActiveOrganizationResolver {
  const nowIso = options?.nowIso ?? (() => new Date().toISOString())
  return {
    async resolve(input: ActiveOrganizationResolutionInput) {
      if (!input.userId) return null
      const data = await loader.loadForUser(input.userId)
      return resolveActiveOrganizationFromData({ userId: input.userId }, data, nowIso())
    },
  }
}
