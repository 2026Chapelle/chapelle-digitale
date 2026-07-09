/**
 * Triage pastoral des demandes « Nouveau Venu » (V2.6-A) — logique PURE.
 *
 * Transforme le TEMPS (champs existants created_at / processed_at) en signal d'action.
 * Aucune dépendance Supabase / React, aucune écriture, aucun champ inventé : tout est
 * dérivé de colonnes déjà présentes dans public.newcomer_intakes. Testable en isolation.
 *
 * Seuils pastoraux (V2.6-A) : « En retard » > 2 j sans contact ; « À relancer » > 5 j
 * après contact sans conversion.
 */
export const OVERDUE_DAYS = 2
export const FOLLOWUP_DAYS = 5

/** Statuts groupés en 3 phases pastorales. */
export type TriageBucket = 'todo' | 'inprogress' | 'closed'

/** Entrée minimale attendue (structurelle) — sous-ensemble d'un Intake. */
export interface TriageInput {
  status: string
  created_at: string
  processed_at?: string | null
  intake_payload?: unknown
}

export interface TriageResult {
  ageDays: number // jours écoulés depuis created_at (>= 0)
  bucket: TriageBucket
  isOverdue: boolean // à contacter et en attente depuis > OVERDUE_DAYS
  followUpDue: boolean // contacté depuis > FOLLOWUP_DAYS sans conversion
  sinceContactDays: number | null // jours depuis processed_at (si présent), sinon null
}

const DAY_MS = 86_400_000

const TODO_STATUS = new Set(['new', 'to_review'])
const CLOSED_STATUS = new Set(['converted', 'duplicate', 'archived'])

/** Jours pleins écoulés entre un ISO et « maintenant » (ms). 0 si date absente/invalide ou future. */
export function daysSince(iso: string | null | undefined, nowMs: number): number {
  if (!iso || typeof iso !== 'string') return 0
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 0
  const diff = nowMs - t
  if (diff <= 0) return 0
  return Math.floor(diff / DAY_MS)
}

/** Phase pastorale d'un statut. */
export function bucketOf(status: string): TriageBucket {
  if (TODO_STATUS.has(status)) return 'todo'
  if (CLOSED_STATUS.has(status)) return 'closed'
  return 'inprogress' // 'contacted' et tout statut non fermé/non-todo
}

/** Extrait « Comment nous a connus » depuis intake_payload.heard_from (sûr). */
export function heardFrom(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const v = (payload as Record<string, unknown>).heard_from
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Triage complet d'une demande à l'instant nowMs. */
export function triageNewcomer(intake: TriageInput, nowMs: number): TriageResult {
  const bucket = bucketOf(intake.status)
  const ageDays = daysSince(intake.created_at, nowMs)
  const sinceContactDays = intake.processed_at ? daysSince(intake.processed_at, nowMs) : null
  const isOverdue = bucket === 'todo' && ageDays > OVERDUE_DAYS
  const followUpDue =
    intake.status === 'contacted' && sinceContactDays !== null && sinceContactDays > FOLLOWUP_DAYS
  return { ageDays, bucket, isOverdue, followUpDue, sinceContactDays }
}

/** Poids d'affichage par phase (plus petit = remonte en premier). */
function bucketWeight(bucket: TriageBucket): number {
  return bucket === 'todo' ? 0 : bucket === 'inprogress' ? 1 : 2
}

/**
 * Comparateur « priorité pastorale » : d'abord les demandes à traiter, puis en cours,
 * puis closes ; à phase égale, les PLUS ANCIENNES d'abord (les en-retard remontent
 * naturellement). Déterministe.
 */
export function compareByPastoralUrgency(a: TriageInput, b: TriageInput, nowMs: number): number {
  const wa = bucketWeight(bucketOf(a.status))
  const wb = bucketWeight(bucketOf(b.status))
  if (wa !== wb) return wa - wb
  // À phase égale : plus ancien (created_at le plus petit) d'abord.
  const ta = Date.parse(a.created_at) || 0
  const tb = Date.parse(b.created_at) || 0
  return ta - tb
}

export interface TriageSummary {
  toContact: number // phase todo (new + to_review)
  overdue: number // sous-ensemble en retard
  inProgress: number // contacté (phase inprogress)
  followUpDue: number // sous-ensemble à relancer
  integrated: number // status === 'converted'
  total: number
}

/** Compteurs pastoraux agrégés sur une liste. */
export function summarizeTriage(list: TriageInput[], nowMs: number): TriageSummary {
  const s: TriageSummary = { toContact: 0, overdue: 0, inProgress: 0, followUpDue: 0, integrated: 0, total: 0 }
  for (const it of list || []) {
    if (!it) continue
    s.total += 1
    const t = triageNewcomer(it, nowMs)
    if (t.bucket === 'todo') s.toContact += 1
    if (t.isOverdue) s.overdue += 1
    if (t.bucket === 'inprogress') s.inProgress += 1
    if (t.followUpDue) s.followUpDue += 1
    if (it.status === 'converted') s.integrated += 1
  }
  return s
}

/** Libellé relatif court en français à partir d'un nombre de jours. */
export function relativeDaysLabel(days: number): string {
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}
