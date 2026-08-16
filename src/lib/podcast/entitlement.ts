/**
 * PODCAST-5B — Droit Premium podcast (entitlement). Primitive UNIQUE réutilisée
 * par PODCAST-SEC et l'ingestion analytics. Le client ne décide JAMAIS.
 *
 * Source de vérité = table `user_entitlements` (clé canonique 'podcast_premium').
 * Premium = droit SPÉCIFIQUE : jamais dérivé d'un rôle/statut/membre actif.
 * Actif = non révoqué ET démarré ET non expiré (évalué au moment de la lecture).
 * Fail-closed : toute erreur de résolution ⇒ accès refusé.
 */

/** Clé d'entitlement canonique du Premium podcast (aucun UUID produit en dur). */
export const PODCAST_PREMIUM_ENTITLEMENT_KEY = 'podcast_premium'

export interface EntitlementRow {
  starts_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

/**
 * Règle d'activité PURE (miroir exact de la fonction SQL has_entitlement).
 * Testable en isolation. `now` en ms (défaut : maintenant).
 */
export function isEntitlementActive(row: EntitlementRow | null | undefined, now: number = Date.now()): boolean {
  if (!row) return false
  if (row.revoked_at) return false                      // révoqué
  // starts_at requis et valide, sinon fail-closed (on ne confirme pas le démarrage).
  const starts = row.starts_at ? Date.parse(row.starts_at) : NaN
  if (!Number.isFinite(starts) || starts > now) return false  // absent/invalide ou futur → refusé
  if (row.expires_at != null) {
    const exp = Date.parse(row.expires_at)
    if (!Number.isFinite(exp) || exp <= now) return false     // expiré OU date illisible → fail-closed
  }
  return true
}

/** Client minimal (supabase) exposant rpc(). PromiseLike : compatible avec le
 *  builder thenable de supabase-js comme avec une Promise de test. */
interface RpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>
}

/**
 * Le membre possède-t-il le droit Premium podcast ACTIF ?
 * Délègue à la primitive SQL canonique `has_podcast_premium_access` (source unique).
 * FAIL-CLOSED : userId absent, erreur RPC, ou réponse non booléenne ⇒ false.
 */
export async function hasPodcastPremiumAccess(client: RpcClient, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  try {
    const { data, error } = await client.rpc('has_podcast_premium_access', { p_user: userId })
    if (error) return false                 // ENTITLEMENT_LOOKUP_ERROR → DENY
    return data === true
  } catch {
    return false                            // fail-closed
  }
}
