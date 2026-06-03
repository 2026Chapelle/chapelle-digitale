/**
 * MOTEUR DE PARCOURS — progression & déblocage (logique PURE).
 *
 * Aucune dépendance UI/réseau : les dates sont passées explicitement
 * (`now`) pour rester déterministe et testable. La persistance (Supabase /
 * localStorage) est branchée par-dessus dans la couche cliente.
 */
import {
  type Programme, type ParcoursLevel, flattenSteps, totalSteps, totalXp,
} from './types'

export type StepStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export interface StepProgress {
  stepId: string
  completed: boolean
  /** Dernier score de quiz (0-100). */
  quizScore?: number
  /** Mission de l'étape réalisée. */
  missionDone?: boolean
  /** Entrées de journal par prompt id. */
  journal?: Record<string, string>
  /** ISO date de complétion. */
  completedAt?: string
}

export interface ProgrammeProgress {
  slug: string
  /** ISO date de début (référence des déblocages temporels). */
  startedAt: string
  steps: Record<string, StepProgress>
  /** ISO date du certificat délivré, le cas échéant. */
  certificatAt?: string
}

const DAY_MS = 86_400_000

/** Initialise une progression vierge pour un programme. */
export function startProgramme(slug: string, now: Date): ProgrammeProgress {
  return { slug, startedAt: now.toISOString(), steps: {} }
}

/** Jours entiers écoulés depuis le début du parcours. */
export function daysSinceStart(progress: ProgrammeProgress, now: Date): number {
  const start = new Date(progress.startedAt).getTime()
  return Math.max(0, Math.floor((now.getTime() - start) / DAY_MS))
}

export function isStepCompleted(progress: ProgrammeProgress, stepId: string): boolean {
  return progress.steps[stepId]?.completed === true
}

/**
 * Statut d'une étape donnée, en tenant compte de sa règle de déblocage,
 * de la complétion de l'étape précédente et du déblocage temporel.
 */
export function stepStatus(
  programme: Programme,
  progress: ProgrammeProgress,
  stepId: string,
  now: Date,
): StepStatus {
  const ordered = flattenSteps(programme)
  const idx = ordered.findIndex((s) => s.id === stepId)
  if (idx < 0) return 'locked'
  const step = ordered[idx]

  if (isStepCompleted(progress, stepId)) return 'completed'

  // Déblocage selon la règle.
  let unlocked = false
  const prevDone = idx === 0 || isStepCompleted(progress, ordered[idx - 1].id)
  switch (step.unlock.mode) {
    case 'open':
      unlocked = true
      break
    case 'sequential':
      unlocked = prevDone
      break
    case 'time':
      unlocked = prevDone && daysSinceStart(progress, now) >= (step.unlock.dayOffset ?? 0)
      break
  }
  if (!unlocked) return 'locked'

  const sp = progress.steps[stepId]
  const partiel = !!sp && (sp.quizScore != null || sp.missionDone || (sp.journal && Object.keys(sp.journal).length > 0))
  return partiel ? 'in_progress' : 'available'
}

/** Statuts de toutes les étapes (map stepId → statut). */
export function computeStatuses(programme: Programme, progress: ProgrammeProgress, now: Date): Record<string, StepStatus> {
  const out: Record<string, StepStatus> = {}
  for (const s of flattenSteps(programme)) out[s.id] = stepStatus(programme, progress, s.id, now)
  return out
}

/** Première étape sur laquelle l'utilisateur doit agir (in_progress sinon available). */
export function currentStepId(programme: Programme, progress: ProgrammeProgress, now: Date): string | null {
  const ordered = flattenSteps(programme)
  const statuses = computeStatuses(programme, progress, now)
  return (
    ordered.find((s) => statuses[s.id] === 'in_progress')?.id ??
    ordered.find((s) => statuses[s.id] === 'available')?.id ??
    null
  )
}

/** Nombre d'étapes complétées. */
export function completedCount(programme: Programme, progress: ProgrammeProgress): number {
  return flattenSteps(programme).filter((s) => isStepCompleted(progress, s.id)).length
}

