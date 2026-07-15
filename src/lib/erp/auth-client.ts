/**
 * ERP Lot 1 — helpers d'identité pour repositories authentifiés.
 * Aucune clé service role.
 */

export type ErpAuthUser = { id: string }

export type ErpAuthGetUserResult = {
  data: { user: ErpAuthUser | null }
  error: { message: string } | null
}

/**
 * Surface minimale d'un client Supabase session (auth + from).
 * Compatible createRouteClient() et doubles de tests.
 */
export type ErpSessionClient = {
  auth: {
    getUser: () => Promise<ErpAuthGetUserResult>
  }
  from: (table: string) => ErpFromBuilder
}

/** Chaîne de lecture PostgREST simplifiée (eq / in / maybeSingle / thenable). */
export type ErpFromBuilder = {
  select: (columns: string) => ErpFilterBuilder
}

export type ErpFilterBuilder = {
  eq: (column: string, value: string) => ErpFilterBuilder
  in: (column: string, values: string[]) => ErpFilterBuilder
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  then: Promise<{ data: unknown; error: { message: string } | null }>['then']
}

export class ErpAuthError extends Error {
  readonly code = 'erp_auth_error' as const
  constructor(message: string) {
    super(message)
    this.name = 'ErpAuthError'
  }
}

export class ErpDataError extends Error {
  readonly code = 'erp_data_error' as const
  constructor(message: string) {
    super(message)
    this.name = 'ErpDataError'
  }
}

export async function requireMatchingAuthUser(
  client: ErpSessionClient,
  userId: string,
): Promise<string> {
  const { data, error } = await client.auth.getUser()
  if (error || !data.user?.id) {
    throw new ErpAuthError(error?.message || 'Utilisateur non authentifié')
  }
  if (data.user.id !== userId) {
    throw new ErpAuthError('userId ne correspond pas à la session authentifiée')
  }
  return data.user.id
}

export async function requireAuthUserId(client: ErpSessionClient): Promise<string> {
  const { data, error } = await client.auth.getUser()
  if (error || !data.user?.id) {
    throw new ErpAuthError(error?.message || 'Utilisateur non authentifié')
  }
  return data.user.id
}
