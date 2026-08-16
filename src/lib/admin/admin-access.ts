/**
 * Accès administration (V2.5-C-②-C1) — helper PUR, testable.
 *
 * Source de vérité unique : `permissions.can(role, 'can_access_admin')`. Un rôle donne accès
 * à l'admin uniquement s'il possède cette permission (aujourd'hui : super_admin / admin).
 * Utilisé par la connexion admin NOMINATIVE pour décider, CÔTÉ SERVEUR, si un profil Supabase
 * a le droit d'obtenir la session admin. Le rôle vient toujours du profil serveur, jamais du client.
 */
import { can } from '@/lib/permissions'

export const ADMIN_ACCESS_PERMISSION = 'can_access_admin' as const

/** Le rôle donne-t-il accès à l'administration ? (false si rôle absent/inconnu). */
export function isAdminCapable(role: string | null | undefined): boolean {
  if (!role || !role.trim()) return false
  return can(role, ADMIN_ACCESS_PERMISSION)
}
