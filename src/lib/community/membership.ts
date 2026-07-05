/**
 * APPARTENANCE COMMUNAUTAIRE — logique PURE (testable). Aucune I/O.
 *
 * Règles de gestion du groupe principal (is_primary) et du cycle de vie d'une
 * appartenance (membres_groupe). Réutilisé par les APIs (Lot 2) et reflète
 * exactement les triggers SQL du Lot 1 — une seule vérité fonctionnelle.
 *
 * Rappels (validés) :
 *  - Le PREMIER groupe rejoint devient principal automatiquement.
 *  - UN SEUL groupe principal par membre.
 *  - À la sortie du groupe principal, bascule auto vers un autre groupe actif.
 */

export type MembershipRole = 'leader' | 'co-leader' | 'membre'
export type MembershipStatut = 'actif' | 'en_attente' | 'sorti'

export interface Membership {
  groupe_id: string
  is_primary: boolean
  statut: MembershipStatut
  role?: MembershipRole
  date_adhesion?: string
}

export interface JoinableGroup {
  statut?: string | null
  capacite_max?: number | null
  membres_count?: number | null
}

/** Appartenances actives uniquement. */
function actives(memberships: Membership[]): Membership[] {
  return memberships.filter((m) => m.statut === 'actif')
}

/**
 * À l'adhésion : le membre n'a-t-il encore AUCUN groupe principal actif ?
 * Si oui, le nouveau groupe doit devenir principal.
 */
export function shouldBePrimaryOnJoin(existing: Membership[]): boolean {
  return !actives(existing).some((m) => m.is_primary)
}

/**
 * Applique le groupe principal : seul `targetGroupId` reste is_primary=true,
 * tous les autres passent à false. Retourne une NOUVELLE liste (pure).
 */
export function applyPrimary(memberships: Membership[], targetGroupId: string): Membership[] {
  return memberships.map((m) => ({ ...m, is_primary: m.groupe_id === targetGroupId }))
}

/**
 * À la sortie d'un groupe : si le groupe quitté était le principal, désigne le
 * prochain groupe principal parmi les appartenances actives restantes
 * (la plus ancienne par date d'adhésion). Retourne le groupe_id, ou null.
 */
export function pickPrimaryAfterLeave(memberships: Membership[], leavingGroupId: string): string | null {
  const leaving = memberships.find((m) => m.groupe_id === leavingGroupId)
  if (!leaving?.is_primary) return null // le groupe quitté n'était pas principal : aucune bascule
  const remaining = actives(memberships).filter((m) => m.groupe_id !== leavingGroupId)
  if (remaining.length === 0) return null
  const sorted = [...remaining].sort((a, b) => String(a.date_adhesion || '').localeCompare(String(b.date_adhesion || '')))
  return sorted[0].groupe_id
}

/**
 * À l'AJOUT d'un membre à un groupe : ce groupe doit-il être marqué principal ?
 * Vrai si l'appartenance est déjà principale OU si le membre n'a aucun AUTRE
 * groupe principal actif. Ne « vole » jamais le principal d'un autre groupe.
 */
export function decidePrimaryOnAdd(existing: Membership[], groupeId: string): boolean {
  const thisRow = existing.find((m) => m.groupe_id === groupeId)
  if (thisRow?.is_primary) return true
  const hasOtherActivePrimary = existing.some((m) => m.statut === 'actif' && m.is_primary && m.groupe_id !== groupeId)
  return !hasOtherActivePrimary
}

/** Un membre peut-il rejoindre ce groupe ? (statut actif + capacité non atteinte). */
export function canJoinGroup(group: JoinableGroup): { ok: boolean; reason?: string } {
  if (group.statut !== 'actif') return { ok: false, reason: 'Groupe indisponible.' }
  const cap = group.capacite_max
  const count = group.membres_count ?? 0
  if (cap != null && cap > 0 && count >= cap) return { ok: false, reason: 'Groupe complet.' }
  return { ok: true }
}

const ROLE_LABELS: Record<MembershipRole, string> = {
  leader: 'Leader',
  'co-leader': 'Co-leader',
  membre: 'Membre',
}

/** Libellé lisible d'un rôle local d'appartenance. */
export function membershipRoleLabel(role?: string | null): string {
  return (role && ROLE_LABELS[role as MembershipRole]) || 'Membre'
}
