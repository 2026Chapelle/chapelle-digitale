/**
 * Invariant ANTI-VERROUILLAGE (PUR) : ne jamais retirer la dernière méthode de
 * connexion viable d'un administrateur.
 *
 * Pendant le pilote, le mot de passe Supabase nominatif reste un secours actif :
 * la révocation d'une passkey est donc permise tant qu'un secours existe OU qu'il
 * reste au moins une autre passkey active après la révocation.
 */
export function canRevokePasskey(input: {
  hasPasswordFallback: boolean
  activePasskeysAfterRevoke: number
}): boolean {
  if (input.hasPasswordFallback) return true
  return input.activePasskeysAfterRevoke >= 1
}
