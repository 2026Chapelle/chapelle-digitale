/**
 * MOTEUR DE PARCOURS — modèle de domaine générique (Citadelle).
 *
 * Citadelle est une plateforme de TRANSFORMATION, pas de consommation de vidéos.
 * Ce moteur modélise tout parcours progressif de l'œuvre — il accueille sans
 * refonte : Parcours d'Intégration (7 jours), Académie des Élus (6 niveaux ×
 * 20 modules, sous CFIC), Mahanaïm (5 rangs), Écoles des Serviteurs / Leaders,
 * Instituts, Discipolat, Ministères.
 *
 * Chaque parcours peut intégrer : progression, étapes débloquées (séquentiel +
 * déblocage dans le temps), journal personnel, quiz, missions, badges,
 * certificats et validation de niveau.
 *
 * Module PUR (aucune dépendance UI/réseau) → testable et réutilisable côté
 * serveur comme client. La persistance est branchée séparément (voir progress.ts).
 */
import type { PlatformeId } from '@/types'

// ────────────────────────────────────────────────────────────────────────────
// Contenu pédagogique
// ────────────────────────────────────────────────────────────────────────────

/** Bloc de contenu d'une étape. Extensible (bibliothèque, masterclass…). */
export type ContentBlock =
  | { type: 'scripture'; ref: string; texte: string }
  | { type: 'teaching'; titre?: string; markdown: string }
  | { type: 'video'; provider: 'youtube' | 'url'; src: string; titre?: string; dureeMin?: number }
  | { type: 'audio'; src: string; titre?: string; dureeMin?: number }
  | { type: 'declaration'; texte: string }
  | { type: 'callout'; ton: 'or' | 'info' | 'avertissement'; markdown: string }

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  /** Index (0-based) de la bonne réponse dans `options`. */
  correct: number
  explication?: string
}

export interface Quiz {
  questions: QuizQuestion[]
  /** Score minimal (0-100) pour valider l'étape. Défaut 70. */
  seuilReussite: number
}

export type MissionType = 'action' | 'priere' | 'partage' | 'lecture' | 'relation' | 'service'

export interface Mission {
  id: string
  titre: string
  description: string
  type: MissionType
  /** auto : validée par une action tracée ; declarative : l'utilisateur confirme. */
  verification: 'auto' | 'declarative'
}

/** Invite de journal personnel (réflexion guidée). */
export interface JournalPrompt {
  id: string
  prompt: string
}

// ────────────────────────────────────────────────────────────────────────────
// Déblocage
// ────────────────────────────────────────────────────────────────────────────

/**
 * Règle de déblocage d'une étape.
 *  - 'open'       : toujours accessible.
 *  - 'sequential' : accessible quand l'étape précédente est complétée.
 *  - 'time'       : séquentiel ET accessible `dayOffset` jours après l'inscription
 *                   (parcours « Jour 1 → Jour 7 », déblocage dans le temps).
 */
export interface UnlockRule {
  mode: 'open' | 'sequential' | 'time'
  /** Pour mode 'time' : nombre de jours après le début du parcours. */
  dayOffset?: number
}

// ────────────────────────────────────────────────────────────────────────────
// Étape · Niveau · Programme
// ────────────────────────────────────────────────────────────────────────────

/** Une étape = un « jour » (intégration) ou un « module » (académie). */
export interface ParcoursStep {
  id: string
  ordre: number
  titre: string
  sousTitre?: string
  resume: string
  dureeMin?: number
  contenu: ContentBlock[]
  quiz?: Quiz
  mission?: Mission
  journal?: JournalPrompt[]
  /** Expérience gagnée à la complétion (gamification de la croissance). */
  xp: number
  /** Badge décerné à la complétion de cette étape (id de badge). */
  badgeId?: string
  unlock: UnlockRule
  /** Contenu rédigé vs. à venir (honnêteté : pas de faux contenu). */
  status?: 'published' | 'planned'
}

/**
 * Validation de niveau : conditions pour valider un niveau et, le cas échéant,
 * débloquer le niveau suivant / délivrer un certificat.
 */
export interface LevelValidation {
  /** Toutes les étapes doivent être complétées (défaut true). */
  toutesEtapes?: boolean
  /** Score moyen minimal aux quiz du niveau (0-100). */
  scoreMinMoyen?: number
}

/** Un niveau regroupe des étapes (ex. Académie : 6 niveaux × 20 modules). */
export interface ParcoursLevel {
  id: string
  ordre: number
  titre: string
  theme: string
  description: string
  couleur?: string
  steps: ParcoursStep[]
  validation?: LevelValidation
  /** Certificat délivré à la validation du niveau (id de certificat/modèle). */
  certificatId?: string
}

export type ProgrammeType =
  | 'integration' | 'academie' | 'mahanaim' | 'ecole' | 'institut' | 'discipolat' | 'ministere'

/** Un programme de transformation complet. */
export interface Programme {
  slug: string
  titre: string
  sousTitre?: string
  description: string
  type: ProgrammeType
  /** Plateforme porteuse (CFIC, Mahanaïm…). */
  plateforme: PlatformeId
  /** Programme parent éventuel (ex. l'Académie est rattachée au CFIC). */
  parent?: 'cfic'
  couleur: string
  icone: string
  /** Niveaux ordonnés. Un parcours « plat » (intégration) a un seul niveau. */
  niveaux: ParcoursLevel[]
  /** Décerne un certificat final à la complétion du programme. */
  delivreCertificat: boolean
  /** Badge final (id). */
  badgeFinal?: string
  /**
   * Libellés de progression / rangs affichés (ex. Mahanaïm :
   * Intercesseur → Veilleur → Sentinelle → Capitaine → Stratège).
   * Optionnel — sinon on affiche le titre des niveaux.
   */
  rangs?: string[]
  status: 'published' | 'planned'
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers purs (sans état)
// ────────────────────────────────────────────────────────────────────────────

/** Toutes les étapes d'un programme, dans l'ordre (niveaux puis étapes). */
export function flattenSteps(programme: Programme): ParcoursStep[] {
  return [...programme.niveaux]
    .sort((a, b) => a.ordre - b.ordre)
    .flatMap((niv) => [...niv.steps].sort((a, b) => a.ordre - b.ordre))
}

/** Nombre total d'étapes d'un programme. */
export function totalSteps(programme: Programme): number {
  return programme.niveaux.reduce((n, l) => n + l.steps.length, 0)
}

/** XP total atteignable sur un programme. */
export function totalXp(programme: Programme): number {
  return flattenSteps(programme).reduce((n, s) => n + (s.xp || 0), 0)
}

/** Le niveau auquel appartient une étape. */
export function levelOfStep(programme: Programme, stepId: string): ParcoursLevel | null {
  return programme.niveaux.find((l) => l.steps.some((s) => s.id === stepId)) ?? null
}
