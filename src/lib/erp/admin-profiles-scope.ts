/**
 * Lot 2-B — helper minimal de scoping tenant pour les accès administratifs aux profils.
 *
 * Utilise organization_members (status='active') comme borne d'appartenance.
 * profiles reste identité globale (aucune colonne organization_id ajoutée).
 *
 * Règles :
 * - organisation résolue côté serveur (jamais du client)
 * - seules les memberships actives comptent
 * - erreurs uniformes pour éviter les fuites d'existence cross-tenant
 * - compatible avec supabaseAdmin (flux admin legacy)
 */

import { supabaseAdmin } from '@/lib/supabase'
import {
  resolveCanonicalOrganizationId,
  type OrganizationId,
} from './resolve-canonical-organization'
import { requireOrganizationId, type ScopedOrganizationId } from '@/lib/pastoral/newcomer-organization-id'

/** Type minimal pour injection de client (tests) */
type DbClient = {
  from: (table: string) => any
}

export class AdminProfileScopeError extends Error {
  readonly code = 'admin_profile_scope_error' as const
  constructor(message: string, public readonly status: number = 404) {
    super(message)
    this.name = 'AdminProfileScopeError'
  }
}

/**
 * Récupère les user_id ayant une membership active dans l'org.
 * Ne jamais passer [] à .in() — le caller doit gérer le cas vide.
 */
export async function getActiveMemberUserIdsForOrganization(
  organizationId: unknown,
  client: DbClient = supabaseAdmin as any,
): Promise<string[]> {
  const orgId = requireOrganizationId(organizationId)

  const { data, error } = await client
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('status', 'active')

  if (error) {
    throw new AdminProfileScopeError(error.message, 500)
  }

  const ids = (data || [])
    .map((r: any) => r.user_id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)

  // déduplication par sécurité
  return Array.from(new Set(ids))
}

/**
 * Vérifie qu'un profil appartient à l'org via membership active.
 * Lance une erreur 404 uniforme (inexistant / hors tenant / inactif) pour éviter les fuites.
 */
export async function assertProfileBelongsToActiveMembership(
  organizationId: unknown,
  profileId: string,
  client: DbClient = supabaseAdmin as any,
): Promise<void> {
  const orgId = requireOrganizationId(organizationId)

  if (!profileId || typeof profileId !== 'string' || !profileId.trim()) {
    throw new AdminProfileScopeError('Membre introuvable.', 404)
  }

  const { data, error } = await client
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw new AdminProfileScopeError(error.message, 500)
  }

  if (!data) {
    // 404 uniforme : ne distingue pas "n'existe pas" de "hors tenant"
    throw new AdminProfileScopeError('Membre introuvable.', 404)
  }
}

/**
 * Résout l'org canonique pour les flux admin legacy (isAdminRequest).
 * Wrapper pratique pour les routes.
 */
export async function resolveAdminOrganizationForRequest(adminCookieOk: boolean): Promise<ScopedOrganizationId> {
  return resolveCanonicalOrganizationId() as Promise<ScopedOrganizationId>
}

/**
 * Exige qu'il existe au moins une membership active owner ou admin pour l'organisation.
 * Utilisé pour les flux admin legacy sur l'org canonique.
 */
export async function requireActiveOwnerOrAdmin(organizationId: unknown): Promise<void> {
  const orgId = requireOrganizationId(organizationId)

  const { data, error } = await (supabaseAdmin as any)
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .in('membership_role', ['owner', 'admin'])
    .eq('status', 'active')
    .limit(1)

  if (error || !data || data.length === 0) {
    throw new AdminProfileScopeError('Autorisation organisationnelle insuffisante.', 403)
  }
}