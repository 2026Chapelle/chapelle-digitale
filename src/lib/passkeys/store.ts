/**
 * Accès base de données passkeys — via `supabaseAdmin` (service role) UNIQUEMENT.
 * Tables : admin_webauthn_credentials, admin_webauthn_challenges.
 * On ne stocke que des données cryptographiques (clé PUBLIQUE COSE, credential_id,
 * signCount) et le HASH du challenge — jamais de challenge en clair ni de biométrie.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { hashChallenge } from './crypto'
import { challengeExpiresAtMs, validateChallenge } from './challenge'
import type { Ceremony } from './config'

const CREDS = 'admin_webauthn_credentials'
const CHALLENGES = 'admin_webauthn_challenges'

export interface StoredCredential {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  sign_count: number
  transports: string[] | null
  device_type: string | null
  backed_up: boolean
  friendly_name: string | null
  aaguid: string | null
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

/** Crée un challenge (hashé) et renvoie son id. TTL appliqué via challengeExpiresAtMs. */
export async function createChallenge(args: {
  userId: string | null
  ceremony: Ceremony
  challenge: string
  nowMs: number
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(CHALLENGES)
    .insert({
      user_id: args.userId,
      ceremony: args.ceremony,
      challenge_hash: hashChallenge(args.challenge),
      expires_at: new Date(challengeExpiresAtMs(args.nowMs)).toISOString(),
    })
    .select('id')
    .single()
  if (error || !data) throw new Error('challenge_insert_failed')
  return data.id as string
}

export type ConsumeResult =
  | { ok: true; challengeHash: string; userId: string | null }
  | { ok: false; reason: 'reuse' | 'wrong_ceremony' | 'wrong_user' | 'expired' | 'error' }

/**
 * Consomme un challenge de façon ATOMIQUE et à usage unique :
 * `UPDATE ... SET consumed_at=now WHERE id=? AND consumed_at IS NULL RETURNING *`.
 * Deux requêtes concurrentes : une seule obtient la ligne → l'autre = rejeu.
 */
export async function consumeChallenge(args: {
  id: string
  expectedUserId: string | null
  expectedCeremony: Ceremony
  nowMs: number
}): Promise<ConsumeResult> {
  const { data, error } = await supabaseAdmin
    .from(CHALLENGES)
    .update({ consumed_at: new Date(args.nowMs).toISOString() })
    .eq('id', args.id)
    .is('consumed_at', null)
    .select('*')
    .maybeSingle()
  if (error) return { ok: false, reason: 'error' }
  if (!data) return { ok: false, reason: 'reuse' } // déjà consommé ou inexistant

  const validity = validateChallenge({
    ceremony: data.ceremony as Ceremony,
    expectedCeremony: args.expectedCeremony,
    expiresAtMs: Date.parse(data.expires_at as string),
    consumedAt: null, // l'atomicité ci-dessus garantit l'unicité de consommation
    nowMs: args.nowMs,
  })
  if (!validity.ok) {
    return { ok: false, reason: validity.reason === 'wrong_ceremony' ? 'wrong_ceremony' : 'expired' }
  }
  if (args.expectedUserId !== null && data.user_id !== args.expectedUserId) {
    return { ok: false, reason: 'wrong_user' }
  }
  return { ok: true, challengeHash: data.challenge_hash as string, userId: (data.user_id as string) ?? null }
}

/** Purge best-effort des challenges expirés (évite la croissance de la table). */
export async function purgeExpiredChallenges(nowMs: number): Promise<void> {
  try {
    await supabaseAdmin.from(CHALLENGES).delete().lt('expires_at', new Date(nowMs).toISOString())
  } catch {
    /* best-effort */
  }
}

export async function listActiveByUser(userId: string): Promise<StoredCredential[]> {
  const { data } = await supabaseAdmin
    .from(CREDS)
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: true })
  return (data as StoredCredential[]) || []
}

export async function getByCredentialId(credentialId: string): Promise<StoredCredential | null> {
  const { data } = await supabaseAdmin.from(CREDS).select('*').eq('credential_id', credentialId).maybeSingle()
  return (data as StoredCredential) || null
}

export async function countActiveByUser(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from(CREDS)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null)
  return count ?? 0
}

export async function insertCredential(row: {
  userId: string
  credentialId: string
  publicKey: string
  signCount: number
  transports: string[] | null
  deviceType: string | null
  backedUp: boolean
  friendlyName: string
  aaguid: string | null
}): Promise<{ ok: true; id: string } | { ok: false; duplicate: boolean }> {
  const { data, error } = await supabaseAdmin
    .from(CREDS)
    .insert({
      user_id: row.userId,
      credential_id: row.credentialId,
      public_key: row.publicKey,
      sign_count: row.signCount,
      transports: row.transports,
      device_type: row.deviceType,
      backed_up: row.backedUp,
      friendly_name: row.friendlyName,
      aaguid: row.aaguid,
    })
    .select('id')
    .single()
  if (error) {
    // 23505 = violation d'unicité (credential déjà enregistré)
    const duplicate = (error as any)?.code === '23505'
    return { ok: false, duplicate }
  }
  return { ok: true, id: data!.id as string }
}

export async function updateCounter(id: string, newCount: number, nowMs: number): Promise<void> {
  await supabaseAdmin
    .from(CREDS)
    .update({ sign_count: newCount, last_used_at: new Date(nowMs).toISOString() })
    .eq('id', id)
}

/** Révocation LOGIQUE (revoked_at), jamais de DELETE. Renvoie true si une ligne a été révoquée. */
export async function revokeCredential(id: string, userId: string, nowMs: number): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from(CREDS)
    .update({ revoked_at: new Date(nowMs).toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()
  return !!data
}

export async function renameCredential(id: string, userId: string, name: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from(CREDS)
    .update({ friendly_name: name })
    .eq('id', id)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()
  return !!data
}
