/**
 * VERROU INTER-PARCOURS — accès base (serveur).
 *
 * S'appuie sur la logique pure de `parcours-gating.ts` et sur les tables
 * existantes `parcours_formations`, `formation_modules`, `module_completions`.
 * Réutilisé par l'API modules (affichage) et l'API enroll (refus d'inscription).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { computeParcoursLock, isFormationComplete, type ParcoursSequenceItem } from './parcours-gating'

export interface ParcoursGateResult {
  parcours_locked: boolean
  parcours_lock_reason: string | null
  previous_formation: null | { slug: string; titre: string }
  /** Formation suivante de la séquence (pour le CTA « Continuer »). */
  next_formation: null | { slug: string; titre: string; statut: string }
}

/**
 * La formation `formationId` est-elle verrouillée pour l'utilisateur `uid`
 * parce que la formation précédente de sa séquence n'est pas terminée à 100 % ?
 */
export async function parcoursGate(formationId: string, uid: string): Promise<ParcoursGateResult> {
  // Séquence à laquelle appartient cette formation (la première trouvée).
  const { data: mine } = await supabaseAdmin
    .from('parcours_formations')
    .select('parcours_id')
    .eq('formation_id', formationId)
    .limit(1)
    .maybeSingle()
  if (!mine?.parcours_id) {
    return { parcours_locked: false, parcours_lock_reason: null, previous_formation: null, next_formation: null }
  }

  const { data: seqRows } = await supabaseAdmin
    .from('parcours_formations')
    .select('formation_id, ordre')
    .eq('parcours_id', mine.parcours_id)
    .order('ordre', { ascending: true })
  const sequence: ParcoursSequenceItem[] = (seqRows || []).map((r: any) => ({ formationId: r.formation_id, ordre: r.ordre }))

  // Formation SUIVANTE de la séquence (plus petit ordre strictement supérieur) — pour le CTA « Continuer ».
  const self = sequence.find((s) => s.formationId === formationId)
  const nextItem = self
    ? sequence.filter((s) => s.ordre > self.ordre).sort((a, b) => a.ordre - b.ordre)[0]
    : undefined
  let next_formation: ParcoursGateResult['next_formation'] = null
  if (nextItem) {
    const { data: nf } = await supabaseAdmin.from('formations').select('slug, titre, statut').eq('id', nextItem.formationId).maybeSingle()
    if (nf) next_formation = { slug: nf.slug, titre: nf.titre, statut: nf.statut }
  }

  // Identifie la formation précédente (sans complétion connue).
  const provisional = computeParcoursLock(formationId, sequence, [])
  if (!provisional.previousFormationId) {
    return { parcours_locked: false, parcours_lock_reason: null, previous_formation: null, next_formation }
  }

  // La formation précédente est-elle terminée à 100 % par l'utilisateur ?
  const prevId = provisional.previousFormationId
  const { count: prevTotal } = await supabaseAdmin
    .from('formation_modules').select('*', { count: 'exact', head: true })
    .eq('formation_id', prevId).eq('status', 'published')
  const { count: prevDone } = await supabaseAdmin
    .from('module_completions').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('formation_id', prevId)
  const prevComplete = isFormationComplete(prevTotal ?? 0, prevDone ?? 0)

  const lock = computeParcoursLock(formationId, sequence, prevComplete ? [prevId] : [])
  let previous_formation: ParcoursGateResult['previous_formation'] = null
  if (!lock.unlocked) {
    const { data: pf } = await supabaseAdmin.from('formations').select('slug, titre').eq('id', prevId).maybeSingle()
    if (pf) previous_formation = { slug: pf.slug, titre: pf.titre }
  }
  return { parcours_locked: !lock.unlocked, parcours_lock_reason: lock.reason, previous_formation, next_formation }
}
