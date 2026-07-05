/**
 * MÉTRIQUES PASTORALES — calculs PURS (aucune dépendance réseau/UI).
 * Réutilisés par l'overview /admin/pastoral. Testables.
 */

/** Au-delà de ce nombre de jours sans connexion, un membre est « inactif ». */
export const INACTIVE_DAYS = 30

export type ActivityClass = 'actif' | 'inactif' | 'jamais'

export type EngagementBand = 'faible' | 'en croissance' | 'engagé' | 'très engagé'

/** Bande d'engagement à partir d'un score 0-100 (réel, jamais inventé). */
export function engagementBand(score: number): EngagementBand {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)))
  if (s >= 76) return 'très engagé'
  if (s >= 51) return 'engagé'
  if (s >= 26) return 'en croissance'
  return 'faible'
}

/** Classe un membre selon sa dernière connexion par rapport à `nowMs`. */
export function classifyActivity(derniereConnexion: string | null | undefined, nowMs: number): ActivityClass {
  if (!derniereConnexion) return 'jamais'
  const t = new Date(derniereConnexion).getTime()
  if (Number.isNaN(t)) return 'jamais'
  const days = (nowMs - t) / 86_400_000
  return days <= INACTIVE_DAYS ? 'actif' : 'inactif'
}

export interface Repartition { label: string; count: number }

/** Répartition (comptage) par clé, triée décroissante. Valeurs vides → « — ». */
export function repartition<T>(items: T[], key: (t: T) => string | null | undefined): Repartition[] {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = (key(it) || '').toString().trim() || '—'
    m.set(k, (m.get(k) || 0) + 1)
  }
  return Array.from(m.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}` }

/** Numéro de semaine ISO-8601 d'une date. */
export function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return `${date.getUTCFullYear()}-S${pad2(week)}`
}

/** Courbe de croissance : nombre d'éléments par période (semaine ou mois). */
export function bucketGrowth(dates: (string | null | undefined)[], granularity: 'week' | 'month'): { period: string; count: number }[] {
  const m = new Map<string, number>()
  for (const ds of dates) {
    if (!ds) continue
    const dt = new Date(ds)
    if (Number.isNaN(dt.getTime())) continue
    const period = granularity === 'month'
      ? `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`
      : isoWeekKey(dt)
    m.set(period, (m.get(period) || 0) + 1)
  }
  return Array.from(m.entries()).map(([period, count]) => ({ period, count })).sort((a, b) => a.period.localeCompare(b.period))
}

function periodKey(ds: string, granularity: 'week' | 'month'): string | null {
  const dt = new Date(ds)
  if (Number.isNaN(dt.getTime())) return null
  return granularity === 'month' ? `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}` : isoWeekKey(dt)
}

/**
 * P4 — Conversions de statut par période, ventilées par statut d'arrivée (PUR).
 * Réutilise le découpage temporel de bucketGrowth.
 */
export function conversionsOverTime(
  rows: { nouveau_statut?: string | null; created_at?: string | null }[],
  granularity: 'week' | 'month',
): { period: string; total: number; byStatut: Record<string, number> }[] {
  const periods = new Map<string, { total: number; byStatut: Record<string, number> }>()
  for (const r of rows) {
    if (!r.created_at) continue
    const period = periodKey(r.created_at, granularity)
    if (!period) continue
    const statut = (r.nouveau_statut || '—').toString()
    const b = periods.get(period) || { total: 0, byStatut: {} }
    b.total++
    b.byStatut[statut] = (b.byStatut[statut] || 0) + 1
    periods.set(period, b)
  }
  return Array.from(periods.entries())
    .map(([period, v]) => ({ period, total: v.total, byStatut: v.byStatut }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

/** P4 — Transitions de statut les plus fréquentes (ancien → nouveau), triées (PUR). */
export function topTransitions(
  rows: { ancien_statut?: string | null; nouveau_statut?: string | null }[],
  limit = 8,
): { from: string; to: string; count: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const from = (r.ancien_statut || '—').toString()
    const to = (r.nouveau_statut || '—').toString()
    m.set(`${from}→${to}`, (m.get(`${from}→${to}`) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([k, count]) => { const [from, to] = k.split('→'); return { from, to, count } })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
