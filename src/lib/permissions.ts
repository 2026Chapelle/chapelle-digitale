/**
 * PERMISSIONS — source UNIQUE de vérité du RBAC Citadelle (logique PURE).
 *
 * Deux axes séparés :
 *   - role (fonctionnel : accès)         → admin/super_admin/formateur/responsable_*…
 *   - membre_statut (spirituel : progression) → visiteur…berger
 * Le privilège « berger » est PÉDAGOGIQUE (accès parcours) — jamais administratif.
 *
 * Utilisé partout (menu, pages, API) pour éviter toute duplication ou divergence.
 */

export type Permission =
  | 'can_access_formateur_space'
  | 'can_access_integration_space'
  | 'can_access_national_dashboard'
  | 'can_manage_members'
  | 'can_manage_roles'
  | 'can_view_all_parcours'
  | 'can_override_parcours_locks'
  | 'can_manage_certificates'
  | 'can_view_pastoral_dashboard'
  | 'can_manage_pastoral_notes'
  | 'can_respond_pastoral'
  | 'can_manage_groups'
  | 'can_view_group_members'
  | 'can_supervise_community'
  | 'can_access_admin'

export const ALL_PERMISSIONS: Permission[] = [
  'can_access_formateur_space', 'can_access_integration_space', 'can_access_national_dashboard',
  'can_manage_members', 'can_manage_roles', 'can_view_all_parcours', 'can_override_parcours_locks',
  'can_manage_certificates', 'can_view_pastoral_dashboard', 'can_manage_pastoral_notes', 'can_respond_pastoral',
  'can_manage_groups', 'can_view_group_members', 'can_supervise_community', 'can_access_admin',
]

export const PERMISSION_LABELS: Record<Permission, string> = {
  can_access_formateur_space: 'Espace Formateur',
  can_access_integration_space: 'Espace Intégration',
  can_access_national_dashboard: 'Tableau National',
  can_manage_members: 'Gérer les membres',
  can_manage_roles: 'Gérer les rôles',
  can_view_all_parcours: 'Voir tous les parcours',
  can_override_parcours_locks: 'Ignorer les verrous de parcours',
  can_manage_certificates: 'Gérer les certificats',
  can_view_pastoral_dashboard: 'Tableau pastoral',
  can_manage_pastoral_notes: 'Notes pastorales',
  can_respond_pastoral: 'Répondre aux demandes pastorales',
  can_manage_groups: 'Gérer les groupes',
  can_view_group_members: 'Voir les membres des groupes',
  can_supervise_community: 'Superviser la communauté',
  can_access_admin: 'Administration',
}

export interface RoleContext { role?: string | null; membre_statut?: string | null }

/** Permissions accordées par RÔLE FONCTIONNEL. */
const PERM_BY_ROLE: Record<string, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  admin: [...ALL_PERMISSIONS],
  formateur: ['can_access_formateur_space'],
  responsable_integration: ['can_access_integration_space', 'can_view_group_members'],
  responsable_national: ['can_access_national_dashboard', 'can_manage_groups', 'can_view_group_members', 'can_supervise_community', 'can_respond_pastoral'],
  pasteur_national: ['can_access_national_dashboard', 'can_manage_groups', 'can_view_group_members', 'can_supervise_community', 'can_respond_pastoral'],
  pasteur: ['can_access_national_dashboard', 'can_manage_groups', 'can_view_group_members', 'can_supervise_community', 'can_respond_pastoral'],
  // membre, visiteur, disciple, leader, nouveau_membre… : aucune permission spéciale
}

/**
 * Override PÉDAGOGIQUE du berger (axe spirituel) — accès parcours total, jamais admin.
 * + capacité de réponse pastorale (soin des âmes), sans accès administratif.
 */
const BERGER_PERMS: Permission[] = ['can_view_all_parcours', 'can_override_parcours_locks', 'can_respond_pastoral']

/** Permissions effectives d'un contexte (rôle fonctionnel ∪ override spirituel). */
export function getPermissions(ctx: RoleContext): Set<Permission> {
  const set = new Set<Permission>(PERM_BY_ROLE[String(ctx.role || '')] || [])
  if (ctx.role === 'berger' || ctx.membre_statut === 'berger') BERGER_PERMS.forEach((p) => set.add(p))
  return set
}

/** L'utilisateur a-t-il la permission ? Accepte un rôle seul ou un contexte complet. */
export function can(ctx: RoleContext | string | null | undefined, perm: Permission): boolean {
  const c: RoleContext = typeof ctx === 'string' || ctx == null ? { role: ctx as string } : ctx
  return getPermissions(c).has(perm)
}

// ── Sécurité des changements de rôle (PUR) ──────────────────────────────────

const PRIVILEGED = new Set(['admin', 'super_admin'])

/**
 * Un acteur peut-il appliquer ce changement de rôle ?
 * Seul un super_admin peut TOUCHER un compte privilégié (admin/super_admin) ou
 * PROMOUVOIR quelqu'un vers un rôle privilégié.
 */
export function canModifyRole(actorIsSuperAdmin: boolean, targetCurrentRole: string, newRole: string): boolean {
  if (PRIVILEGED.has(targetCurrentRole) || PRIVILEGED.has(newRole)) return actorIsSuperAdmin
  return true
}

/** Le changement retirerait-il le DERNIER super_admin actif ? (à bloquer) */
export function wouldRemoveLastSuperAdmin(targetCurrentRole: string, newRole: string, activeSuperAdminCount: number): boolean {
  return targetCurrentRole === 'super_admin' && newRole !== 'super_admin' && activeSuperAdminCount <= 1
}

// ── Catalogues pour l'UI ────────────────────────────────────────────────────

/** Rôles FONCTIONNELS assignables depuis l'admin (le spirituel se gère via membre_statut). */
export const ASSIGNABLE_ROLES: { value: string; label: string; kind: 'membre' | 'fonctionnel' | 'admin' }[] = [
  { value: 'visiteur', label: 'Visiteur', kind: 'membre' },
  { value: 'membre', label: 'Membre', kind: 'membre' },
  { value: 'formateur', label: 'Formateur', kind: 'fonctionnel' },
  { value: 'responsable_integration', label: "Responsable intégration", kind: 'fonctionnel' },
  { value: 'responsable_national', label: 'Responsable national', kind: 'fonctionnel' },
  { value: 'pasteur_national', label: 'Pasteur national', kind: 'fonctionnel' },
  { value: 'admin', label: 'Administrateur', kind: 'admin' },
  { value: 'super_admin', label: 'Super Admin', kind: 'admin' },
]

/** Rôles présentés dans la matrice de permissions. */
export const MATRIX_ROLES = ['membre', 'berger', 'formateur', 'responsable_integration', 'responsable_national', 'pasteur_national', 'admin', 'super_admin'] as const
