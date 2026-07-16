/**
 * Lot 2-A — accès tenant-scoped à public.newcomer_intakes (service role).
 *
 * Chaque méthode exige organizationId (requireOrganizationId).
 * Aucune listAll / updateById globale.
 * organization_id entrant du client est ignoré / stripé ; seule l'injection serveur compte.
 *
 * Hors src/core/erp/** (supabaseAdmin / client admin injecté).
 */

import {
  requireOrganizationId,
  stripClientOrganizationId,
  type ScopedOrganizationId,
} from './newcomer-organization-id'

export type NewcomerDbError = { message: string } | null

/** Chaîne PostgREST minimale (supabase-js) pour tests injectables. */
export type NewcomerDbClient = {
  from: (table: string) => {
    select: (columns: string) => NewcomerQueryBuilder
    insert: (row: Record<string, unknown>) => NewcomerMutationBuilder
    update: (patch: Record<string, unknown>) => NewcomerQueryBuilder
  }
}

export type NewcomerQueryBuilder = {
  eq: (column: string, value: string) => NewcomerQueryBuilder
  in: (column: string, values: string[]) => NewcomerQueryBuilder
  order: (column: string, opts?: { ascending?: boolean }) => NewcomerQueryBuilder
  limit: (n: number) => NewcomerQueryBuilder
  select: (columns: string) => NewcomerQueryBuilder
  single: () => PromiseLike<{ data: unknown; error: NewcomerDbError }>
  maybeSingle: () => PromiseLike<{ data: unknown; error: NewcomerDbError }>
  then: Promise<{ data: unknown; error: NewcomerDbError }>['then']
}

export type NewcomerMutationBuilder = {
  select: (columns: string) => {
    single: () => PromiseLike<{ data: unknown; error: NewcomerDbError }>
  }
}

export class NewcomerRepositoryError extends Error {
  readonly code = 'newcomer_repository_error' as const
  constructor(message: string) {
    super(message)
    this.name = 'NewcomerRepositoryError'
  }
}

export type NewcomerIntakeInsertInput = {
  prenom: string
  nom: string | null
  telephone: string
  email: string | null
  source: string
  message: string | null
  consent: boolean
  consented_at: string
  intake_payload: Record<string, unknown>
}

export type ListNewcomerIntakesOpts = {
  columns: string
  status?: string
  limit?: number
}

export function createNewcomerIntakesRepository(client: NewcomerDbClient) {
  return {
    /**
     * INSERT public / serveur : organization_id injecté ; clés client stripées.
     */
    async insertForOrganization(
      organizationId: unknown,
      row: NewcomerIntakeInsertInput & Record<string, unknown>,
    ): Promise<{ id: string }> {
      const orgId = requireOrganizationId(organizationId)
      const safe = stripClientOrganizationId(row as Record<string, unknown>)
      const { data, error } = await client
        .from('newcomer_intakes')
        .insert({ ...safe, organization_id: orgId })
        .select('id')
        .single()
      if (error || !data || typeof (data as { id?: unknown }).id !== 'string') {
        throw new NewcomerRepositoryError(error?.message || 'Insertion impossible.')
      }
      return { id: (data as { id: string }).id }
    },

    /**
     * Liste bornée : eq organization_id (+ status optionnel).
     */
    async listForOrganization(
      organizationId: unknown,
      opts: ListNewcomerIntakesOpts,
    ): Promise<Record<string, unknown>[]> {
      const orgId = requireOrganizationId(organizationId)
      let q = client
        .from('newcomer_intakes')
        .select(opts.columns)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(opts.limit ?? 500)

      if (opts.status) {
        q = q.eq('status', opts.status)
      }

      const { data, error } = await q
      if (error) throw new NewcomerRepositoryError(error.message)
      return (Array.isArray(data) ? data : []) as Record<string, unknown>[]
    },

    /**
     * Enrichissement journey (colonnes additives) : borné org + ids.
     */
    async listJourneyFieldsForOrganization(
      organizationId: unknown,
      ids: string[],
      columns: string,
    ): Promise<Record<string, unknown>[]> {
      const orgId = requireOrganizationId(organizationId)
      if (!ids.length) return []
      const { data, error } = await client
        .from('newcomer_intakes')
        .select(columns)
        .eq('organization_id', orgId)
        .in('id', ids)
      if (error) throw new NewcomerRepositoryError(error.message)
      return (Array.isArray(data) ? data : []) as Record<string, unknown>[]
    },

    /**
     * Lecture metadata pour PATCH : eq organization_id + id.
     * null = absent dans CE tenant (ne pas distinguer cross-tenant).
     */
    async getMetadataForOrganization(
      organizationId: unknown,
      id: string,
    ): Promise<{ metadata: unknown } | null> {
      const orgId = requireOrganizationId(organizationId)
      const { data, error } = await client
        .from('newcomer_intakes')
        .select('metadata')
        .eq('organization_id', orgId)
        .eq('id', id)
        .maybeSingle()
      if (error) throw new NewcomerRepositoryError(error.message)
      if (!data) return null
      return data as { metadata: unknown }
    },

    /**
     * UPDATE borné organization_id + id. Patch ne peut pas changer organization_id.
     * null = aucune ligne mise à jour dans ce tenant.
     */
    async updateForOrganization(
      organizationId: unknown,
      id: string,
      patch: Record<string, unknown>,
      returningColumns: string,
    ): Promise<Record<string, unknown> | null> {
      const orgId = requireOrganizationId(organizationId)
      const safe = stripClientOrganizationId(patch)
      // Interdire toute mutation de scope même sous autre clé
      if ('organization_id' in safe || 'organizationId' in safe) {
        throw new NewcomerRepositoryError('organization_id non modifiable.')
      }
      const { data, error } = await client
        .from('newcomer_intakes')
        .update(safe)
        .eq('organization_id', orgId)
        .eq('id', id)
        .select(returningColumns)
        .maybeSingle()
      if (error) throw new NewcomerRepositoryError(error.message)
      if (!data) return null
      return data as Record<string, unknown>
    },

    /**
     * Preuve d'appartenance tenant avant accès journey events (non versionnés).
     */
    async findIdInOrganization(
      organizationId: unknown,
      id: string,
    ): Promise<string | null> {
      const orgId = requireOrganizationId(organizationId)
      const { data, error } = await client
        .from('newcomer_intakes')
        .select('id')
        .eq('organization_id', orgId)
        .eq('id', id)
        .maybeSingle()
      if (error) throw new NewcomerRepositoryError(error.message)
      if (!data || typeof (data as { id?: unknown }).id !== 'string') return null
      return (data as { id: string }).id
    },

    /**
     * Lecture d'une ligne (champs journey) dans le tenant — pour mutations journey.
     */
    async getJourneyStateForOrganization(
      organizationId: unknown,
      id: string,
      columns: string,
    ): Promise<Record<string, unknown> | null> {
      const orgId = requireOrganizationId(organizationId)
      const { data, error } = await client
        .from('newcomer_intakes')
        .select(columns)
        .eq('organization_id', orgId)
        .eq('id', id)
        .maybeSingle()
      if (error) throw new NewcomerRepositoryError(error.message)
      if (!data) return null
      return data as Record<string, unknown>
    },

    /** Scope effectif normalisé (tests / diagnostics). */
    scopeOf(organizationId: unknown): ScopedOrganizationId {
      return requireOrganizationId(organizationId)
    },
  }
}

export type NewcomerIntakesRepository = ReturnType<typeof createNewcomerIntakesRepository>
