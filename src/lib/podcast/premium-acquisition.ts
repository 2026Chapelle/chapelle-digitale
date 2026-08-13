/**
 * PODCAST-5C — Pont d'ACQUISITION Premium. Primitives serveur UNIQUES d'octroi et de
 * révocation d'un entitlement, réutilisées par le webhook Chariow (achat → droit) et
 * par l'admin (octroi/révocation manuels). Le client ne décide JAMAIS.
 *
 * Source de vérité inchangée : public.user_entitlements (PODCAST-5B). Ce module N'AJOUTE
 * qu'un chemin d'ÉCRITURE légitime (service_role) ; la LECTURE/décision d'accès reste la
 * primitive SQL has_podcast_premium_access (PODCAST-SEC). Aucune source concurrente.
 *
 * Idempotence garantie AU NIVEAU BASE (défense en profondeur) :
 *   • uniq_entitlement_purchase_source (entitlement_key, source_id) où source_type='purchase'
 *     → un achat rejoué (même product_purchases.id) ne crée qu'UN droit.
 *   • uniq_user_entitlement_lifetime (user_id, entitlement_key) où actif à vie
 *     → pas de doublon de droit à vie actif.
 * Ces fonctions traitent le conflit 23505 comme un NO-OP idempotent (jamais une erreur).
 */
import { isEntitlementActive, type EntitlementRow, PODCAST_PREMIUM_ENTITLEMENT_KEY } from './entitlement'

export { PODCAST_PREMIUM_ENTITLEMENT_KEY }

/** Client minimal (supabase service_role) exposant `from(table)`. Typé large :
 *  les builders supabase-js sont des thenables chaînables ; les tests les simulent. */
export interface WriteClient {
  from: (table: string) => any
}

// ── Règles PURES (testables sans base) ──────────────────────────────────────

export interface GrantingProduct {
  entitlement_key?: string | null
  entitlement_duration_days?: number | null
}

/**
 * Clé d'entitlement accordée par l'ACHAT de ce produit, ou null si le produit
 * n'accorde aucun droit. Un produit « ordinaire » (entitlement_key absent/vide)
 * ne déverrouille JAMAIS le Premium — seul un mapping explicite le fait.
 */
export function entitlementKeyForProduct(product: GrantingProduct | null | undefined): string | null {
  const k = product?.entitlement_key
  return typeof k === 'string' && k.trim() !== '' ? k.trim() : null
}

/**
 * Calcule `expires_at` (ISO) depuis une durée produit en jours.
 * NULL / non finie / <= 0 ⇒ null = À VIE. Ne FABRIQUE jamais une durée : sans durée
 * produit, le droit est à vie (décision métier portée par le produit, pas ici).
 */
export function computeExpiresAt(durationDays: number | null | undefined, nowMs: number = Date.now()): string | null {
  if (durationDays == null) return null
  const d = Number(durationDays)
  if (!Number.isFinite(d) || d <= 0) return null
  return new Date(nowMs + d * 86_400_000).toISOString()
}

// ── Octroi issu d'un ACHAT confirmé (webhook) ───────────────────────────────

export interface GrantPurchaseInput {
  userId: string
  entitlementKey: string
  /** product_purchases.id — trace d'acquisition et clé d'idempotence. */
  sourceId: string
  /** Durée produit (jours). NULL/absent ⇒ à vie. */
  durationDays?: number | null
  nowMs?: number
}

export interface GrantResult {
  granted: boolean
  /** true si le droit existait déjà (rejeu/achat multiple) — succès idempotent, pas une erreur. */
  idempotent: boolean
  error?: string
}

/**
 * Octroi idempotent d'un droit issu d'un ACHAT VALIDE (event=successful.sale + completed,
 * déjà vérifié par le webhook). N'est appelé qu'après création du product_purchase.
 * Un paiement pending/failed/cancelled n'atteint jamais ce chemin.
 */
export async function grantEntitlementFromPurchase(client: WriteClient, input: GrantPurchaseInput): Promise<GrantResult> {
  const { userId, entitlementKey, sourceId } = input
  if (!userId || !entitlementKey || !sourceId) return { granted: false, idempotent: false, error: 'invalid_input' }
  const nowMs = input.nowMs ?? Date.now()
  const expires_at = computeExpiresAt(input.durationDays ?? null, nowMs)
  try {
    const { error } = await client.from('user_entitlements').insert({
      user_id: userId,
      entitlement_key: entitlementKey,
      source_type: 'purchase',
      source_id: sourceId,
      starts_at: new Date(nowMs).toISOString(),
      expires_at,
    })
    if (error) {
      if (error.code === '23505') return { granted: false, idempotent: true } // droit déjà présent
      return { granted: false, idempotent: false, error: error.message || 'insert_error' }
    }
    return { granted: true, idempotent: false }
  } catch (e: any) {
    return { granted: false, idempotent: false, error: e?.message || 'exception' }
  }
}

