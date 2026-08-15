/**
 * Parcours d'accompagnement pastoral d'un « Nouveau Venu » (V2.6-B) — logique PURE.
 *
 * Dérive une ÉTAPE lisible, une PROCHAINE ACTION et une checklist de suivi À PARTIR
 * du statut existant + des signaux de temps ([[newcomer-triage]]). Aucune écriture,
 * aucune nouvelle donnée, aucun SQL. Ce n'est PAS une progression personnelle réelle :
 * tant qu'un nouveau venu n'est pas lié à un profil membre (converted_profile_id), les
 * liens « parcours » sont une ORIENTATION RECOMMANDÉE, pas une synchronisation live.
 */
import type { TriageResult } from '@/lib/pastoral/newcomer-triage'

export type JourneyStage =
  | 'received' // demande reçue, à traiter (récent)
  | 'to_contact' // à contacter en priorité (attente trop longue)
  | 'contacted' // premier contact fait, accompagnement en cours
  | 'follow_up' // contacté mais sans nouvelle → relance douce
  | 'integrated' // intégré (converted)
  | 'closed' // doublon / archivé

/** Orientations pastorales recommandées (clés stables, libellées côté UI). */
export type Orientation =
  | 'first_contact'
  | 'welcome'
  | 'pastoral_need'
  | 'encouragement'
  | 'culte'
  | 'cellule'
  | 'parcours'
  | 'confirm_integration'

export interface ChecklistItem {
  label: string
  done: boolean
}

export interface JourneyMapping {
  stage: JourneyStage
  /** Numéro d'étape lisible (1..6), pour un badge discret. */
  step: number
  /** Libellé court de l'étape (FR). */
  label: string
  /** Prochaine action recommandée (FR). */
  nextAction: string
  /** Urgence dérivée (en retard de contact ou relance due). */
  isUrgent: boolean
  /** Orientations recommandées pour cette étape. */
  orientations: Orientation[]
  /** Checklist en LECTURE SEULE (done dérivé de faits vérifiables uniquement). */
  checklist: ChecklistItem[]
}

interface StageDef {
  step: number
  label: string
  nextAction: string
  orientations: Orientation[]
}

/** Table d'étapes (ordre lisible). Le numéro sert de badge discret en liste. */
const STAGES: Record<JourneyStage, StageDef> = {
  received: {
    step: 1,
    label: 'Demande reçue',
    nextAction: 'Prendre contact rapidement (appel ou WhatsApp) et envoyer le message de bienvenue.',
    orientations: ['first_contact', 'welcome'],
  },
  to_contact: {
    step: 2,
    label: 'À contacter',
    nextAction: 'En attente depuis trop longtemps — contacter en priorité et souhaiter la bienvenue.',
    orientations: ['first_contact', 'welcome'],
  },
  contacted: {
    step: 3,
    label: 'Accompagnement en cours',
    nextAction: "Écouter le besoin pastoral, encourager, puis proposer une orientation (culte, cellule, parcours d'intégration).",
    orientations: ['pastoral_need', 'encouragement', 'culte', 'cellule', 'parcours'],
  },
  follow_up: {
    step: 4,
    label: 'Relance douce',
    nextAction: 'Sans nouvelle depuis quelques jours — relancer avec douceur et réaffirmer l’accueil.',
    orientations: ['encouragement', 'culte', 'cellule'],
  },
  integrated: {
    step: 5,
    label: 'Intégré',
    nextAction: "Accompagner l'intégration durable : cellule et parcours d'intégration.",
    orientations: ['cellule', 'parcours', 'confirm_integration'],
  },
  closed: {
    step: 6,
    label: 'Clos',
    nextAction: 'Aucune action requise — demande close (doublon ou archivée).',
    orientations: [],
  },
}

export interface JourneyContext {
  /** Une note pastorale est-elle enregistrée ? (fait vérifiable, pas d'invention). */
  hasNote?: boolean
  /** La demande est-elle liée à un profil membre réel ? (converted_profile_id). */
  hasLinkedProfile?: boolean
}

/** Statut → étape, en tenant compte des signaux de temps du triage. */
export function deriveJourneyStage(
  status: string,
  triage: Pick<TriageResult, 'bucket' | 'isOverdue' | 'followUpDue'>,
  ctx: JourneyContext = {},
): JourneyMapping {
  const stage = resolveStage(status, triage)
  const def = STAGES[stage]
  const isUrgent = stage === 'to_contact' ? true : stage === 'follow_up' ? true : false

  const contactDone = stage === 'contacted' || stage === 'follow_up' || stage === 'integrated'
  const noteDone = !!ctx.hasNote
  const integratedDone = stage === 'integrated'
  // Checklist LECTURE SEULE : un item n'est coché que si un FAIT le prouve
  // (statut/note). L'orientation reste une invitation tant que non prouvée.
  const checklist: ChecklistItem[] = [
    { label: 'Premier contact effectué', done: contactDone },
    { label: 'Besoin pastoral noté', done: noteDone },
    { label: "Orientation proposée (culte, cellule, parcours)", done: integratedDone },
    { label: 'Intégration confirmée', done: integratedDone },
  ]

  return {
    stage,
    step: def.step,
    label: def.label,
    nextAction: def.nextAction,
    isUrgent,
    orientations: def.orientations,
    checklist,
  }
}

function resolveStage(
  status: string,
  triage: Pick<TriageResult, 'bucket' | 'isOverdue' | 'followUpDue'>,
): JourneyStage {
  switch (status) {
    case 'new':
    case 'to_review':
      return triage.isOverdue ? 'to_contact' : 'received'
    case 'contacted':
      return triage.followUpDue ? 'follow_up' : 'contacted'
    case 'converted':
      return 'integrated'
    case 'duplicate':
    case 'archived':
      return 'closed'
    default:
      // Statut inconnu : repli prudent selon la phase de triage.
      return triage.bucket === 'closed' ? 'closed' : triage.bucket === 'todo' ? 'received' : 'contacted'
  }
}

/** Badge discret pour la liste : « Étape N · Libellé ». */
export function journeyBadge(mapping: JourneyMapping): { step: number; label: string; isUrgent: boolean } {
  return { step: mapping.step, label: mapping.label, isUrgent: mapping.isUrgent }
}
