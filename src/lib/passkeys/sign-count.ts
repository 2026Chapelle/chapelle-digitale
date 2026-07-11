/**
 * Anti-rejeu du signCount WebAuthn (PUR).
 *
 * Une régression du compteur (nouveau ≤ stocké) signale un CLONAGE possible de
 * l'authentificateur → refus. MAIS les passkeys SYNCHRONISÉES multi-appareils
 * renvoient très souvent un compteur nul (0) en permanence : on ne doit alors
 * PAS les bloquer. Règle : `newCount === 0` n'est jamais traité comme régression.
 */
export function isSignCountRegression(storedCount: number, newCount: number): boolean {
  if (newCount === 0) return false // passkey synchronisée / sans compteur
  return newCount <= storedCount
}

/** Compteur à persister après une authentification valide (jamais décroissant). */
export function nextSignCount(storedCount: number, newCount: number): number {
  return newCount > storedCount ? newCount : storedCount
}
