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

/**
 * Re-exports neutres depuis src/lib/erp (résolution canonique partagée).
 * Lot 2-B : les flux admin profils partagent la logique sans dépendance inverse vers pastoral.
 * Aucune modification fonctionnelle pour newcomer.
 */
import {
  resolveCanonicalOrganizationId as _resolveCanonical,
  resolveAdminOrganizationId as _resolveAdmin,
  type OrgLookupClient,
  CanonicalOrganizationError,
} from '@/lib/erp/resolve-canonical-organization'
import { requireOrganizationId, type ScopedOrganizationId } from './newcomer-organization-id'
import type { OrganizationId } from '@/core/erp'

export type { OrgLookupClient }
export { CanonicalOrganizationError as NewcomerTenantScopeError }

/**
 * Wrappers de compat (délèguent au helper neutre ERP).
 * Aucune logique dupliquée, aucun changement de comportement pour les callers newcomer.
 */
export async function resolveCanonicalOrganizationId(
  client: OrgLookupClient,
): Promise<ScopedOrganizationId> {
  const id = await _resolveCanonical(client)
  return requireOrganizationId(id)
}

export async function resolveNewcomerAdminOrganizationId(
  client: OrgLookupClient,
  opts: { adminCookieOk: boolean },
): Promise<ScopedOrganizationId> {
  if (!opts.adminCookieOk) {
    throw new CanonicalOrganizationError('Non autorisé.')
  }
  const id = await _resolveAdmin({ adminCookieOk: opts.adminCookieOk }, client)
  return requireOrganizationId(id)
}

export async function resolvePublicNewcomerOrganizationId(
  client: OrgLookupClient,
): Promise<ScopedOrganizationId> {
  const id = await _resolveCanonical(client)
  return requireOrganizationId(id)
}

export type { OrganizationId }
