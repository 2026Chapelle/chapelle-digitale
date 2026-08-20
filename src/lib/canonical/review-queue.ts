/**
 * REVIEW QUEUE (Phase 3C) — mise en forme PURE de la file de revue pastorale.
 *
 * Transforme les lignes de la vue public.member_canonical_review_queue (axes en état
 * 'requires_review') en items d'écran ADMIN lisibles, sans I/O. Aucune décision n'est
 * prise ici : la file ne fait que RECOMMANDER une revue humaine (jamais promouvoir).
 */
import { labelForAxisValue, type ValidatableAxis } from './validation-service'

export interface ReviewQueueRow {
  profile_id: string
  growth_level: string | null
  growth_review_state: string
  community_status: string | null
  community_review_state: string
  updated_at: string | null
  growth_needs_review?: boolean
  community_needs_review?: boolean
}

/** Identité minimale d'un membre (jointe côté serveur pour l'affichage). */
export interface QueueMemberIdentity {
  prenom?: string | null
  nom?: string | null
  email?: string | null
}

export interface ReviewQueueAxisItem {
  axis: ValidatableAxis
  /** Valeur actuelle (en attente de confirmation), en libellé FR. */
  currentLabel: string
  currentValue: string | null
}

export interface ReviewQueueItem {
  profileId: string
  displayName: string
  email: string | null
  updatedAt: string | null
  /** Un ou deux axes à valider pour ce membre. */
  pending: ReviewQueueAxisItem[]
}

function displayName(id: QueueMemberIdentity | undefined, fallbackId: string): string {
  const full = [id?.prenom, id?.nom].filter(Boolean).join(' ').trim()
  if (full) return full
  if (id?.email) return id.email
  return `Membre ${fallbackId.slice(0, 8)}`
}

/**
 * Construit la file de revue (PURE).
 * @param rows lignes de member_canonical_review_queue
 * @param identities map profile_id → identité (prénom/nom/email), jointe côté serveur
 */
export function buildReviewQueue(
  rows: ReviewQueueRow[],
  identities: Record<string, QueueMemberIdentity> = {},
): ReviewQueueItem[] {
  return rows
    .map((r): ReviewQueueItem => {
      const pending: ReviewQueueAxisItem[] = []
      const growthNeeds = r.growth_needs_review ?? r.growth_review_state === 'requires_review'
      const communityNeeds = r.community_needs_review ?? r.community_review_state === 'requires_review'
      if (growthNeeds) {
        pending.push({
          axis: 'growth_level',
          currentValue: r.growth_level,
          currentLabel: labelForAxisValue('growth_level', r.growth_level),
        })
      }
      if (communityNeeds) {
        pending.push({
          axis: 'community_status',
          currentValue: r.community_status,
          currentLabel: labelForAxisValue('community_status', r.community_status),
        })
      }
      return {
        profileId: r.profile_id,
        displayName: displayName(identities[r.profile_id], r.profile_id),
        email: identities[r.profile_id]?.email ?? null,
        updatedAt: r.updated_at,
        pending,
      }
    })
    .filter((item) => item.pending.length > 0)
    // plus anciens en tête (à traiter en priorité) ; nulls en dernier
    .sort((a, b) => {
      if (!a.updatedAt) return 1
      if (!b.updatedAt) return -1
      return String(a.updatedAt).localeCompare(String(b.updatedAt))
    })
}

/** Compte total d'axes en attente (pour un KPI admin). */
export function countPendingAxes(rows: ReviewQueueRow[]): number {
  return rows.reduce((n, r) => {
    const g = (r.growth_needs_review ?? r.growth_review_state === 'requires_review') ? 1 : 0
    const c = (r.community_needs_review ?? r.community_review_state === 'requires_review') ? 1 : 0
    return n + g + c
  }, 0)
}
