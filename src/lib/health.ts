/**
 * Moteur d'ANALYSE SPIRITUELLE — logique pure (sans I/O), testable & réutilisable.
 *
 * - Indice de santé spirituelle  → 🟢 Engagé · 🟡 À suivre · 🟠 Fragile · 🔴 À réengager
 * - Classification automatique    → visiteur · inscrit · fidèle · membre · responsable
 *
 * Calculé à partir de signaux RÉELS (prières, formations, événements, récence).
 * Aucune donnée inventée : un membre sans activité reste « inscrit / à réengager ».
 */

export interface MemberActivity {
  prayers: number
  completions: number
  events: number
  formationsTerminees: number
  scoreEngagement: number
  /** Jours depuis la dernière activité connue (null = aucune activité). */
  lastActivityDays: number | null
  accountAgeDays: number
  role?: string | null
  estMembre?: boolean
  membreStatut?: string | null
}

export type HealthColor = 'vert' | 'jaune' | 'orange' | 'rouge'
export interface HealthResult { color: HealthColor; label: string; score: number }

const RESPONSABLE_ROLES = new Set([
  'admin', 'pasteur', 'formateur', 'responsable_integration',
  'responsable_mahanaim', 'coordinateur', 'responsable',
])

/** Indice de santé spirituelle (0-100) + couleur d'alerte pastorale. */
export function healthIndex(a: MemberActivity): HealthResult {
  // Volume d'engagement (plafonné), pondéré.
  const volume =
    Math.min(a.prayers, 10) * 3 +
    Math.min(a.completions, 20) * 2 +
    Math.min(a.events, 10) * 3 +
    Math.min(a.formationsTerminees, 5) * 6 +
    Math.min(Math.max(a.scoreEngagement, 0), 100) * 0.25

  // Récence : forte pénalité d'inactivité (cœur de l'alerte pastorale).
  let recence = 0
  const d = a.lastActivityDays
  if (d === null) recence = 0
  else if (d <= 7) recence = 40
  else if (d <= 30) recence = 28
  else if (d <= 60) recence = 14
  else recence = 4

  const score = Math.round(Math.min(volume, 60) + recence)

  // Règles d'alerte (priment sur le score pur).
  if (d === null && a.accountAgeDays > 30) return { color: 'rouge', label: 'À réengager', score }
  if (d !== null && d > 60) return { color: 'rouge', label: 'À réengager', score }
  if (d !== null && d > 30) return { color: 'orange', label: 'Fragile', score }
  if (score >= 55) return { color: 'vert', label: 'Engagé', score }
  if (score >= 30) return { color: 'jaune', label: 'À suivre', score }
  return { color: 'orange', label: 'Fragile', score }
}

export type Classification = 'visiteur' | 'inscrit' | 'fidele' | 'membre' | 'responsable'

const CLASS_LABEL: Record<Classification, string> = {
  visiteur: 'Visiteur', inscrit: 'Inscrit', fidele: 'Fidèle', membre: 'Membre', responsable: 'Responsable',
}
export const classificationLabel = (c: Classification) => CLASS_LABEL[c]

/**
 * Classification automatique d'un membre selon des règles métier.
 * Évolutive : recalculée à chaque analyse à partir des signaux réels.
 */
export function classify(a: MemberActivity): Classification {
  if (a.role && RESPONSABLE_ROLES.has(a.role)) return 'responsable'

  // Membre : intégration terminée OU statut validé manuellement OU socle d'engagement.
  if (a.estMembre || a.membreStatut === 'membre') return 'membre'
  if (a.formationsTerminees >= 1 && a.prayers >= 1) return 'membre'

  // Fidèle : activité régulière et récente (au moins 2 types de signaux récents).
  const recent = a.lastActivityDays !== null && a.lastActivityDays <= 30
  const signaux = (a.prayers > 0 ? 1 : 0) + (a.completions > 0 ? 1 : 0) + (a.events > 0 ? 1 : 0)
  if (recent && signaux >= 2) return 'fidele'
  if (recent && (a.scoreEngagement >= 40 || signaux >= 1)) return 'fidele'

  return 'inscrit'
}
