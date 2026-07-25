/**
 * Citadelle — Lot Offline 1.2 : GARDE-FOU du harnais Playwright non-production.
 *
 * Objectif UNIQUE : rendre le mode E2E offline (`OFFLINE_E2E_MODE=true`)
 * IMPOSSIBLE à activer contre la production, et prouver ce refus par test.
 *
 * ⚠️ Ce module est volontairement AUTONOME (aucun import `@/…`) afin d'être
 * importé à l'identique par Vitest (alias `@`) ET par Playwright (chemin relatif),
 * sans transformation de résolution de modules.
 *
 * Il n'introduit AUCUN contournement dans le code normal :
 *  - `isOfflineE2EServer()` ne renvoie true que si le flag serveur est armé ET
 *    qu'aucun signal de production n'est présent (sinon il LÈVE une erreur).
 *  - Le flag n'est jamais posé dans les fichiers `.env` de production : seul
 *    `.env.offline-e2e` (valeurs factices) l'active, chargé explicitement par le
 *    lanceur de test. En production, `OFFLINE_E2E_MODE` est absent → false.
 */

/** Env minimal lisible (compatible `process.env` et objets de test). */
export type EnvLike = Record<string, string | undefined>

/**
 * Signaux de PRODUCTION interdits dans toute variable d'URL/clé surveillée.
 * On blocklist par référence de projet + domaine + FORMAT de clé réelle
 * (`sb_secret_` / `sb_publishable_`) — JAMAIS la valeur secrète elle-même, pour
 * ne pas committer de secret. On refuse aussi tout « prod »/« production ».
 */
export const PRODUCTION_SIGNALS: readonly string[] = [
  'nvyuyffywnuollaxguen', // référence du projet Supabase RÉEL (.env.local)
  'chapelleduroyaume.org', // couvre citadelle.chapelleduroyaume.org
  'sb_secret_', // format d'une clé service_role RÉELLE
  'sb_publishable_', // format d'une clé anon/publishable RÉELLE
  'production',
  'prod-', // ex. prod-xyz.supabase.co
]

/**
 * Variables surveillées : toute valeur de production ici est rédhibitoire.
 * NB : `NODE_ENV` est volontairement EXCLU (il vaut légitimement `production`
 * pour que le service worker s'enregistre).
 */
export const MONITORED_ENV_KEYS: readonly string[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_APP_URL',
]

/** Hôtes locaux autorisés pour l'URL du site en mode E2E. */
const LOCAL_HOST_RE = /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?(\/|$)/i

/** Renvoie le premier signal de production trouvé dans `value`, sinon null. */
export function findProductionSignal(value: string | undefined | null): string | null {
  if (!value) return null
  const v = String(value).toLowerCase()
  for (const sig of PRODUCTION_SIGNALS) {
    if (v.includes(sig.toLowerCase())) return sig
  }
  return null
}

/** Vrai si l'URL pointe explicitement vers un hôte local (loopback). */
export function isLocalUrl(url: string | undefined | null): boolean {
  return !!url && LOCAL_HOST_RE.test(String(url))
}

/**
 * GARDE-FOU BLOQUANT. Si le mode E2E est armé, refuse tout signal de production.
 * Ne fait rien si le flag n'est pas armé (comportement de production inchangé).
 *
 * @throws Error si une variable surveillée contient un signal de production, ou
 *   si l'URL du site n'est pas locale.
 */
export function assertOfflineE2ESafe(env: EnvLike): void {
  if (env.OFFLINE_E2E_MODE !== 'true') return

  for (const key of MONITORED_ENV_KEYS) {
    const sig = findProductionSignal(env[key])
    if (sig) {
      throw new Error(
        `[offline-e2e] REFUS : signal de production « ${sig} » détecté dans ${key}. ` +
          `Le harnais E2E ne doit JAMAIS s'exécuter contre la production.`,
      )
    }
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL
  if (!isLocalUrl(siteUrl)) {
    throw new Error(
      `[offline-e2e] REFUS : NEXT_PUBLIC_SITE_URL (« ${siteUrl ?? 'absent'} ») doit être une URL locale ` +
        `(127.0.0.1 / localhost) en mode E2E.`,
    )
  }
}

/**
 * Le mode E2E offline est-il actif CÔTÉ SERVEUR ? Lève si un signal de
 * production est présent (fail-fast), renvoie false si le flag est absent.
 */
export function isOfflineE2EServer(env: EnvLike = process.env as EnvLike): boolean {
  assertOfflineE2ESafe(env)
  return env.OFFLINE_E2E_MODE === 'true'
}

/**
 * Le mode E2E offline est-il actif CÔTÉ CLIENT ? Exige le flag public ET un
 * hostname loopback. Ne lève jamais (le client ne peut pas casser la prod) :
 * en production le flag est absent → false, et le hostname n'est pas loopback.
 */
export function isOfflineE2EClient(): boolean {
  if (process.env.NEXT_PUBLIC_OFFLINE_E2E_MODE !== 'true') return false
  if (typeof window === 'undefined' || typeof location === 'undefined') return false
  const h = location.hostname
  return h === '127.0.0.1' || h === 'localhost' || h === '0.0.0.0'
}
