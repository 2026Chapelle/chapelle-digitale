/**
 * RBAC — groupes de rôles et helpers de permission.
 *
 * Le rôle vit dans `profiles.role` (enum public.user_role). On définit des
 * GROUPES de capacités plutôt que de tester chaque rôle un par un :
 *   - admin        : pilotage complet de la plateforme
 *   - formateur    : gestion des formations / suivi des apprenants
 *   - intégration  : suivi des nouveaux membres / tunnel d'intégration
 *
 * Utilisable côté client (dashboards) ET serveur (routes API).
 */
export type Role =
  | 'visiteur' | 'membre' | 'disciple' | 'leader' | 'berger' | 'pasteur'
  | 'admin' | 'super_admin' | 'formateur' | 'responsable_integration'
  | 'nation_pastor' | 'responsable_national' | 'pasteur_national'

/**
 * Pilotage global (voit TOUS les espaces). Volontairement RESTREINT : ni
 * pasteur, ni berger, ni leader ne sont « admin » — chaque espace spécialisé
 * est réservé à SON rôle fonctionnel (affichage exclusif côté menu + API).
 */
export const ADMIN_ROLES: Role[] = ['admin', 'super_admin']

/** Espace Formateur : le rôle formateur (et les admins). RIEN d'autre. */
export const FORMATEUR_ROLES: Role[] = [...ADMIN_ROLES, 'formateur']

/** Espace Intégration : le responsable d'intégration (et les admins). */
export const INTEGRATION_ROLES: Role[] = [...ADMIN_ROLES, 'responsable_integration']

/** Tableau National : responsables/pasteurs nationaux (et les admins). */
export const NATIONAL_ROLES: Role[] = [...ADMIN_ROLES, 'nation_pastor', 'responsable_national', 'pasteur_national', 'pasteur']

// Les helpers délèguent à la source unique de vérité (src/lib/permissions.ts) —
// les listes ci-dessus restent documentaires / pour l'UI.
import { can } from './permissions'
export const isAdmin = (role?: string | null) => can(role, 'can_access_admin')
export const isFormateur = (role?: string | null) => can(role, 'can_access_formateur_space')
export const isIntegration = (role?: string | null) => can(role, 'can_access_integration_space')
export const isNational = (role?: string | null) => can(role, 'can_access_national_dashboard')

/** Libellé lisible d'un rôle. */
export function roleLabel(role?: string | null): string {
  const map: Record<string, string> = {
    visiteur: 'Visiteur', membre: 'Membre', disciple: 'Disciple', leader: 'Leader',
    berger: 'Berger', pasteur: 'Pasteur', admin: 'Administrateur', super_admin: 'Super Admin',
    formateur: 'Formateur', responsable_integration: 'Responsable intégration',
  }
  return (role && map[role]) || 'Membre'
}
