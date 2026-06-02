// src/lib/global-intelligence.ts
// ----------------------------------------------------------------------------
// CENTRE DE COMMANDEMENT APOSTOLIQUE GLOBAL (V5) — logique PURE, sans I/O.
// Consolide les sorties des 9 capacités mondiales (vision, gouvernement par
// antenne, santé spirituelle, croissance, finances, IA prédictive, alertes
// prophétiques, crise, mission) en indices et synthèses pour la console mondiale.
//
// Aucune dépendance Supabase : la route /api/admin/global-command appelle les
// RPC SET-BASED (world_overview, finance_aggregate, crisis_overview, …) et
// passe ici des données déjà agrégées. Réutilise les conventions de
// pastoral-intelligence.ts (logique pure, FR, testable). Zéro donnée inventée.

import type { EngagementLevel } from '@/lib/pastoral-intelligence'

// ── Sévérité commune à toutes les sources d'alerte mondiales ──
export type Severite = 'critique' | 'haute' | 'moyenne' | 'info'
export const SEV_ORDER: Record<Severite, number> = { critique: 0, haute: 1, moyenne: 2, info: 3 }
export const SEV_COLOR: Record<Severite, string> = {
  critique: '#EF4444', haute: '#F59E0B', moyenne: '#EAB308', info: '#0EA5E9',
}

/** Alerte mondiale normalisée (issue de n'importe quelle capacité). */
export interface GlobalAlert {
  source: 'prophetique' | 'finance' | 'sante' | 'croissance' | 'antenne' | 'crise'
  severite: Severite
  titre: string
  scope: string | null      // pays / antenne / 'monde'
  detail?: string
  created_at?: string | null
}

/** Normalise une sévérité texte libre vers l'échelle commune. */
export function toSeverite(v: unknown): Severite {
  const s = String(v || '').toLowerCase()
  if (['critique', 'critical', 'tres_urgent', 'urgent'].includes(s)) return 'critique'
  if (['haute', 'high', 'important', 'eleve', 'élevé'].includes(s)) return 'haute'
  if (['moyenne', 'medium', 'moyen', 'warning'].includes(s)) return 'moyenne'
  return 'info'
}

/** Rollup des alertes par sévérité (pour les badges de la console mondiale). */
export function rollupAlerts(alerts: GlobalAlert[]): { counts: Record<Severite, number>; total: number; top: GlobalAlert[] } {
  const counts: Record<Severite, number> = { critique: 0, haute: 0, moyenne: 0, info: 0 }
  for (const a of alerts) counts[a.severite]++
  const top = [...alerts].sort((x, y) => SEV_ORDER[x.severite] - SEV_ORDER[y.severite]).slice(0, 20)
  return { counts, total: alerts.length, top }
}

// ── Indice de santé spirituelle mondiale ──
// Pondère la répartition des paliers d'engagement en un score 0-100 par territoire,
// puis agrège en un indice mondial pondéré par le nombre de membres.
const LEVEL_WEIGHT: Record<EngagementLevel, number> = {
  tres_engage: 100, engage: 80, stable: 60, a_suivre: 40, en_risque: 20, inactif: 0,
}

export interface HealthRow {
  scope_key: string                 // pays ou antenne
  membres: number
  niveaux: Partial<Record<EngagementLevel, number>>   // comptes par palier
}
export interface HealthIndex {
  scope_key: string
  membres: number
  indice: number                    // 0-100
  tendance?: 'hausse' | 'stable' | 'baisse'
}

/** Indice de santé d'un territoire (moyenne pondérée des paliers d'engagement). */
export function healthIndex(row: HealthRow): number {
  const entries = Object.entries(row.niveaux) as [EngagementLevel, number][]
  const tot = entries.reduce((s, [, n]) => s + (n || 0), 0)
  if (!tot) return 0
  const sum = entries.reduce((s, [lvl, n]) => s + LEVEL_WEIGHT[lvl] * (n || 0), 0)
  return Math.round(sum / tot)
}

/** Indice mondial = moyenne des indices territoriaux pondérée par les membres. */
export function worldHealthIndex(rows: HealthRow[]): { indice: number; parTerritoire: HealthIndex[] } {
  const parTerritoire = rows.map((r) => ({ scope_key: r.scope_key, membres: r.membres, indice: healthIndex(r) }))
  const totM = parTerritoire.reduce((s, r) => s + r.membres, 0)
  const indice = totM ? Math.round(parTerritoire.reduce((s, r) => s + r.indice * r.membres, 0) / totM) : 0
  return { indice, parTerritoire: parTerritoire.sort((a, b) => a.indice - b.indice) } // plus fragiles en tête
}

/** Libellé qualitatif d'un indice de santé. */
export function healthLabel(indice: number): { label: string; color: string } {
  if (indice >= 75) return { label: 'Florissante', color: '#22C55E' }
  if (indice >= 55) return { label: 'Saine', color: '#84CC16' }
  if (indice >= 40) return { label: 'À consolider', color: '#EAB308' }
  if (indice >= 25) return { label: 'Fragile', color: '#F59E0B' }
  return { label: 'En déclin', color: '#EF4444' }
}

// ── Consolidation finances multi-devises (jamais d'addition inter-devises) ──
export function consolidateDevises(rows: { devise: string; montant: number }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows || []) {
    const d = String(r.devise || 'FCFA').toUpperCase()
    out[d] = (out[d] || 0) + (Number(r.montant) || 0)
  }
  return out
}

// ── Pouls global de la console mondiale ──
export interface GlobalPulse {
  sante_indice: number
  sante_label: string
  sante_color: string
  alertes: { counts: Record<Severite, number>; total: number }
  attention: number            // critiques + hautes (ce qui exige une décision apostolique)
}

/** Assemble le pouls global affiché en tête de la console mondiale. */
export function globalPulse(health: { indice: number }, alerts: GlobalAlert[]): GlobalPulse {
  const { counts, total } = rollupAlerts(alerts)
  const lab = healthLabel(health.indice)
  return {
    sante_indice: health.indice,
    sante_label: lab.label,
    sante_color: lab.color,
    alertes: { counts, total },
    attention: counts.critique + counts.haute,
  }
}
