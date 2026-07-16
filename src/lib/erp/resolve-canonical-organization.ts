/**
 * ERP — résolution neutre de l’organisation canonique (chapelle-du-royaume).
 *
 * Utilisé par :
 * - flux admin legacy (cookie cier_admin) pour scoping profils (Lot 2-B)
 * - flux newcomer (via re-export pour compat)
 *
 * Règles :
 * - organization_id ne vient JAMAIS du client.
 * - Résolution strictement serveur.
 * - Échec fermé si absente ou dupliquée (cohérent avec Lot 1 / Lot 2-A).
 * - Aucune dépendance vers lib/pastoral.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { CHAPELLE_ORGANIZATION_SLUG, type OrganizationId } from '@/core/erp'

/** Type minimal injectable pour lookup (tests + production). */
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

export class CanonicalOrganizationError extends Error {
  readonly code = 'canonical_organization_error' as const
  constructor(message: string) {
    super(message)
    this.name = 'CanonicalOrganizationError'
  }
}

/**
 * Résout l'ID de l'organisation canonique.
 * Utilise le client injecté (ou supabaseAdmin par défaut).
 */
export async function resolveCanonicalOrganizationId(
  client: OrgLookupClient = {
    from: (table) => supabaseAdmin.from(table) as any,
  },
): Promise<OrganizationId> {
  const { data, error } = await client
    .from('organizations')
    .select('id')
    .eq('slug', CHAPELLE_ORGANIZATION_SLUG)
    .limit(2)

  if (error) {
    throw new CanonicalOrganizationError(error.message)
  }

  const rows = Array.isArray(data) ? data : []
  if (rows.length === 0) {
    throw new CanonicalOrganizationError(
      `Organisation canonique slug=${CHAPELLE_ORGANIZATION_SLUG} absente.`,
    )
  }
  if (rows.length > 1) {
    throw new CanonicalOrganizationError(
      `Organisation canonique slug=${CHAPELLE_ORGANIZATION_SLUG} dupliquée.`,
    )
  }

  const id = rows[0]?.id
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new CanonicalOrganizationError('organizationId requis et non vide.')
  }
  return id as OrganizationId
}

/**
 * Résolveur pour les flux admin legacy (isAdminRequest / cier_admin).
 * N'accepte que les requêtes avec cookie admin valide.
 */
export async function resolveAdminOrganizationId(
  opts: { adminCookieOk: boolean },
  client?: OrgLookupClient,
): Promise<OrganizationId> {
  if (!opts.adminCookieOk) {
    throw new CanonicalOrganizationError('Non autorisé.')
  }
  return resolveCanonicalOrganizationId(client)
}

export type { OrganizationId }