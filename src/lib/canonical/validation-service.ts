/**
 * VALIDATION SERVICE (Phase 3C) — logique PURE de la validation pastorale d'un axe.
 *
 * Aucune I/O, aucun import serveur : uniquement le vocabulaire fermé par axe, les
 * libellés FR de présentation, et la validation stricte d'une intention de validation
 * AVANT tout appel à la RPC atomique `validate_member_canonical_axis`.
 *
 * Contrat aligné mot pour mot sur les CHECK de la migration 3B/3C :
 *   - growth_level    ∈ visitor..shepherd
 *   - community_status ∈ visitor..member
 *   - une validation pastorale EXIGE une justification non vide (garde applicative +
 *     CHECK DB `mcac_pastoral_requires_actor_and_reason`).
 */
import type { GrowthLevel, CommunityStatus } from './types'

/** Les deux SEULS axes validables par un humain en 3C (learning = pédagogique, ministry = affectation). */
export type ValidatableAxis = 'growth_level' | 'community_status'

export const VALIDATABLE_AXES: ValidatableAxis[] = ['growth_level', 'community_status']

const GROWTH_VALUES: GrowthLevel[] = [
  'visitor', 'new_believer', 'disciple', 'servant', 'leader', 'worker', 'responsible', 'shepherd',
]
const COMMUNITY_VALUES: CommunityStatus[] = ['visitor', 'contact', 'integrating', 'member']

/** Libellés FR de présentation (non stockés — la DB ne connaît que les clés EN). */
export const GROWTH_LABELS_FR: Record<GrowthLevel, string> = {
  visitor: 'Visiteur',
  new_believer: 'Nouveau croyant',
  disciple: 'Disciple',
  servant: 'Serviteur',
  leader: 'Leader',
  worker: 'Ouvrier',
  responsible: 'Responsable',
  shepherd: 'Berger',
}

export const COMMUNITY_LABELS_FR: Record<CommunityStatus, string> = {
  visitor: 'Visiteur',
  contact: 'Contact',
  integrating: 'En intégration',
  member: 'Membre',
}

export const AXIS_LABELS_FR: Record<ValidatableAxis, string> = {
  growth_level: 'Niveau de croissance',
  community_status: 'Statut communautaire',
}

/** Longueur maximale de justification (borne UI/serveur ; la DB accepte du texte libre). */
export const JUSTIFICATION_MAX = 1000

export function isValidatableAxis(v: string): v is ValidatableAxis {
  return (VALIDATABLE_AXES as string[]).includes(v)
}

/** La valeur est-elle du vocabulaire fermé de l'axe donné ? */
export function isValidAxisValue(axis: ValidatableAxis, value: string): boolean {
  const set = axis === 'growth_level' ? (GROWTH_VALUES as string[]) : (COMMUNITY_VALUES as string[])
  return set.includes(value)
}

/** Valeurs sélectionnables pour l'UI (clé + libellé), dans l'ordre canonique. */
export function axisOptions(axis: ValidatableAxis): { value: string; label: string }[] {
  return axis === 'growth_level'
    ? GROWTH_VALUES.map((v) => ({ value: v, label: GROWTH_LABELS_FR[v] }))
    : COMMUNITY_VALUES.map((v) => ({ value: v, label: COMMUNITY_LABELS_FR[v] }))
}

/** Libellé FR d'une valeur d'axe (ou tiret si null/inconnue). */
export function labelForAxisValue(axis: ValidatableAxis, value: string | null | undefined): string {
  if (!value) return '—'
  if (axis === 'growth_level') return GROWTH_LABELS_FR[value as GrowthLevel] ?? value
  return COMMUNITY_LABELS_FR[value as CommunityStatus] ?? value
}

export interface ValidationIntent {
  profileId: string
  axis: ValidatableAxis
  newValue: string
  justification: string
}

export type ValidationCheck =
  | { ok: true; intent: ValidationIntent }
  | { ok: false; code: 'INVALID_INPUT'; message: string }

/**
 * Valide (PUR) une intention de validation pastorale avant l'appel RPC.
 * Aligné sur les CHECK DB : refuse tout ce que la RPC refuserait, avec un message FR clair.
 */
export function checkValidationIntent(input: {
  profileId?: unknown
  axis?: unknown
  newValue?: unknown
  justification?: unknown
}): ValidationCheck {
  const profileId = typeof input.profileId === 'string' ? input.profileId.trim() : ''
  if (!profileId) return { ok: false, code: 'INVALID_INPUT', message: 'Membre requis.' }

  const axis = String(input.axis ?? '')
  if (!isValidatableAxis(axis)) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Axe non supporté.' }
  }

  const newValue = typeof input.newValue === 'string' ? input.newValue.trim() : ''
  if (!isValidAxisValue(axis, newValue)) {
    return { ok: false, code: 'INVALID_INPUT', message: `Valeur invalide pour « ${AXIS_LABELS_FR[axis]} ».` }
  }

  const justification = typeof input.justification === 'string' ? input.justification.trim() : ''
  if (!justification) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Une justification pastorale est requise.' }
  }
  if (justification.length > JUSTIFICATION_MAX) {
    return { ok: false, code: 'INVALID_INPUT', message: `Justification trop longue (max ${JUSTIFICATION_MAX} caractères).` }
  }

  return { ok: true, intent: { profileId, axis, newValue, justification } }
}
