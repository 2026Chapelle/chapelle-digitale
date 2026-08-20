/**
 * CANONICAL SERVER (Phase 3C) — accès serveur (service_role) au modèle canonique.
 *
 * Thin wrappers I/O au-dessus de supabaseAdmin. La logique métier reste PURE
 * (validation-service / member-projection / review-queue) ; ici on ne fait que lire/
 * appeler la RPC atomique. Chaque lecture est isolée (try/catch) pour ne jamais casser
 * un écran si une table manque. AUCUNE mutation directe : la seule écriture pastorale
 * passe par la RPC `validate_member_canonical_axis` (atomique + auditée).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { buildMemberCanonicalProjection, type MemberCanonicalProjection } from './member-projection'
import { buildReviewQueue, countPendingAxes, type ReviewQueueItem, type ReviewQueueRow, type QueueMemberIdentity } from './review-queue'
import type { ValidatableAxis } from './validation-service'

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch { return fallback }
}

export interface CanonicalAxesRow {
  profile_id: string
  growth_level: string | null
  growth_review_state: string
  community_status: string | null
  community_review_state: string
  updated_at?: string | null
}

export interface AxisChangeRow {
  id: string
  axis: string
  old_value: string | null
  new_value: string | null
  actor_id: string | null
  actor_label: string | null
  justification: string | null
  provenance: string
  created_at: string
}

/** Ligne courante des axes canoniques d'un membre (ou null si jamais créée). */
export async function readCanonicalAxesRow(memberId: string): Promise<CanonicalAxesRow | null> {
  return safe(async () => {
    const { data } = await supabaseAdmin
      .from('member_canonical_axes')
      .select('profile_id, growth_level, growth_review_state, community_status, community_review_state, updated_at')
      .eq('profile_id', memberId)
      .maybeSingle()
    return (data as CanonicalAxesRow) ?? null
  }, null)
}

/** Affectations ministérielles ACTIVES (miroir member_ministry_roles). */
export async function readActiveMinistryRows(memberId: string): Promise<{ role_key: string; status: string }[]> {
  return safe(async () => {
    const { data } = await supabaseAdmin
      .from('member_ministry_roles')
      .select('role_key, status')
      .eq('profile_id', memberId)
      .eq('status', 'active')
    return (data as { role_key: string; status: string }[]) ?? []
  }, [])
}

/** Historique d'audit NOMINATIF (append-only) d'un membre — écran ADMIN uniquement. */
export async function readAxisHistory(memberId: string, limit = 50): Promise<AxisChangeRow[]> {
  return safe(async () => {
    const { data } = await supabaseAdmin
      .from('member_canonical_axis_changes')
      .select('id, axis, old_value, new_value, actor_id, actor_label, justification, provenance, created_at')
      .eq('profile_id', memberId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data as AxisChangeRow[]) ?? []
  }, [])
}

/** Projection CAVIARDÉE pour le membre connecté (aucune donnée interne). */
export async function readMemberProjection(memberId: string): Promise<MemberCanonicalProjection> {
  const [axes, ministries] = await Promise.all([
    readCanonicalAxesRow(memberId),
    readActiveMinistryRows(memberId),
  ])
  return buildMemberCanonicalProjection(axes, ministries)
}

/** File de revue pastorale (axes en 'requires_review') + identités jointes. Écran ADMIN. */
export async function listReviewQueue(): Promise<{ items: ReviewQueueItem[]; pendingCount: number }> {
  const rows = await safe(async () => {
    const { data } = await supabaseAdmin
      .from('member_canonical_review_queue')
      .select('profile_id, growth_level, growth_review_state, community_status, community_review_state, updated_at, growth_needs_review, community_needs_review')
      .limit(500)
    return (data as ReviewQueueRow[]) ?? []
  }, [] as ReviewQueueRow[])

  const identities: Record<string, QueueMemberIdentity> = {}
  const ids = Array.from(new Set(rows.map((r) => r.profile_id))).filter(Boolean)
  if (ids.length) {
    await safe(async () => {
      const { data } = await supabaseAdmin.from('profiles').select('id, prenom, nom, email').in('id', ids)
      for (const p of (data as { id: string; prenom: string | null; nom: string | null; email: string | null }[]) ?? []) {
        identities[p.id] = { prenom: p.prenom, nom: p.nom, email: p.email }
      }
      return null
    }, null)
  }

  return { items: buildReviewQueue(rows, identities), pendingCount: countPendingAxes(rows) }
}

export type ValidateAxisResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: 'NOT_AUTHORIZED' | 'INVALID_INPUT' | 'ERROR'; message: string }

/**
 * Appelle la RPC ATOMIQUE de validation pastorale (upsert axe + audit nominatif).
 * L'autorisation applicative (can_validate_journey_change) est vérifiée par la ROUTE ;
 * la RPC re-vérifie la portée pastorale en DB (défense en profondeur).
 */
export async function validateAxis(params: {
  profileId: string
  axis: ValidatableAxis
  newValue: string
  actorId: string
  actorLabel: string | null
  justification: string
}): Promise<ValidateAxisResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc('validate_member_canonical_axis', {
      p_profile_id: params.profileId,
      p_axis: params.axis,
      p_new_value: params.newValue,
      p_actor_id: params.actorId,
      p_actor_label: params.actorLabel,
      p_justification: params.justification,
    })
    if (error) {
      const msg = error.message || 'Erreur de validation.'
      if (msg.includes('NOT_AUTHORIZED')) {
        return { ok: false, code: 'NOT_AUTHORIZED', message: 'Vous n’êtes pas responsable de ce membre.' }
      }
      if (msg.includes('INVALID_INPUT')) {
        return { ok: false, code: 'INVALID_INPUT', message: 'Requête de validation invalide.' }
      }
      return { ok: false, code: 'ERROR', message: msg }
    }
    return { ok: true, data: (data as Record<string, unknown>) ?? {} }
  } catch (e: unknown) {
    return { ok: false, code: 'ERROR', message: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }
}
