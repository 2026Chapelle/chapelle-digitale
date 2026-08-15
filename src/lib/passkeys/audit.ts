/**
 * Journal de sécurité passkeys — table `admin_security_log`.
 *
 * Non bloquant : un échec d'écriture ne doit JAMAIS faire échouer une
 * authentification (try/catch silencieux). On ne journalise que des métadonnées
 * SÛRES. Liste NOIRE (jamais journalisée) : secrets, challenges en clair, données
 * biométriques, cookies, tokens, clés privées, `clientDataJSON`/`authenticatorData` bruts.
 * `credential_id` est un identifiant PUBLIC (non secret) → autorisé.
 */
import { supabaseAdmin } from '@/lib/supabase'

export type SecurityEvent =
  | 'passkey_enroll_start'
  | 'passkey_enroll_success'
  | 'passkey_enroll_fail'
  | 'passkey_login_success'
  | 'passkey_login_denied'
  | 'passkey_rename'
  | 'passkey_revoke'
  | 'passkey_challenge_reuse'
  | 'passkey_signcount_regression'
  | 'passkey_recovery'

export interface SecurityLogMeta {
  userId?: string | null
  credentialId?: string | null
  ip?: string | null
  userAgent?: string | null
  result?: string | null
}

export async function logSecurity(event: SecurityEvent, meta: SecurityLogMeta = {}): Promise<void> {
  try {
    await supabaseAdmin.from('admin_security_log').insert({
      event,
      user_id: meta.userId ?? null,
      credential_id: meta.credentialId ?? null,
      ip: meta.ip ?? null,
      user_agent: meta.userAgent ? String(meta.userAgent).slice(0, 400) : null,
      result: meta.result ?? null,
    })
  } catch (e) {
    // Ne jamais bloquer l'auth ; garder une trace serveur d'un échec d'écriture.
    console.error('[passkeys] échec journalisation sécurité', event, (e as any)?.message)
  }
}
