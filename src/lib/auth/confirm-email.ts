/**
 * Confirmation d'email — logique pure partagée entre /login et /register.
 *
 * Objectif : un seul endroit pour (1) traduire les erreurs Auth en messages FR,
 * (2) valider l'email, (3) orchestrer le renvoi du lien de confirmation, et
 * (4) garder ces comportements testables sans monter de l'UI (libs pures).
 *
 * Sécurité : aucune clé service_role, aucun secret, aucun endpoint admin.
 * Le renvoi passe par le client Supabase public (anon) fourni par l'appelant et
 * ne révèle rien de plus que ce que le flux Auth expose déjà.
 */
import { siteUrl } from '@/lib/site-url'

/** Destination canonique après confirmation (allowlistée dans /auth/callback). */
export const CONFIRM_EMAIL_REDIRECT = siteUrl('/auth/callback?next=/member/dashboard')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Valide une adresse email (même règle que les formulaires login/register). */
export function isValidAuthEmail(email: string | null | undefined): boolean {
  return EMAIL_RE.test((email || '').trim())
}

export type LoginErrorKind = 'invalid_credentials' | 'email_not_confirmed' | 'other'

export interface MappedLoginError {
  kind: LoginErrorKind
  message: string
  /** true → proposer le renvoi de l'email de confirmation. */
  needsConfirm: boolean
}

/**
 * Traduit le message d'erreur brut de signInWithPassword en message FR + drapeau
 * de renvoi. « Email not confirmed » n'apparaît plus jamais en anglais à l'écran.
 */
export function mapLoginError(rawMessage: string | null | undefined): MappedLoginError {
  const raw = (rawMessage || '').trim()
  if (/invalid login credentials/i.test(raw)) {
    return { kind: 'invalid_credentials', message: 'Email ou mot de passe incorrect', needsConfirm: false }
  }
  if (/email not confirmed/i.test(raw)) {
    return {
      kind: 'email_not_confirmed',
      message:
        "Ton adresse email n'est pas encore confirmée. Ouvre l'email que nous t'avons envoyé et clique sur « ACTIVER MON COMPTE ».",
      needsConfirm: true,
    }
  }
  return { kind: 'other', message: raw || 'Une erreur est survenue. Réessaie.', needsConfirm: false }
}

/** Normalise le message d'erreur d'un renvoi (rate-limit inclus). */
export function mapResendError(rawMessage: string | null | undefined, status?: number): string {
  const raw = (rawMessage || '').toLowerCase()
  if (status === 429 || /rate limit|too many|for security purposes|seconds/.test(raw)) {
    return "Trop de tentatives. Patiente une minute avant de renvoyer l'email."
  }
  return "Impossible d'envoyer l'email pour le moment. Réessaie dans un instant."
}

export interface ResendOutcome {
  ok: boolean
  message: string
}

/** Sous-ensemble minimal du client Supabase requis pour le renvoi (testable). */
export interface ResendCapableClient {
  auth: {
    resend: (args: {
      type: 'signup'
      email: string
      options?: { emailRedirectTo?: string }
    }) => Promise<{ error: { message: string; status?: number } | null }>
  }
}

/**
 * Renvoie l'email de confirmation « signup » pour l'adresse donnée.
 * Valide l'email en amont, retourne un message FR normalisé, ne jette jamais.
 */
export async function resendConfirmationEmail(
  client: ResendCapableClient,
  email: string,
): Promise<ResendOutcome> {
  if (!isValidAuthEmail(email)) {
    return { ok: false, message: 'Entre une adresse email valide pour recevoir le lien.' }
  }
  try {
    const { error } = await client.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: CONFIRM_EMAIL_REDIRECT },
    })
    if (error) {
      return { ok: false, message: mapResendError(error.message, error.status) }
    }
    return { ok: true, message: 'Email renvoyé ! Vérifie ta boîte mail (et tes spams). 📩' }
  } catch (e) {
    return { ok: false, message: mapResendError(e instanceof Error ? e.message : String(e)) }
  }
}

/**
 * Garde anti double-clic : sérialise une action asynchrone. Un second appel
 * pendant qu'un premier est en cours est ignoré (retourne undefined).
 * Utilisé par les boutons « Renvoyer l'email » de /login et /register.
 */
export function createPendingGuard() {
  let pending = false
  return {
    isPending: () => pending,
    run: async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (pending) return undefined
      pending = true
      try {
        return await fn()
      } finally {
        pending = false
      }
    },
  }
}
