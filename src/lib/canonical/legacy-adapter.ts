/**
 * PHASE 3A — COMPATIBILITY LAYER (legacy → canonique), PURE et LECTURE SEULE.
 *
 * Traduit les champs legacy (profiles.membre_statut / role / parcours_disciple_etape)
 * vers la vue canonique à 4 axes, SANS jamais fabriquer de certitude.
 *
 * Règle de sûreté (Agent E, vérifiée) : dans profiles.membre_statut, seule la valeur
 * `visiteur` est un état SÛR. Toutes les autres (nouveau_membre, membre_actif, disciple…)
 * proviennent d'une AUTO-PROMOTION non validée (progress/route.ts → computeStatutUpgrade)
 * ou d'une fuite d'axe (leader_cellule/berger/pasteur = ministère). Elles ne doivent
 * donc JAMAIS être « blanchies » en growth/community confirmés → `requires_review`.
 *
 * Exemple imposé : `membre_actif` ne devient PAS `growth_level='disciple'`.
 *
 * Ce module n'écrit rien, n'importe aucun module serveur, et n'est branché sur
 * aucun chemin de production en Phase 3A.
 */
import type {
  CanonicalMemberView, CanonicalGrowth, CanonicalCommunity, MinistryRole,
} from './types'

export interface LegacyProfileInput {
  membre_statut?: string | null
  role?: string | null
  parcours_disciple_etape?: number | null
}

/** membre_statut → contribution MINISTRY (décomposition SÛRE des valeurs d'autorité). */
const STATUT_MINISTRY: Record<string, MinistryRole> = {
  leader_cellule: 'leader_cellule',
  berger: 'berger',
  pasteur: 'pasteur',
}

/** role (user_role) → ministère, uniquement pour les rôles FONCTIONNELS non ambigus. */
const ROLE_MINISTRY: Record<string, MinistryRole> = {
  berger: 'berger',
  pasteur: 'pasteur',
  pasteur_national: 'pasteur_national',
  nation_pastor: 'nation_pastor',
  responsable_national: 'responsable_national',
  responsable_integration: 'responsable_integration',
  formateur: 'formateur',
  // 'leader' (user_role) est volontairement AMBIGU → non mappé (note émise).
}

function deriveGrowth(membre_statut?: string | null): { growth: CanonicalGrowth; note?: string } {
  if (membre_statut === 'visiteur') return { growth: { level: 'visiteur', confidence: 'confirmed' } }
  if (!membre_statut) return { growth: { level: null, confidence: 'requires_review' }, note: 'growth: membre_statut absent → requires_review' }
  // Tout état non-visiteur est auto-promu ou fuite d'axe → jamais de croissance confirmée.
  return {
    growth: { level: null, confidence: 'requires_review' },
    note: `growth: '${membre_statut}' issu d'auto-promotion/fuite d'axe → requires_review (jamais mappé automatiquement vers un niveau de croissance)`,
  }
}

function deriveCommunity(membre_statut?: string | null): { community: CanonicalCommunity; note?: string } {
  if (membre_statut === 'visiteur') return { community: { status: 'visiteur', confidence: 'confirmed' } }
  if (!membre_statut) return { community: { status: null, confidence: 'requires_review' }, note: 'community: membre_statut absent → requires_review' }
  // Contact/Intégration/Membre ne sont pas dérivables de façon fiable depuis membre_statut seul.
  return {
    community: { status: null, confidence: 'requires_review' },
    note: `community: '${membre_statut}' non concluant (source fiable = tunnel_stage/newcomer) → requires_review`,
  }
}

function deriveMinistry(input: LegacyProfileInput): { roles: MinistryRole[]; notes: string[] } {
  const roles = new Set<MinistryRole>()
  const notes: string[] = []
  const s = input.membre_statut ?? undefined
  const r = input.role ?? undefined
  if (s && STATUT_MINISTRY[s]) roles.add(STATUT_MINISTRY[s])
  if (r && ROLE_MINISTRY[r]) roles.add(ROLE_MINISTRY[r])
  if (r === 'leader') notes.push("ministry: role='leader' ambigu (leader_cellule ?) → non mappé, requires_review")
  return { roles: Array.from(roles), notes }
}

/**
 * Vue canonique en LECTURE SEULE. Déterministe et pure.
 * Ne conclut jamais au-delà des faits ; marque explicitement l'ambiguïté.
 */
export function legacyToCanonicalView(input: LegacyProfileInput): CanonicalMemberView {
  const notes: string[] = []

  const g = deriveGrowth(input.membre_statut)
  if (g.note) notes.push(g.note)

  const c = deriveCommunity(input.membre_statut)
  if (c.note) notes.push(c.note)

  const m = deriveMinistry(input)
  notes.push(...m.notes)

  // pasteur = ministère, jamais un growth_level (hors échelle cible visiteur…berger).
  if (input.membre_statut === 'pasteur' || input.role === 'pasteur') {
    notes.push("axe: 'pasteur' traité en ministry_role, absent de l'échelle growth (visiteur…berger)")
  }

  return {
    growth: g.growth,
    community: c.community,
    ministry_roles: m.roles,
    learning: {
      currentProgrammeSlug: null,
      currentStepKey: null,
      journeyStatus: null,
      completedProgrammes: [],
      parcoursDiscipleEtape: input.parcours_disciple_etape ?? null,
    },
    notes,
  }
}
