/**
 * V3 — INTELLIGENCE PASTORALE PRÉDICTIVE (logique PURE, sans ML ni I/O).
 *
 * Heuristiques explicables (règles + pondérations) sur les signaux réels déjà
 * collectés par MemberIntel : récence, fréquence, diversité d'engagement,
 * jours actifs, abandons, prières sans suivi.
 *
 *  - churnRisk()        → risque de DÉCROCHAGE membre (0-100 + niveau + action)
 *  - formationAbandonRisk() → risque d'ABANDON de formation
 *  - absenceRisk()      → risque d'ABSENCE (irrégularité de présence)
 *  - followUpAction()   → suggestion de suivi pastoral automatique
 *
 * Confidentialité : aucun contenu sensible, uniquement des agrégats de signaux.
 */
import { type MemberIntel, engagementScore, lastActivityDays, accountAgeDays, conversionStage } from './pastoral-intelligence'

export type RiskLevel = 'critique' | 'eleve' | 'moyen' | 'faible'
export const RISK_META: Record<RiskLevel, { label: string; color: string; order: number }> = {
  critique: { label: 'Critique', color: '#EF4444', order: 0 },
  eleve: { label: 'Élevé', color: '#F59E0B', order: 1 },
  moyen: { label: 'Moyen', color: '#EAB308', order: 2 },
  faible: { label: 'Faible', color: '#22C55E', order: 3 },
}
const levelFromScore = (s: number): RiskLevel => (s >= 75 ? 'critique' : s >= 50 ? 'eleve' : s >= 25 ? 'moyen' : 'faible')

export type FollowUpAction = 'integration_accompagnement' | 'contact_personnel' | 'relance_engagement' | 'assigner_intercession' | 'observation'

export interface ChurnPrediction {
  score: number
  niveau: RiskLevel
  action: FollowUpAction
  jours_sans_activite: number | null
  facteurs: string[]
}

/**
 * Risque de décrochage à 30 jours (plus le score est haut, plus le risque est grand).
 * Pondérations : récence 30, fréquence 20, diversité 18, jours actifs 15, signaux 17.
 */
export function churnRisk(m: MemberIntel, now: number): ChurnPrediction {
  const d = lastActivityDays(m, now)
  const age = accountAgeDays(m, now)
  const facteurs: string[] = []

  // Nouveau compte (< 7 j) : pas de churn, on oriente l'intégration.
  if (age < 7) {
    const sansSignal = m.formations === 0 && m.prieres === 0 && m.events === 0
    return {
      score: sansSignal ? 30 : 8, niveau: sansSignal ? 'moyen' : 'faible',
      action: sansSignal ? 'integration_accompagnement' : 'observation',
      jours_sans_activite: d, facteurs: sansSignal ? ['Nouveau membre sans parcours entamé'] : [],
    }
  }

  let risk = 0
  // 1) Récence (poids fort).
  if (d === null) { risk += age > 14 ? 45 : 15; facteurs.push('Aucune activité enregistrée') }
  else if (d > 30) { risk += 40; facteurs.push(`Inactif depuis ${d} j`) }
  else if (d >= 14) { risk += 25; facteurs.push(`Silencieux depuis ${d} j`) }
  else if (d >= 7) { risk += 12; facteurs.push(`Absent depuis ${d} j`) }
  // 2) Fréquence de connexion (30 j).
  if (m.connexions < 2) { risk += 20; facteurs.push('Très peu de connexions') }
  else if (m.connexions < 4) risk += 10
  // 3) Diversité d'engagement.
  const breadth = [m.prieres, m.formations, m.lives, m.downloads, m.events, m.dons].filter((x) => x > 0).length
  if (breadth === 0) { risk += 18; facteurs.push('Aucun type d’engagement') }
  else if (breadth === 1) risk += 8
  // 4) Jours actifs.
  if (m.active_days_30 === 0) risk += 15
  else if (m.active_days_30 < 3) risk += 6
  // 5) Signaux négatifs.
  if (m.formations_abandonnees > 0) { risk += 8; facteurs.push('Formation abandonnée') }
  if (engagementScore(m) < 15) risk += 6
  if (m.prieres_sans_suivi > 0) { risk += 10; facteurs.push('Prière sans suivi') }

  const score = Math.min(Math.round(risk), 100)
  const niveau = levelFromScore(score)
  return { score, niveau, action: followUpAction(m, niveau), jours_sans_activite: d, facteurs }
}

