/**
 * MEMBER PROJECTION (Phase 3C) — projection CAVIARDÉE destinée au MEMBRE lui-même.
 *
 * Le membre ne lit JAMAIS les tables de base (member_canonical_axes / _changes /
 * member_ministry_roles) : review_state, justification, actor_id, provenance sont du
 * raisonnement pastoral INTERNE (cf. RLS 3B : aucune policy 'own'). Ce module construit,
 * côté serveur et de façon PURE, ce que le membre a le droit de voir : ses valeurs d'axes
 * reconnues + ses ministères actifs, en libellés FR. Rien d'interne ne fuit.
 *
 * INVARIANT : ne JAMAIS exposer growth_review_state / community_review_state / justification /
 * actor / provenance. Le champ `defini` distingue « reconnu » de « pas encore défini » sans
 * révéler le jargon interne « requires_review ».
 */
import type { GrowthLevel, CommunityStatus } from './types'
import { GROWTH_LABELS_FR, COMMUNITY_LABELS_FR } from './validation-service'
import { ministryRoleDef } from './ministry'

export interface CanonicalAxesRowLike {
  growth_level: string | null
  community_status: string | null
}

export interface MinistryRowLike {
  role_key: string
  status: string
}

export interface MemberAxisProjection {
  /** Clé canonique EN (ou null si non défini) — utile pour un rendu conditionnel. */
  key: string | null
  /** Libellé FR de présentation. */
  label: string
  /** true dès qu'une valeur reconnue existe (masque le jargon interne requires_review). */
  defini: boolean
}

export interface MemberMinistryProjection {
  key: string
  label: string
}

export interface MemberCanonicalProjection {
  growth: MemberAxisProjection
  community: MemberAxisProjection
  ministries: MemberMinistryProjection[]
}

function projectGrowth(v: string | null): MemberAxisProjection {
  if (v && v in GROWTH_LABELS_FR) {
    return { key: v, label: GROWTH_LABELS_FR[v as GrowthLevel], defini: true }
  }
  return { key: null, label: 'Non encore défini', defini: false }
}

function projectCommunity(v: string | null): MemberAxisProjection {
  if (v && v in COMMUNITY_LABELS_FR) {
    return { key: v, label: COMMUNITY_LABELS_FR[v as CommunityStatus], defini: true }
  }
  return { key: null, label: 'Non encore défini', defini: false }
}

/**
 * Construit la projection membre CAVIARDÉE (PURE).
 * @param axesRow ligne member_canonical_axes du membre (ou null → axes non définis)
 * @param ministryRows affectations member_ministry_roles (seules les 'active' sont exposées)
 */
export function buildMemberCanonicalProjection(
  axesRow: CanonicalAxesRowLike | null,
  ministryRows: MinistryRowLike[] | null | undefined,
): MemberCanonicalProjection {
  const ministries = (ministryRows ?? [])
    .filter((r) => r.status === 'active')
    .map((r) => {
      const def = ministryRoleDef(r.role_key)
      return def ? { key: def.key as string, label: def.label_fr } : null
    })
    .filter((m): m is MemberMinistryProjection => m !== null)
    // dédoublonnage défensif par clé
    .filter((m, i, arr) => arr.findIndex((x) => x.key === m.key) === i)

  return {
    growth: projectGrowth(axesRow?.growth_level ?? null),
    community: projectCommunity(axesRow?.community_status ?? null),
    ministries,
  }
}
