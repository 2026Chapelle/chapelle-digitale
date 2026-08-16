/**
 * PODCAST-6 — État Premium DU MEMBRE (côté client), pour l'UX uniquement.
 *
 * Source : la RLS PODCAST-5B autorise `authenticated` à lire SES propres lignes
 * `user_entitlements` (policy select-own). On ne lit donc QUE ses droits ; jamais
 * une décision d'accès (le vrai gate reste serveur : /api/podcast/[id]/play). Cet
 * état sert à afficher un badge « Premium actif » et à choisir la bonne copie de
 * refus (jamais eu / expiré-révoqué). Il ne DÉVERROUILLE rien.
 *
 * La règle d'activité réutilise `isEntitlementActive` (miroir exact du SQL) — 5B.
 */
import { isEntitlementActive, PODCAST_PREMIUM_ENTITLEMENT_KEY, type EntitlementRow } from './entitlement'

export interface MyPremiumStatus {
  /** Un droit Premium est actif MAINTENANT (règle 5B). */
  active: boolean
  /** Le membre a DÉJÀ possédé un droit (au moins une ligne) — pour la copie « n'est plus actif ». */
  hadAny: boolean
  /** Expiration du droit actif le plus lointain (ISO), si borné ; null = à vie / aucun. */
  activeExpiresAt: string | null
}

const EMPTY: MyPremiumStatus = { active: false, hadAny: false, activeExpiresAt: null }

/**
 * Calcule l'état Premium à partir des lignes d'entitlement du membre (règle PURE, testable).
 * `active` = au moins une ligne active ; `hadAny` = au moins une ligne (même expirée/révoquée).
 */
export function computeMyPremiumStatus(rows: EntitlementRow[] | null | undefined, now: number = Date.now()): MyPremiumStatus {
  if (!Array.isArray(rows) || rows.length === 0) return EMPTY
  const activeRows = rows.filter((r) => isEntitlementActive(r, now))
  if (activeRows.length === 0) return { active: false, hadAny: true, activeExpiresAt: null }
  // Un droit à vie (expires null) prime → aucune date affichée ; sinon la date la plus lointaine.
  const hasLifetime = activeRows.some((r) => r.expires_at == null)
  const activeExpiresAt = hasLifetime
    ? null
    : activeRows.reduce<string | null>((acc, r) => (acc == null || Date.parse(r.expires_at as string) > Date.parse(acc) ? (r.expires_at as string) : acc), null)
  return { active: true, hadAny: true, activeExpiresAt }
}

/** Client minimal supabase exposant le builder de lecture. */
export interface ReadClient {
  from: (table: string) => any
}

/**
 * Lit les droits Premium DU MEMBRE via RLS (select-own). Fail-safe : toute erreur ⇒
 * état neutre (aucun droit). Ne lit jamais les droits d'autrui (RLS l'empêche).
 */
export async function fetchMyPremiumStatus(client: ReadClient, now: number = Date.now()): Promise<MyPremiumStatus> {
  try {
    const { data, error } = await client
      .from('user_entitlements')
      .select('starts_at, expires_at, revoked_at')
      .eq('entitlement_key', PODCAST_PREMIUM_ENTITLEMENT_KEY)
    if (error || !Array.isArray(data)) return EMPTY
    return computeMyPremiumStatus(data as EntitlementRow[], now)
  } catch {
    return EMPTY
  }
}
