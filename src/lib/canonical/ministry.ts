/**
 * MINISTRY ROLE REGISTRY (contrat applicatif, pur).
 *
 * PRINCIPE ABSOLU : MinistryRole ≠ RBAC/ApplicationRole. Une fonction ecclésiale
 * NE confère JAMAIS une permission technique. Aucune fonction de ce module n'est
 * lue par src/lib/permissions.ts. `requires_human_validation` signale seulement
 * qu'une affectation sensible EXIGE une validation humaine — ce drapeau ne donne
 * AUCUNE autorisation de valider.
 */
import type { MinistryRole } from './types'

export type AuthorityTier = 'care' | 'ministry' | 'leadership' | 'oversight'

export interface MinistryRoleDef {
  key: MinistryRole
  label_fr: string
  authority_tier: AuthorityTier
  /** true = affectation sensible → validation humaine obligatoire (informatif, non habilitant). */
  requires_human_validation: boolean
  sort_order: number
}

export const MINISTRY_ROLE_REGISTRY: MinistryRoleDef[] = [
  { key: 'mentor',           label_fr: 'Mentor',                  authority_tier: 'care',       requires_human_validation: false, sort_order: 10 },
  { key: 'servant',          label_fr: 'Serviteur',               authority_tier: 'ministry',   requires_human_validation: false, sort_order: 20 },
  { key: 'trainer',          label_fr: 'Formateur',               authority_tier: 'ministry',   requires_human_validation: false, sort_order: 30 },
  { key: 'integration_lead', label_fr: "Responsable intégration", authority_tier: 'ministry',   requires_human_validation: true,  sort_order: 40 },
  { key: 'cell_leader',      label_fr: 'Leader de cellule',       authority_tier: 'leadership', requires_human_validation: true,  sort_order: 50 },
  { key: 'team_leader',      label_fr: "Responsable d'équipe",    authority_tier: 'leadership', requires_human_validation: true,  sort_order: 60 },
  { key: 'shepherd',         label_fr: 'Berger',                  authority_tier: 'oversight',  requires_human_validation: true,  sort_order: 70 },
  { key: 'pastor',           label_fr: 'Pasteur',                 authority_tier: 'oversight',  requires_human_validation: true,  sort_order: 80 },
]

const BY_KEY: Record<string, MinistryRoleDef> =
  Object.fromEntries(MINISTRY_ROLE_REGISTRY.map((d) => [d.key, d]))

export function ministryRoleDef(key: string): MinistryRoleDef | null {
  return BY_KEY[key] ?? null
}

export function ministryRequiresHumanValidation(key: string): boolean {
  return BY_KEY[key]?.requires_human_validation ?? false
}

export function isKnownMinistryRole(key: string): key is MinistryRole {
  return key in BY_KEY
}

/** Affectation ministérielle persistée (miroir applicatif de member_ministry_roles). */
export interface MinistryAssignment {
  role_key: MinistryRole
  status: 'active' | 'ended'
  assigned_at: string
  assigned_by: string | null
  ended_at: string | null
  provenance: string | null
  note: string | null
}