/**
 * Révocation d'un droit rattaché à un ACHAT (remboursement / annulation / chargeback).
 * NE SUPPRIME PAS la ligne (audit) : pose `revoked_at`. Primitive PRÊTE et testable ;
 * elle N'EST PAS câblée sur un webhook Chariow (aucun contrat d'événement de
 * remboursement prouvé dans le repo — voir migration). Utilisable dès qu'un signal
 * fiable existe, ou depuis l'admin.
 */
export async function revokeEntitlementForSource(
  client: WriteClient,
  input: { entitlementKey: string; sourceId: string; nowMs?: number },
): Promise<{ revoked: boolean; error?: string }> {
  const { entitlementKey, sourceId } = input
  if (!entitlementKey || !sourceId) return { revoked: false, error: 'invalid_input' }
  const nowIso = new Date(input.nowMs ?? Date.now()).toISOString()
  try {
    const { error } = await client
      .from('user_entitlements')
      .update({ revoked_at: nowIso })
      .eq('entitlement_key', entitlementKey)
      .eq('source_type', 'purchase')
      .eq('source_id', sourceId)
      .is('revoked_at', null)
    if (error) return { revoked: false, error: error.message || 'update_error' }
    return { revoked: true }
  } catch (e: any) {
    return { revoked: false, error: e?.message || 'exception' }
  }
}

// ── Octroi / révocation ADMIN (source_type='admin') ─────────────────────────

export interface AdminGrantInput {
  userId: string
  entitlementKey: string
  /** Expiration explicite (ISO) ou null = à vie. Décidée par l'admin. */
  expiresAt?: string | null
  note?: string | null
  /** Admin ayant octroyé (audit) si connu — le cookie admin est partagé, souvent null. */
  createdBy?: string | null
  nowMs?: number
}

/** Octroi manuel Admin. Idempotent : si le membre a déjà un droit à vie actif → no-op. */
export async function grantEntitlementByAdmin(client: WriteClient, input: AdminGrantInput): Promise<GrantResult> {
  const { userId, entitlementKey } = input
  if (!userId || !entitlementKey) return { granted: false, idempotent: false, error: 'invalid_input' }
  const nowMs = input.nowMs ?? Date.now()
  const expires_at = typeof input.expiresAt === 'string' && input.expiresAt.trim() !== '' ? input.expiresAt : null
  try {
    const { error } = await client.from('user_entitlements').insert({
      user_id: userId,
      entitlement_key: entitlementKey,
      source_type: 'admin',
      starts_at: new Date(nowMs).toISOString(),
      expires_at,
      note: input.note ?? null,
      created_by: input.createdBy ?? null,
    })
    if (error) {
      if (error.code === '23505') return { granted: false, idempotent: true } // déjà un droit à vie actif
      return { granted: false, idempotent: false, error: error.message || 'insert_error' }
    }
    return { granted: true, idempotent: false }
  } catch (e: any) {
    return { granted: false, idempotent: false, error: e?.message || 'exception' }
  }
}

/** Révocation Admin : pose `revoked_at` sur TOUS les droits actifs (non révoqués) du membre pour la clé. */
export async function revokeEntitlementForUser(
  client: WriteClient,
  input: { userId: string; entitlementKey: string; nowMs?: number },
): Promise<{ revoked: boolean; error?: string }> {
  const { userId, entitlementKey } = input
  if (!userId || !entitlementKey) return { revoked: false, error: 'invalid_input' }
  const nowIso = new Date(input.nowMs ?? Date.now()).toISOString()
  try {
    const { error } = await client
      .from('user_entitlements')
      .update({ revoked_at: nowIso })
      .eq('user_id', userId)
      .eq('entitlement_key', entitlementKey)
      .is('revoked_at', null)
    if (error) return { revoked: false, error: error.message || 'update_error' }
    return { revoked: true }
  } catch (e: any) {
    return { revoked: false, error: e?.message || 'exception' }
  }
}

// ── Statut (admin : voir l'état Premium d'un membre) ────────────────────────

export interface EntitlementStatusRow extends EntitlementRow {
  source_type?: string | null
  source_id?: string | null
  note?: string | null
  created_at?: string | null
}

export interface EntitlementStatus {
  active: boolean
  rows: EntitlementStatusRow[]
}

/**
 * État Premium d'un membre pour l'admin : `active` (règle pure PODCAST-5B, miroir SQL)
 * + l'historique des droits (source, expiration, révocation) pour affichage/audit.
 */
export async function getEntitlementStatus(
  client: WriteClient,
  userId: string,
  entitlementKey: string,
  nowMs: number = Date.now(),
): Promise<EntitlementStatus> {
  if (!userId || !entitlementKey) return { active: false, rows: [] }
  try {
    const { data, error } = await client
      .from('user_entitlements')
      .select('starts_at, expires_at, revoked_at, source_type, source_id, note, created_at')
      .eq('user_id', userId)
      .eq('entitlement_key', entitlementKey)
      .order('created_at', { ascending: false })
    if (error || !Array.isArray(data)) return { active: false, rows: [] }
    const rows = data as EntitlementStatusRow[]
    const active = rows.some((r) => isEntitlementActive(r, nowMs))
    return { active, rows }
  } catch {
    return { active: false, rows: [] }
  }
}
