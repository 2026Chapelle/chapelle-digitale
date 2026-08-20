/**
 * COMPATIBILITY LAYER (legacy → canonique), PURE et LECTURE SEULE.
 *
 * Traduit les champs legacy (profiles.membre_statut / role / parcours_disciple_etape,
 * tous en FR) vers la vue canonique à 4 axes (clés EN), SANS jamais fabriquer de certitude.
 *
 * Règle de sûreté (vérifiée) : dans profiles.membre_statut, seule la valeur `visiteur`
 * est un état SÛR. Toutes les autres (nouveau_membre, membre_actif, disciple…) proviennent
 * d'une AUTO-PROMOTION non validée ou d'une fuite d'axe (leader_cellule/berger/pasteur =
 * ministère). Elles ne doivent JAMAIS être « blanchies » en growth/community confirmés →
 * `requires_review`. Exemple imposé : `membre_actif` ne devient PAS `growth='disciple'`.
 *
 * N'écrit rien, n'importe aucun module serveur. Utilisé comme FALLBACK quand aucune
 * ligne member_canonical_axes n'existe encore (NO_CANONICAL_ROW).
 */
import type {
  CanonicalMemberView, CanonicalGrowth, CanonicalCommunity, MinistryRole,
} from './types'

export interface LegacyProfileInput {
  membre_statut?: string | null
  role?: string | null
  parcours_disciple_etape?: number | null
}

/** membre_statut (FR) → contribution MINISTRY (clé registre EN). Décomposition SÛRE. */
const STATUT_MINISTRY: Record<string, MinistryRole> = {
  leader_cellule: 'cell_leader',
  berger: 'shepherd',
  pasteur: 'pastor',
}

/** role (user_role FR) → ministère EN, uniquement pour les rôles FONCTIONNELS non ambigus. */
const ROLE_MINISTRY: Record<string, MinistryRole> = {
  berger: 'shepherd',
  pasteur: 'pastor',
  pasteur_national: 'pastor',
  responsable_integration: 'integration_lead',
  formateur: 'trainer',
  // 'leader' (user_role) volontairement AMBIGU → non mappé (note émise).
}

function deriveGrowth(membre_statut?: string | null): { growth: CanonicalGrowth; note?: string } {
  if (membre_statut === 'visiteur') return { growth: { level: 'visitor', confidence: 'confirmed' } }
  if (!membre_statut) return { growth: { level: null, confidence: 'requires_review' }, note: 'growth: membre_statut absent → requires_review' }
  return {
    growth: { level: null, confidence: 'requires_review' },
    note: `growth: '${membre_statut}' issu d'auto-promotion/fuite d'axe → requires_review (jamais mappé automatiquement vers un niveau de croissance)`,
  }
}

function deriveCommunity(membre_statut?: string | null): { community: CanonicalCommunity; note?: string } {
  if (membre_statut === 'visiteur') return { community: { status: 'visitor', confidence: 'confirmed' } }
  if (!membre_statut) return { community: { status: null, confidence: 'requires_review' }, note: 'community: membre_statut absent → requires_review' }
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
  if (r === 'leader') notes.push("ministry: role='leader' ambigu (cell_leader ?) → non mappé, requires_review")
  return { roles: Array.from(roles), notes }
}

/**
 * Vue canonique en LECTURE SEULE (fallback legacy). Déterministe et pure.
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

  // pasteur = ministère, jamais un growth_level (hors échelle cible visitor…shepherd).
  if (input.membre_statut === 'pasteur' || input.role === 'pasteur') {
    notes.push("axe: 'pasteur' traité en ministry_role (pastor), absent de l'échelle growth")
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
    source: 'legacy_fallback',
  }
}