/** Progression en pourcentage (0-100), arrondie. */
export function programmeProgressPct(programme: Programme, progress: ProgrammeProgress): number {
  const total = totalSteps(programme)
  if (total === 0) return 0
  return Math.round((completedCount(programme, progress) / total) * 100)
}

/** XP cumulée par les étapes complétées. */
export function xpEarned(programme: Programme, progress: ProgrammeProgress): number {
  return flattenSteps(programme).filter((s) => isStepCompleted(progress, s.id)).reduce((n, s) => n + (s.xp || 0), 0)
}

/** XP total atteignable (proxy vers types.totalXp). */
export function xpTotal(programme: Programme): number {
  return totalXp(programme)
}

/** Un niveau est-il validé ? (toutes étapes + score moyen quiz si requis) */
export function isLevelValidated(level: ParcoursLevel, progress: ProgrammeProgress): boolean {
  const v = level.validation ?? {}
  const toutes = v.toutesEtapes !== false
  if (toutes && !level.steps.every((s) => isStepCompleted(progress, s.id))) return false

  if (v.scoreMinMoyen != null) {
    const scores = level.steps
      .filter((s) => s.quiz)
      .map((s) => progress.steps[s.id]?.quizScore ?? 0)
    if (scores.length > 0) {
      const moyenne = scores.reduce((a, b) => a + b, 0) / scores.length
      if (moyenne < v.scoreMinMoyen) return false
    }
  }
  return true
}

/** Le programme entier est-il complété ? */
export function isProgrammeCompleted(programme: Programme, progress: ProgrammeProgress): boolean {
  return flattenSteps(programme).every((s) => isStepCompleted(progress, s.id))
}

/** Le membre est-il éligible au certificat final ? */
export function certificateEligible(programme: Programme, progress: ProgrammeProgress): boolean {
  if (!programme.delivreCertificat) return false
  return programme.niveaux.every((l) => isLevelValidated(l, progress))
}

/** Rang/niveau courant affichable (libellé) — utile pour Mahanaïm. */
export function currentRangLabel(programme: Programme, progress: ProgrammeProgress): string {
  const labels = programme.rangs ?? programme.niveaux.map((l) => l.titre)
  const validated = programme.niveaux.filter((l) => isLevelValidated(l, progress)).length
  const idx = Math.min(validated, labels.length - 1)
  return labels[idx] ?? labels[0] ?? ''
}

// ── Mutations immuables (aident la couche persistance) ──────────────────────

/** Enregistre le score d'un quiz pour une étape. */
export function setQuizScore(progress: ProgrammeProgress, stepId: string, score: number): ProgrammeProgress {
  const prev = progress.steps[stepId] ?? { stepId, completed: false }
  return { ...progress, steps: { ...progress.steps, [stepId]: { ...prev, quizScore: score } } }
}

/** Enregistre une entrée de journal. */
export function setJournalEntry(progress: ProgrammeProgress, stepId: string, promptId: string, texte: string): ProgrammeProgress {
  const prev = progress.steps[stepId] ?? { stepId, completed: false }
  return {
    ...progress,
    steps: { ...progress.steps, [stepId]: { ...prev, journal: { ...(prev.journal ?? {}), [promptId]: texte } } },
  }
}

/** Marque une mission comme réalisée. */
export function markMissionDone(progress: ProgrammeProgress, stepId: string): ProgrammeProgress {
  const prev = progress.steps[stepId] ?? { stepId, completed: false }
  return { ...progress, steps: { ...progress.steps, [stepId]: { ...prev, missionDone: true } } }
}

/** Marque une étape comme complétée. */
export function markStepComplete(progress: ProgrammeProgress, stepId: string, now: Date, quizScore?: number): ProgrammeProgress {
  const prev = progress.steps[stepId] ?? { stepId, completed: false }
  return {
    ...progress,
    steps: {
      ...progress.steps,
      [stepId]: { ...prev, completed: true, completedAt: now.toISOString(), ...(quizScore != null ? { quizScore } : {}) },
    },
  }
}