/** Suggestion de suivi pastoral automatique selon le risque. */
export function followUpAction(m: MemberIntel, niveau: RiskLevel): FollowUpAction {
  if (m.prieres_sans_suivi > 0) return 'assigner_intercession'
  if (niveau === 'critique') return 'contact_personnel'
  if (niveau === 'eleve') return 'relance_engagement'
  if (niveau === 'moyen') return 'relance_engagement'
  return 'observation'
}

export const ACTION_LABEL: Record<FollowUpAction, string> = {
  integration_accompagnement: 'Accompagner l’intégration',
  contact_personnel: 'Contact pastoral personnel (24h)',
  relance_engagement: 'Relancer (invitation prière / événement)',
  assigner_intercession: 'Assigner un intercesseur à la prière',
  observation: 'Observation',
}

/**
 * Risque d'abandon d'une formation à partir de la progression et de la récence d'accès.
 * @param progression 0-100, @param joursSansAcces jours depuis le dernier accès,
 * @param joursInscrit ancienneté de l'inscription.
 */
export function formationAbandonRisk(progression: number, joursSansAcces: number | null, joursInscrit: number): { score: number; niveau: RiskLevel; raison: string } {
  if (progression >= 100) return { score: 0, niveau: 'faible', raison: 'Terminée' }
  let risk = 0
  let raison = 'progression normale'
  // Inactivité d'accès.
  if (joursSansAcces === null || joursSansAcces > 14) { risk += 45; raison = 'inactivité prolongée' }
  else if (joursSansAcces > 7) { risk += 25; raison = 'inactivité' }
  else if (joursSansAcces > 3) risk += 10
  // Progression insuffisante vs attendu (~5%/jour ouvré, plafonné).
  const attendu = Math.min(joursInscrit * 4, 100)
  const deficit = attendu - progression
  if (deficit > 50) { risk += 35; raison = 'progression très en retard' }
  else if (deficit > 25) { risk += 20; if (raison === 'progression normale') raison = 'progression lente' }
  // Stagnation à 0.
  if (progression === 0 && joursInscrit > 7) { risk += 15; raison = 'jamais commencée' }
  const score = Math.min(Math.round(risk), 100)
  return { score, niveau: levelFromScore(score), raison }
}

/**
 * Risque d'absence au prochain rendez-vous (irrégularité de présence).
 * Basé sur la récence et la régularité (jours actifs / événements).
 */
export function absenceRisk(m: MemberIntel, now: number): { score: number; niveau: RiskLevel } {
  const d = lastActivityDays(m, now)
  let risk = 0
  if (d === null) risk += 50
  else if (d > 14) risk += 40
  else if (d > 7) risk += 22
  else if (d > 3) risk += 8
  if (m.events === 0) risk += 18
  if (m.active_days_30 < 4) risk += 14
  const score = Math.min(Math.round(risk), 100)
  return { score, niveau: levelFromScore(score) }
}

/** Membre éligible à une action de suivi (risque ≥ moyen, hors visiteurs). */
export function needsFollowUp(m: MemberIntel, now: number): ChurnPrediction | null {
  const stage = conversionStage(m)
  if (stage === 'visiteur') return null
  const p = churnRisk(m, now)
  return p.niveau === 'critique' || p.niveau === 'eleve' || p.action !== 'observation' ? p : null
}
