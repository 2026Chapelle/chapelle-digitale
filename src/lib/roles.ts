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

/** Pilotage global. */
export const ADMIN_ROLES: Role[] = ['admin', 'super_admin', 'pasteur']

/** Peut gérer les formations et suivre les apprenants. */
export const FORMATEUR_ROLES: Role[] = [...ADMIN_ROLES, 'formateur', 'berger', 'leader']

/** Peut suivre l'intégration des nouveaux membres. */
export const INTEGRATION_ROLES: Role[] = [...ADMIN_ROLES, 'responsable_integration', 'berger']

export const isAdmin = (role?: string | null) => !!role && ADMIN_ROLES.includes(role as Role)
export const isFormateur = (role?: string | null) => !!role && FORMATEUR_ROLES.includes(role as Role)
export const isIntegration = (role?: string | null) => !!role && INTEGRATION_ROLES.includes(role as Role)

/** Libellé lisible d'un rôle. */
export function roleLabel(role?: string | null): string {
  const map: Record<string, string> = {
    visiteur: 'Visiteur', membre: 'Membre', disciple: 'Disciple', leader: 'Leader',
    berger: 'Berger', pasteur: 'Pasteur', admin: 'Administrateur', super_admin: 'Super Admin',
    formateur: 'Formateur', responsable_integration: 'Responsable intégration',
  }
  return (role && map[role]) || 'Membre'
}
