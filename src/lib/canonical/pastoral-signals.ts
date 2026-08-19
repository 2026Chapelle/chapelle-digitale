/**
 * PHASE 3A — PASTORAL SIGNALS (read-only, descriptif — jamais un verdict).
 *
 * Fonctions PURES qui transforment des FAITS en signaux pastoraux. Un signal est une
 * INVITATION à un geste humain, jamais une décision ni un score de spiritualité.
 *
 * Ce module extrait notamment la règle pédagogique jusqu'ici enfouie dans
 * health.ts:classify() (formationsTerminees >= 1 && prayers >= 1) et la reformule en
 * SIGNAL `criteres_pedagogiques_accomplis` — sans reproduire le VERDICT de statut de
 * classify(). health.ts n'est pas modifié en Phase 3A.
 *
 * INTERDITS (absents par construction) : spiritual_score, « spiritualité faible »,
 * promotion/rétrogradation automatique.
 */
import type { PastoralSignal, PastoralEvidence } from './types'

export interface PedagogicalFacts {
  member_id: string
  formationsTerminees: number
  prayers: number
  /** ISO — fourni par l'appelant (pureté/déterminisme). */
  generated_at: string
}

/**
 * Signal « critères pédagogiques accomplis » : socle d'engagement observable
 * (au moins une formation terminée ET au moins une prière). N'attribue AUCUN statut ;
 * suggère seulement une revue pastorale humaine.
 */
export function pedagogicalCriteriaSignal(facts: PedagogicalFacts): PastoralSignal | null {
  if (!(facts.formationsTerminees >= 1 && facts.prayers >= 1)) return null
  const evidence: PastoralEvidence[] = [
    { fact: 'formations_terminees', source: 'inscriptions_formation', value: facts.formationsTerminees },
    { fact: 'prieres', source: 'priere_demandes', value: facts.prayers },
  ]
  return {
    type: 'criteres_pedagogiques_accomplis',
    severity: 'info',
    reason: 'Socle d’engagement observable atteint (formation + prière). À examiner par le pastorat.',
    evidence,
    generated_at: facts.generated_at,
    member_id: facts.member_id,
    suggested_action: 'Proposer une revue pastorale du parcours (aucune promotion automatique).',
  }
}

export interface NewcomerFacts {
  member_id: string
  accountAgeDays: number
  hasAnyActivity: boolean // formation OU prière OU événement
  isAssigned: boolean // accompagnant assigné
  generated_at: string
}

/** Signal « nouveau sans accompagnement » : arrivée récente, sans activité ni référent. */
export function newcomerWithoutSupportSignal(facts: NewcomerFacts): PastoralSignal | null {
  if (facts.accountAgeDays > 14 || facts.hasAnyActivity || facts.isAssigned) return null
  return {
    type: 'nouveau_sans_accompagnement',
    severity: 'haute',
    reason: 'Personne récemment arrivée, sans activité observée ni accompagnant assigné.',
    evidence: [
      { fact: 'account_age_days', source: 'profiles.created_at', value: facts.accountAgeDays },
      { fact: 'assigned', source: 'newcomer_intakes', value: String(facts.isAssigned) },
    ],
    generated_at: facts.generated_at,
    member_id: facts.member_id,
    suggested_action: 'Assigner un accompagnant et prendre contact.',
  }
}

/** Garde-fou lexical : aucun champ/valeur ne doit exprimer un score spirituel. */
export function isForbiddenSpiritualVerdict(key: string): boolean {
  const k = key.toLowerCase()
  return k.includes('spiritual_score') || k.includes('spiritualite_faible') || k.includes('spiritual_verdict')
}
