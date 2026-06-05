/**
 * PROGRESSION DU PROGRAMME D'INTÉGRATION — accès base (serveur).
 *
 * Source unique réutilisée par : l'endpoint /api/member/integration-progression
 * (dashboard + déblocage Académie) ET la génération du Certificat d'Intégration.
 */
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { isFormationComplete } from './parcours-gating'

export interface IntegrationParcours {
  slug: string
  titre: string
  statut: string
  ordre: number
  total: number
  done: number
  pct: number
  complete: boolean
  locked: boolean
}

export interface IntegrationProgress {
  parcoursId: string | null
  parcours: IntegrationParcours[]
  overall_pct: number
  current_slug: string | null
  next_slug: string | null
  integration_complete: boolean
}

const EMPTY: IntegrationProgress = {
  parcoursId: null, parcours: [], overall_pct: 0, current_slug: null, next_slug: null, integration_complete: false,
}

/** Calcule la progression réelle du Programme d'Intégration pour `uid`. */
export async function getIntegrationProgress(uid: string): Promise<IntegrationProgress> {
  const { data: parc } = await supabaseAdmin.from('parcours').select('id').eq('slug', 'programme-integration').maybeSingle()
  if (!parc?.id) return EMPTY

  const { data: pf } = await supabaseAdmin.from('parcours_formations')
    .select('formation_id, ordre').eq('parcours_id', parc.id).order('ordre', { ascending: true })
  if (!pf || pf.length === 0) return { ...EMPTY, parcoursId: parc.id }

  const fids = pf.map((r: any) => r.formation_id)
  const { data: forms } = await supabaseAdmin.from('formations').select('id, slug, titre, statut').in('id', fids)
  const fById: Record<string, any> = Object.fromEntries((forms || []).map((f: any) => [f.id, f]))

  let totalAll = 0, doneAll = 0
  const parcours: IntegrationParcours[] = []
  for (const row of pf) {
    const f = fById[row.formation_id]
    if (!f) continue
    const { count: total } = await supabaseAdmin.from('formation_modules')
      .select('*', { count: 'exact', head: true }).eq('formation_id', row.formation_id).eq('status', 'published')
    const { count: done } = await supabaseAdmin.from('module_completions')
      .select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('formation_id', row.formation_id)
    const t = total ?? 0, d = done ?? 0
    totalAll += t; doneAll += d
    parcours.push({
      slug: f.slug, titre: f.titre, statut: f.statut, ordre: row.ordre,
      total: t, done: d, pct: t > 0 ? Math.round((d / t) * 100) : 0, complete: isFormationComplete(t, d), locked: false,
    })
  }
  parcours.sort((a, b) => a.ordre - b.ordre)
  parcours.forEach((p, i) => { p.locked = i > 0 ? !parcours[i - 1].complete : false })

  const overall_pct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0
  const integration_complete = parcours.length > 0 && parcours.every((p) => p.complete)
  const current = parcours.find((p) => !p.complete && !p.locked && p.total > 0) || parcours.find((p) => !p.complete) || null
  const next = current ? (parcours.find((p) => p.ordre > current.ordre) || null) : null

  return {
    parcoursId: parc.id, parcours, overall_pct,
    current_slug: current?.slug ?? null, next_slug: next?.slug ?? null, integration_complete,
  }
}

/**
 * Délivre le « Certificat d'Intégration CIER » SI le programme est entièrement
 * terminé (validation réelle). Idempotent : un seul certificat de type
 * « integration » par membre. Renvoie la référence si délivré/existant, sinon null.
 */
export async function ensureIntegrationCertificate(uid: string): Promise<string | null> {
  const prog = await getIntegrationProgress(uid)
  if (!prog.integration_complete) return null

  const { data: existing } = await supabaseAdmin.from('certificats')
    .select('reference').eq('user_id', uid).eq('type', 'integration').maybeSingle()
  if (existing?.reference) return existing.reference

  const { data: prof } = await supabaseAdmin.from('profiles').select('prenom, nom').eq('id', uid).maybeSingle()
  const rand = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  const reference = `CIER-INT-${String(uid).slice(0, 8)}-${rand}`.toUpperCase()
  const { error } = await supabaseAdmin.from('certificats').insert({
    user_id: uid,
    parcours_id: prog.parcoursId,
    type: 'integration',
    titre: 'Certificat d\'Intégration CIER',
    reference,
  })
  if (error) return null
  void prof
  return reference
}
