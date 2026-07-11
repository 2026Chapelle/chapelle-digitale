/**
 * Contrôles PURS d'origine / RP ID + dérivation depuis l'URL de l'app.
 * Défense explicite en complément des vérifications internes de la librairie ;
 * `expectedOrigin`/`expectedRPID` passés à la librairie sont TOUJOURS dérivés
 * de la config serveur, jamais du corps de requête client.
 */

/** hostname de l'URL app → RP ID WebAuthn (jamais de scheme ni de port). */
export function deriveRpId(appUrl: string): string {
  try {
    return new URL(appUrl).hostname
  } catch {
    return 'localhost'
  }
}

/** origin (scheme + host + port) attendu pour la cérémonie. */
export function deriveOrigin(appUrl: string): string {
  try {
    return new URL(appUrl).origin
  } catch {
    return appUrl
  }
}

export function isOriginAllowed(origin: string, allowed: string | string[]): boolean {
  const list = Array.isArray(allowed) ? allowed : [allowed]
  return list.includes(origin)
}

export function isRpIdAllowed(rpId: string, expected: string): boolean {
  return rpId === expected
}
