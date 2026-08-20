/**
 * CANONICAL REPOSITORY — résolution de lecture PURE (aucune écriture, aucun I/O ici).
 *
 * Phase 3B : la persistance canonique existe (member_canonical_axes) mais peut être
 * ABSENTE pour un membre donné (NO_CANONICAL_ROW). Dans ce cas on RETOMBE sur la vue
 * legacy (legacyToCanonicalView) → le système legacy continue de fonctionner, aucun
 * accès perdu. Ce module NE FAIT AUCUNE ÉCRITURE dans le modèle canonique.
 *
 * Les fonctions ci-dessous sont pures (entrées = lignes DB déjà chargées + profil legacy).
 * La récupération réelle (supabaseAdmin) est un thin wrapper documenté (readCanonicalMemberView),
 * qui n'écrit jamais.
 */
import type { CanonicalMemberView, GrowthLevel, CommunityStatus, CanonicalConfidence, MinistryRole } from './types'
import { legacyToCanonicalView, type LegacyProfileInput } from './legacy-adapter'
import { isKnownMinistryRole, type MinistryAssignment } from './ministry'

/**
 * Ligne persistée public.member_canonical_axes (état courant MINIMAL — miroir applicatif).
 * C3 : pas de provenance/validated_by/validated_at ici (par-axe dans l'historique).
 */
export interface CanonicalAxesRow {
  profile_id: string
  growth_level: string | null
  growth_review_state: string          // 'confirmed' | 'requires_review'
  community_status: string | null
  community_review_state: string
}

const GROWTH_KEYS: GrowthLevel[] = ['visitor', 'new_believer', 'disciple', 'servant', 'leader', 'worker', 'responsible', 'shepherd']
const COMMUNITY_KEYS: CommunityStatus[] = ['visitor', 'contact', 'integrating', 'member']

function asGrowth(v: string | null): GrowthLevel | null {
  return v && (GROWTH_KEYS as string[]).includes(v) ? (v as GrowthLevel) : null
}
function asCommunity(v: string | null): CommunityStatus | null {
  return v && (COMMUNITY_KEYS as string[]).includes(v) ? (v as CommunityStatus) : null
}
function asConfidence(v: string): CanonicalConfidence {
  return v === 'confirmed' ? 'confirmed' : 'requires_review'
}

/**
 * Résout la vue canonique d'un membre.
 * - Si une ligne canonique existe → la vue provient de la persistance ('canonical').
 * - Sinon (NO_CANONICAL_ROW) → fallback legacy ('legacy_fallback'). Le legacy reste actif.
 * Les affectations ministérielles (member_ministry_roles) sont FUSIONNÉES si fournies ;
 * en fallback pur, ministry vient de l'adaptateur legacy.
 */
export function resolveCanonicalMemberView(
  row: CanonicalAxesRow | null,
  legacy: LegacyProfileInput,
  ministryAssignments?: MinistryAssignment[] | null,
): CanonicalMemberView {
  const ministryFromDb = (ministryAssignments ?? [])
    .filter((a) => a.status === 'active' && isKnownMinistryRole(a.role_key))
    .map((a) => a.role_key as MinistryRole)

  if (!row) {
    // NO_CANONICAL_ROW → vue legacy complète (source: 'legacy_fallback')
    const view = legacyToCanonicalView(legacy)
    if (ministryFromDb.length) {
      // Si des affectations ministérielles persistées existent déjà, elles priment.
      view.ministry_roles = Array.from(new Set(ministryFromDb))
      view.notes = [...view.notes, 'ministry: issu de member_ministry_roles (persisté)']
    }
    return view
  }

  const view: CanonicalMemberView = {
    growth: { level: asGrowth(row.growth_level), confidence: asConfidence(row.growth_review_state) },
    community: { status: asCommunity(row.community_status), confidence: asConfidence(row.community_review_state) },
    ministry_roles: Array.from(new Set(ministryFromDb)),
    learning: {
      currentProgrammeSlug: null,
      currentStepKey: null,
      journeyStatus: null,
      completedProgrammes: [],
      parcoursDiscipleEtape: legacy.parcours_disciple_etape ?? null,
    },
    notes: [],
    source: 'canonical',
  }
  return view
}

/**
 * Thin wrapper serveur (LECTURE SEULE) — documenté, non branché sur un chemin runtime en 3B.
 * Ne fait AUCUN insert/update. À utiliser depuis une route serveur avec supabaseAdmin.
 * Séparé du résolveur pur pour garder les tests sans I/O.
 *
 * @example
 *   const { data: row } = await supabaseAdmin.from('member_canonical_axes').select('*').eq('profile_id', id).maybeSingle()
 *   const { data: mins } = await supabaseAdmin.from('member_ministry_roles').select('*').eq('profile_id', id).eq('status','active')
 *   const view = resolveCanonicalMemberView(row ?? null, legacy, (mins ?? []).map(mapMinistryRow))
 */
export function mapMinistryRow(r: {
  role_key: string; status: string; assigned_at: string; assigned_by: string | null;
  ended_at: string | null; provenance: string | null; note: string | null
}): MinistryAssignment {
  return {
    role_key: r.role_key as MinistryRole,
    status: r.status === 'active' ? 'active' : 'ended',
    assigned_at: r.assigned_at,
    assigned_by: r.assigned_by,
    ended_at: r.ended_at,
    provenance: r.provenance,
    note: r.note,
  }
}
