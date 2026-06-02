import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Agrégats par nation — source unique partagée par :
 *  - /api/member/nation  (gardé par SESSION, portée imposée par rôle/affectation)
 *  - /api/admin/nation   (gardé par cookie admin = super_admin, ?pays libre)
 *
 * scopePays = null → toutes les nations (super_admin). Cure d'âme = COMPTAGE seul.
 */
export interface NationStats {
  inscrits: number; membres: number; responsables: number; prieres: number
  cure_ame: number; dons: number; formations: number; live_views: number; evenements: number
}

async function countIn(table: string, ids: string[] | null, col = 'user_id', extra?: (q: any) => any): Promise<number> {
  try {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    if (ids) { if (ids.length === 0) return 0; q = q.in(col, ids) }
    if (extra) q = extra(q)
    const { count } = await q
    return count ?? 0
  } catch { return 0 }
}

export async function nationStats(scopePays: string | null): Promise<NationStats> {
  let ids: string[] | null = null
  let inscrits = 0, membres = 0, responsables = 0
  try {
    let pq = supabaseAdmin.from('profiles').select('id, membre_statut, role')
    if (scopePays) pq = pq.ilike('pays', scopePays)
    const { data } = await pq
    const rows = (data || []) as any[]
    ids = scopePays ? rows.map((r) => r.id) : null
    inscrits = scopePays ? rows.length : await countIn('profiles', null)
    membres = scopePays
      ? rows.filter((r) => ['membre', 'fidele', 'actif'].includes(r.membre_statut)).length
      : await countIn('profiles', null, 'membre_statut', (q) => q.in('membre_statut', ['membre', 'fidele', 'actif']))
    responsables = scopePays
      ? rows.filter((r) => ['nation_pastor', 'platform_admin', 'responsable_integration', 'coordinateur', 'pasteur'].includes(r.role)).length
      : 0
  } catch { /* */ }

  const prieres = scopePays
    ? await countIn('priere_demandes', null, 'user_id', (q) => q.ilike('pays', scopePays))
    : await countIn('priere_demandes', null)
  const cure_ame = await countIn('delivrance_demandes', ids)
  const dons = await countIn('dons', ids)
  const formations = await countIn('inscriptions_formation', ids)
  const live_views = await countIn('activity_logs', ids, 'user_id', (q) => q.eq('action_type', 'live_view'))
  const evenements = scopePays
    ? await countIn('cms_events', null, 'id', (q) => q.ilike('location', `%${scopePays}%`).eq('status', 'published'))
    : await countIn('cms_events', null, 'id', (q) => q.eq('status', 'published'))

  return { inscrits, membres, responsables, prieres, cure_ame, dons, formations, live_views, evenements }
}

/** Liste des nations connues (depuis profiles.pays). */
export async function listNations(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin.from('profiles').select('pays')
    return Array.from(new Set((data || []).map((r: any) => (r.pays || '').trim()).filter(Boolean))).sort()
  } catch { return [] }
}
