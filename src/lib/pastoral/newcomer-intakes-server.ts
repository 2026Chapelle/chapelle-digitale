/**
 * Statistiques admin « Nouveau Venu » — dérivées de public.newcomer_intakes (V2.2-A + Lot 2-A).
 *
 *  - `computeNewcomerStats(rows, now?, previewLimit?)` : fonction PURE (aucune I/O)
 *    → testable en isolation (cf. src/lib/pastoral/__tests__/newcomer-intakes.test.ts).
 *  - `getNewcomerAdminStats(organizationId, …)` : wrapper SERVEUR tenant-scoped
 *    (service role) qui lit la table (bornée, lecture seule) puis délègue à la pure.
 *
 * ⚠️ organizationId obligatoire. Ce module importe `supabaseAdmin` via le repository :
 * SERVEUR UNIQUEMENT. Ni téléphone ni email : seulement de quoi compter et un aperçu.
 */

import {
  getNewcomerIntakesRepository,
} from '@/lib/pastoral/newcomer-admin-client'
import { requireOrganizationId } from '@/lib/pastoral/newcomer-organization-id'

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
 * Lit newcomer_intakes pour UN tenant (service role, borné, lecture seule).
 * SERVEUR UNIQUEMENT. organizationId obligatoire (Lot 2-A).
 */
export async function getNewcomerAdminStats(
  organizationId: unknown,
  previewLimit = 5,
): Promise<NewcomerStats> {
  const orgId = requireOrganizationId(organizationId)
  const repo = getNewcomerIntakesRepository()
  const data = await repo.listForOrganization(orgId, {
    columns: STATS_COLS,
    limit: 2000,
  })
  return computeNewcomerStats(data as unknown as NewcomerIntakeRow[], Date.now(), previewLimit)
}
