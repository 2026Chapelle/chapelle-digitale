/**
 * Statistiques admin « Nouveau Venu » — dérivées de public.newcomer_intakes (V2.2-A).
 *
 *  - `computeNewcomerStats(rows, now?, previewLimit?)` : fonction PURE (aucune I/O)
 *    → testable en isolation (cf. src/lib/pastoral/__tests__/newcomer-intakes.test.ts).
 *  - `getNewcomerAdminStats()` : wrapper SERVEUR (service role via supabaseAdmin) qui
 *    lit la table (bornée, lecture seule) puis délègue à la fonction pure.
 *
 * ⚠️ Ce module importe `supabaseAdmin` : SERVEUR UNIQUEMENT. Ne jamais l'importer
 * dans un composant client. Aucune donnée sensible superflue n'est lue ici
 * (ni téléphone ni email) : seulement de quoi compter et afficher un aperçu.
 */
import { supabaseAdmin } from '@/lib/supabase'

// Statuts réels (miroir du CHECK SQL de newcomer_intakes / de l'API admin).
export const NEWCOMER_STATUSES = ['new', 'to_review', 'contacted', 'converted', 'duplicate', 'archived'] as const
export type NewcomerStatus = (typeof NEWCOMER_STATUSES)[number]

export interface NewcomerIntakeRow {
  id: string
  prenom: string | null
  nom: string | null
  source: string | null
  status: string | null
  created_at: string | null
}

export interface NewcomerPreview {
  id: string
  prenom: string
  nom: string | null
  source: string | null
  status: string
  created_at: string | null
}

export interface NewcomerStats {
  total: number
  by_status: Record<NewcomerStatus, number>
  a_traiter: number   // new + to_review + contacted (encore à suivre)
  nouveaux_7j: number
  nouveaux_30j: number
  contactes: number   // contacted
  integres: number    // converted
  derniers: NewcomerPreview[]
}

const DAY = 24 * 60 * 60 * 1000

function emptyByStatus(): Record<NewcomerStatus, number> {
  return { new: 0, to_review: 0, contacted: 0, converted: 0, duplicate: 0, archived: 0 }
}

/**
 * Agrège des lignes newcomer_intakes en statistiques cockpit. PURE.
 * @param rows        lignes brutes (au minimum status + created_at)
 * @param now         horodatage de référence (ms) — injecté pour des tests déterministes
 * @param previewLimit nombre de « dernières demandes » renvoyées (défaut 5)
 */
export function computeNewcomerStats(
  rows: NewcomerIntakeRow[],
  now: number = Date.now(),
  previewLimit = 5,
): NewcomerStats {
  const list = rows || []
  const by_status = emptyByStatus()
  let nouveaux_7j = 0
  let nouveaux_30j = 0

  for (const r of list) {
    const s = (r?.status || '') as NewcomerStatus
    if (s in by_status) by_status[s]++
    const t = r?.created_at ? Date.parse(r.created_at) : NaN
    if (!Number.isNaN(t)) {
      const age = now - t
      if (age <= 7 * DAY) nouveaux_7j++
      if (age <= 30 * DAY) nouveaux_30j++
    }
  }

  const derniers: NewcomerPreview[] = [...list]
    .filter((r) => r && r.id)
    .sort((a, b) => (Date.parse(b?.created_at || '') || 0) - (Date.parse(a?.created_at || '') || 0))
    .slice(0, Math.max(0, previewLimit))
    .map((r) => ({
      id: r.id,
      prenom: (r.prenom || '').trim() || '—',
      nom: r.nom,
      source: r.source,
      status: r.status || 'new',
      created_at: r.created_at,
    }))

  return {
    total: list.length,
    by_status,
    a_traiter: by_status.new + by_status.to_review + by_status.contacted,
    nouveaux_7j,
    nouveaux_30j,
    contactes: by_status.contacted,
    integres: by_status.converted,
    derniers,
  }
}

// Colonnes minimales (aucune donnée sensible superflue : ni téléphone ni email).
const STATS_COLS = 'id, prenom, nom, source, status, created_at'

/**
 * Lit newcomer_intakes (service role, borné, lecture seule) et renvoie les stats
 * cockpit. SERVEUR UNIQUEMENT. Lève une erreur si la requête échoue.
 */
export async function getNewcomerAdminStats(previewLimit = 5): Promise<NewcomerStats> {
  const { data, error } = await supabaseAdmin
    .from('newcomer_intakes')
    .select(STATS_COLS)
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) throw new Error(error.message)
  return computeNewcomerStats((data || []) as NewcomerIntakeRow[], Date.now(), previewLimit)
}
