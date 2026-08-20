/**
 * CITADELLE INTELLIGENCE HUB — HUB-1 (First-party analytics)
 * Exécuteur des specs de comptage (couche IMPURE, service_role only).
 *
 * Les tables analytics/audio/completions sont RLS service_role only : ce module
 * DOIT être appelé côté serveur avec `supabaseAdmin`. Il ne lit AUCUNE ligne
 * (head:true, count exact) ⇒ aucune PII ne transite.
 *
 * Le client est INJECTÉ (port `CountDb`) pour rester testable sans réseau.
 */

import {
  overviewCountSpecs,
  type CountSpec,
  type CountWindow,
  type OverviewCountKey,
  type OverviewCounts,
} from './count-specs'

/** Résultat minimal d'un count PostgREST. */
export interface CountResult {
  count: number | null
  error: { message: string } | null
}

/** Constructeur de requête minimal (chaînable + awaitable). */
export interface CountQueryBuilder extends PromiseLike<CountResult> {
  eq(col: string, val: string): CountQueryBuilder
  in(col: string, vals: string[]): CountQueryBuilder
  gte(col: string, val: string): CountQueryBuilder
}

/** Port minimal du client Supabase pour un comptage. `supabaseAdmin` le satisfait. */
export interface CountDb {
  from(table: string): {
    select(cols: string, opts: { count: 'exact'; head: true }): CountQueryBuilder
  }
}

/** Applique une spec et renvoie le compte (0 si null). Lève sur erreur. */
export async function executeCount(db: CountDb, spec: CountSpec): Promise<number> {
  let q = db.from(spec.table).select('*', { count: 'exact', head: true })
  for (const f of spec.filters) {
    if (f.op === 'eq') q = q.eq(f.col, f.val)
    else if (f.op === 'in') q = q.in(f.col, f.vals)
    else q = q.gte(f.col, f.val)
  }
  const { count, error } = await q
  if (error) {
    throw new Error(`intelligence count failed on ${spec.table}: ${error.message}`)
  }
  return count ?? 0
}

/** Exécute tous les comptages de la Vue générale en parallèle. */
export async function readOverviewCounts(
  db: CountDb,
  window: CountWindow,
): Promise<OverviewCounts> {
  const specs = overviewCountSpecs(window)
  const keys = Object.keys(specs) as OverviewCountKey[]
  const values = await Promise.all(keys.map((k) => executeCount(db, specs[k])))
  const out = {} as OverviewCounts
  keys.forEach((k, i) => {
    out[k] = values[i]
  })
  return out
}
