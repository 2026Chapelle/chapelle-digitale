/**
 * Lot 2-A — résolution du scope tenant pour newcomer_intakes (serveur).
 *
 * Règles :
 *  - organization_id ne vient JAMAIS du client (body / query / header).
 *  - Insert public → organisation canonique (CHAPELLE_ORGANIZATION_SLUG).
 *  - Admin legacy cier_admin → même organisation canonique (fallback TEMPORAIRE).
 *  - Incompatible avec une deuxième organisation réelle tant que ce fallback existe.
 *
 * supabaseAdmin reste hors src/core/erp/** ; ce module vit sous src/lib/**.
 */

import { CHAPELLE_ORGANIZATION_SLUG, type OrganizationId } from '@/core/erp'
import { requireOrganizationId, type ScopedOrganizationId } from './newcomer-organization-id'

/** Surface minimale PostgREST pour résoudre l'org canonique (injectable en tests). */
export type OrgLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        limit: (n: number) => PromiseLike<{
          data: Array<{ id: string }> | null
          error: { message: string } | null
        }>
      }
    }
  }
}

export class NewcomerTenantScopeError extends Error {
  readonly code = 'newcomer_tenant_scope_error' as const
  constructor(message: string) {
    super(message)
    this.name = 'NewcomerTenantScopeError'
  }
}

/**
 * Résout l'id de l'organisation canonique chapelle-du-royaume.
 * Échoue si absente ou dupliquée (même garde que la migration Lot 2-A).
 */
export async function resolveCanonicalOrganizationId(
  client: OrgLookupClient,
): Promise<ScopedOrganizationId> {
  const { data, error } = await client
    .from('organizations')
    .select('id')
    .eq('slug', CHAPELLE_ORGANIZATION_SLUG)
    .limit(2)

  if (error) {
    throw new NewcomerTenantScopeError(error.message)
  }

  const rows = Array.isArray(data) ? data : []
  if (rows.length === 0) {
    throw new NewcomerTenantScopeError(
      `Organisation canonique slug=${CHAPELLE_ORGANIZATION_SLUG} absente.`,
    )
  }
  if (rows.length > 1) {
    throw new NewcomerTenantScopeError(
      `Organisation canonique slug=${CHAPELLE_ORGANIZATION_SLUG} dupliquée.`,
    )
  }

  return requireOrganizationId(rows[0]?.id)
}

/**
 * Scope admin pour routes newcomer protégées par isAdminRequest (cookie cier_admin).
 *
 * FALLBACK TEMPORAIRE Lot 2-A :
 *   cier_admin conserve l'accès, mais UNIQUEMENT sur l'organisation canonique.
 *   Ne pas introduire de deuxième organisation tant que ce fallback existe.
 *   La session Supabase n'est pas obligatoire (login legacy code → cookie).
 */
export async function resolveNewcomerAdminOrganizationId(
  client: OrgLookupClient,
  opts: { adminCookieOk: boolean },
): Promise<ScopedOrganizationId> {
  if (!opts.adminCookieOk) {
    throw new NewcomerTenantScopeError('Non autorisé.')
  }
  return resolveCanonicalOrganizationId(client)
}

/** Alias documenté pour l'insert public (mono-tenant transition). */
export async function resolvePublicNewcomerOrganizationId(
  client: OrgLookupClient,
): Promise<ScopedOrganizationId> {
  return resolveCanonicalOrganizationId(client)
}

export type { OrganizationId }
