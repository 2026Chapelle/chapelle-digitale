/**
 * Sélection PURE d'un credential par son `credentialId` (parcours DÉCOUVRABLE :
 * on identifie le propriétaire APRÈS la preuve cryptographique). Un credential
 * révoqué n'est jamais sélectionné.
 */
export interface SelectableCredential {
  id: string
  userId: string
  credentialId: string
  revokedAt: string | null
}

export function selectActiveCredential<T extends SelectableCredential>(
  list: T[],
  credentialId: string,
): T | null {
  const found = list.find((c) => c.credentialId === credentialId)
  if (!found) return null
  if (found.revokedAt) return null
  return found
}
