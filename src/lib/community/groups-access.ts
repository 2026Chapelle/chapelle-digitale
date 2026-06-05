/**
 * GROUPES — validation & contrôle d'accès PURS (testable). Aucune I/O.
 *
 * Source de vérité fonctionnelle partagée par les APIs admin & membre :
 *  - validateGroupInput   : normalise/valide une saisie de groupe (plateforme obligatoire).
 *  - canScopeManageGroup  : un périmètre (all/nation/assigned) peut-il agir sur CE groupe ?
 *  - canScopeCreateInPays : un périmètre peut-il créer un groupe dans CE pays ?
 * Aligné sur src/lib/group-scope.ts et la gouvernance validée (Lot 1).
 */
import type { GroupScope } from '@/lib/group-scope'

export const GROUP_TYPES = [
  'cellule', 'groupe_priere', 'equipe_service', 'equipe_ministere', 'formation', 'departement',
] as const
export type GroupType = (typeof GROUP_TYPES)[number]

export interface GroupInput {
  nom?: unknown; plateforme_id?: unknown; type?: unknown; description?: unknown
  pays?: unknown; ville?: unknown; zone?: unknown; niveau?: unknown; capacite_max?: unknown
  responsable_id?: unknown; parent_id?: unknown; code?: unknown
  jour_reunion?: unknown; heure_reunion?: unknown; lieu_reunion?: unknown
  est_virtuel?: unknown; reunion_url?: unknown
}

export interface NormalizedGroup {
  nom: string; plateforme_id: string; type: GroupType; description: string | null
  pays: string | null; ville: string | null; zone: string | null
  niveau: number; capacite_max: number | null
  responsable_id: string | null; parent_id: string | null; code: string | null
  jour_reunion: string | null; heure_reunion: string | null; lieu_reunion: string | null
  est_virtuel: boolean; reunion_url: string | null
}

const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s : null
}

/** Valide et normalise une saisie de groupe. plateforme_id est OBLIGATOIRE. */
export function validateGroupInput(input: GroupInput): { ok: boolean; errors: string[]; value?: NormalizedGroup } {
  const errors: string[] = []

  const nom = typeof input.nom === 'string' ? input.nom.trim() : ''
  if (!nom) errors.push('Le nom du groupe est requis.')

  const plateforme_id = typeof input.plateforme_id === 'string' ? input.plateforme_id.trim() : ''
  if (!plateforme_id) errors.push('La plateforme est obligatoire.')

  const type = (typeof input.type === 'string' && input.type) ? input.type : 'cellule'
  if (!GROUP_TYPES.includes(type as GroupType)) errors.push('Type de groupe invalide.')

  let niveau = 1
  if (input.niveau != null && input.niveau !== '') {
    niveau = Number(input.niveau)
    if (!Number.isInteger(niveau) || niveau < 1) errors.push('Le niveau doit être un entier ≥ 1.')
  }

  let capacite_max: number | null = null
  if (input.capacite_max != null && input.capacite_max !== '') {
    capacite_max = Number(input.capacite_max)
    if (!Number.isInteger(capacite_max) || capacite_max <= 0) errors.push('La capacité doit être un entier > 0.')
  }

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    value: {
      nom, plateforme_id, type: type as GroupType,
      description: str(input.description), pays: str(input.pays), ville: str(input.ville), zone: str(input.zone),
      niveau, capacite_max,
      responsable_id: str(input.responsable_id), parent_id: str(input.parent_id), code: str(input.code),
      jour_reunion: str(input.jour_reunion), heure_reunion: str(input.heure_reunion), lieu_reunion: str(input.lieu_reunion),
      est_virtuel: input.est_virtuel === true || input.est_virtuel === 'true',
      reunion_url: str(input.reunion_url),
    },
  }
}

/**
 * Champs qu'un LEADER peut modifier (modification restreinte). Garantit qu'un
 * leader ne touche JAMAIS pays / capacité / type / responsable / statut.
 */
export const GROUP_INFO_FIELDS = [
  'description', 'jour_reunion', 'heure_reunion', 'lieu_reunion', 'est_virtuel', 'reunion_url',
] as const

/** Ne conserve que les champs d'info autorisés (pur). Rejette tout le reste. */
export function pickAllowedInfos(patch: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const k of GROUP_INFO_FIELDS) if (k in patch) clean[k] = patch[k]
  return clean
}

export interface ScopeCtx { uid?: string | null; myPays?: string[] }

/** Le périmètre peut-il gérer (modifier / membres) CE groupe ? */
export function canScopeManageGroup(
  scope: GroupScope,
  group: { pays?: string | null; responsable_id?: string | null },
  ctx: ScopeCtx,
): boolean {
  if (scope === 'all') return true
  if (scope === 'nation') return !!group.pays && (ctx.myPays || []).includes(group.pays)
  if (scope === 'assigned') return !!ctx.uid && group.responsable_id === ctx.uid
  return false
}

/** Le périmètre peut-il CRÉER un groupe dans ce pays ? (assigned/denied ne créent pas.) */
export function canScopeCreateInPays(scope: GroupScope, pays: string | null | undefined, myPays: string[] = []): boolean {
  if (scope === 'all') return true
  if (scope === 'nation') return !!pays && myPays.includes(pays)
  return false
}
