/**
 * AdminContext (V2.5-C-②-B) — cœur PUR, lecture seule, testable (aucun I/O, aucun import serveur).
 *
 * Compose l'identité admin en un contexte réutilisable POUR PLUS TARD. Il ne bloque rien,
 * ne filtre rien, n'active aucun RBAC : c'est une brique informative.
 *
 * Comportement NON RÉGRESSIF :
 *  - profil réel résolu (session Supabase)  → contexte enrichi (role/scope informatifs).
 *  - authentifié via cookie legacy sans profil → `legacyFallback: true`, role/scope null
 *    (les appelants gardent le comportement actuel = super_admin de fait).
 *  - non authentifié → `isAuthenticated: false`.
 *
 * Le rôle/scope sont dérivés d'un profil déjà résolu côté serveur — jamais d'un claim de
 * cookie non signé. La vraie garde d'accès reste ailleurs (isAdminRequest sur route/API).
 */

export type AdminScopeKind = 'global' | 'nation' | 'antenne' | 'group' | 'platform' | 'unknown'

export interface AdminScope {
  kind: AdminScopeKind
  pays?: string | null
  antenneId?: string | null
  groupId?: string | null
  platform?: string | null
}

/** Responsabilité DÉRIVÉE du profil (informative). Les responsabilités *autoritatives*
 *  (nation_responsables / antenne_responsables) seront ajoutées en C-②-C. */
export interface AdminResponsibility {
  type: 'nation' | 'antenne' | 'group' | 'platform'
  ref: string
}

/** Entrée profil normalisée (découplée du type ProfileRow — inclut antenne_id, absent de ce type). */
export interface AdminProfileInput {
  profileId: string
  email: string | null
  role: string | null
  membreStatut?: string | null
  pays?: string | null
  ville?: string | null
  antenneId?: string | null
  groupeCelluleId?: string | null
  plateformePrincipale?: string | null
}

export interface AdminContext {
  isAuthenticated: boolean
  profileId: string | null
  email: string | null
  role: string | null
  responsibilities: AdminResponsibility[]
  scope: AdminScope | null
  legacyFallback: boolean
}

const GLOBAL_ROLES = new Set(['super_admin', 'admin'])

/** Responsabilités informatives dérivées des attributs du profil (jamais inventées). */
export function deriveResponsibilities(p: AdminProfileInput): AdminResponsibility[] {
  const r: AdminResponsibility[] = []
  if (p.antenneId) r.push({ type: 'antenne', ref: p.antenneId })
  if (p.groupeCelluleId) r.push({ type: 'group', ref: p.groupeCelluleId })
  if (p.pays) r.push({ type: 'nation', ref: p.pays })
  if (p.plateformePrincipale) r.push({ type: 'platform', ref: p.plateformePrincipale })
  return r
}

/** Scope INFORMATIF (non utilisé pour bloquer/filtrer à ce stade). */
export function deriveScope(p: AdminProfileInput): AdminScope {
  if (p.role && GLOBAL_ROLES.has(p.role)) return { kind: 'global' }
  if (p.antenneId) return { kind: 'antenne', antenneId: p.antenneId }
  if (p.pays) return { kind: 'nation', pays: p.pays }
  if (p.groupeCelluleId) return { kind: 'group', groupId: p.groupeCelluleId }
  if (p.plateformePrincipale) return { kind: 'platform', platform: p.plateformePrincipale }
  return { kind: 'unknown' }
}

/**
 * Normalise un objet profil « lâche » (ex. sortie de getServerProfile / ProfileRow) en
 * AdminProfileInput. Lit `antenne_id` de façon prudente (absent du type ProfileRow) sans
 * casser le type-check et sans toucher au schéma. Renvoie null si pas d'id exploitable.
 */
export function profileToAdminInput(p: Record<string, unknown> | null | undefined): AdminProfileInput | null {
  if (!p || typeof p.id !== 'string' || !p.id) return null
  const s = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
  return {
    profileId: p.id,
    email: s(p.email),
    role: s(p.role),
    membreStatut: s(p.membre_statut),
    pays: s(p.pays),
    ville: s(p.ville),
    antenneId: s(p.antenne_id),
    groupeCelluleId: s(p.groupe_cellule_id),
    plateformePrincipale: s(p.plateforme_principale),
  }
}

/** Cœur PUR : construit le contexte admin à partir d'entrées déjà résolues. */
export function buildAdminContext(inputs: { legacyAuthenticated: boolean; profile: AdminProfileInput | null }): AdminContext {
  const { legacyAuthenticated, profile } = inputs

  if (profile) {
    return {
      isAuthenticated: true,
      profileId: profile.profileId,
      email: profile.email ?? null,
      role: profile.role ?? null,
      responsibilities: deriveResponsibilities(profile),
      scope: deriveScope(profile),
      legacyFallback: false,
    }
  }

  if (legacyAuthenticated) {
    // Authentifié via cookie legacy, aucune identité résolue → comportement actuel préservé.
    return { isAuthenticated: true, profileId: null, email: null, role: null, responsibilities: [], scope: null, legacyFallback: true }
  }

  return { isAuthenticated: false, profileId: null, email: null, role: null, responsibilities: [], scope: null, legacyFallback: false }
}
