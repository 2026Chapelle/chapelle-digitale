/**
 * Passkeys / WebAuthn — ADMIN, phase 1 (comptes Supabase nominatifs uniquement).
 * Constantes de configuration centralisées et valeurs de sécurité.
 *
 * Rappel sécurité : Citadelle ne collecte, ne transmet et ne stocke JAMAIS de
 * données biométriques. L'empreinte/visage/PIN reste gérée localement par
 * l'appareil ; on ne conserve que les données cryptographiques WebAuthn.
 */
export type Ceremony = 'registration' | 'authentication'

/** Durée de vie maximale d'un challenge (exigence : ≤ 2 minutes). */
export const CHALLENGE_TTL_MS = 2 * 60 * 1000

/**
 * Fenêtre de « réauthentification récente » vérifiable côté serveur : un
 * enrôlement/révocation exige une connexion explicite par mot de passe datant
 * de moins de 5 minutes (lue via GoTrue `last_sign_in_at`, jamais du client).
 */
export const REAUTH_MAX_AGE_MS = 5 * 60 * 1000
