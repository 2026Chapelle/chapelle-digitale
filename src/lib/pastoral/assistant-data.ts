/**
 * Assistant Pastoral — Data Access Layer ALLOW-LISTÉ (V2.5-B.2-B-①).
 *
 * Liste FERMÉE de sélecteurs de lecture. Ce sont des fonctions PURES qui opèrent sur
 * une liste `IntakeLite[]` DÉJÀ chargée par le lecteur contrôlé (route serveur), avec
 * un jeu de colonnes fixe. Aucune de ces fonctions n'ouvre un accès arbitraire à la
 * base, ne construit de SQL, ni n'écrit quoi que ce soit.
 *
 * Périmètre B.2-B-① : nouveaux venus (public.newcomer_intakes) uniquement.
 * Les sélecteurs membres/groupes/responsables viendront dans un sous-lot ultérieur.
 */
import { computeNewcomerIntelligence, type IntakeLite, type IntelSummary, type Priority } from './newcomer-intelligence'

// Pipeline actif NON converti : demandes qui attendent encore un suivi (pour l'assignation).
const PIPELINE_ACTIVE = new Set(['new', 'to_review', 'contacted']) // exclut converted/duplicate/archived
const isAssigned = (i: IntakeLite) => !!(i.assigned_to_profile_id && String(i.assigned_to_profile_id).trim())
const isConvertedLinked = (i: IntakeLite) => !!(i.converted_profile_id && String(i.converted_profile_id).trim())
const hasNote = (i: IntakeLite) => !!(i.metadata?.admin_note && i.metadata.admin_note.trim())

/** Synthèse chiffrée des demandes « Nouveau Venu » (réutilise le moteur déterministe). */
export function getNewcomerIntakesSummary(intakes: IntakeLite[], now: number = Date.now()): IntelSummary {
  return computeNewcomerIntelligence(intakes, now).summary
}

/** Priorités pastorales (règles prudentes du moteur), triées par sévérité puis ancienneté. */
export function getNewcomerPriorities(intakes: IntakeLite[], now: number = Date.now()): Priority[] {
  return computeNewcomerIntelligence(intakes, now).priorities
}

/** Nouveaux venus en pipeline actif (non convertis) sans responsable assigné. */
export function getUnassignedNewcomers(intakes: IntakeLite[]): IntakeLite[] {
  return (intakes || []).filter((i) => PIPELINE_ACTIVE.has(i.status) && !isAssigned(i))
}

/** Conversions à vérifier : statut « converted » sans profil membre lié. */
export function getConversionIssues(intakes: IntakeLite[]): IntakeLite[] {
  return (intakes || []).filter((i) => i.status === 'converted' && !isConvertedLinked(i))
}

/** Nouveaux venus en pipeline actif sans note pastorale (metadata.admin_note). */
export function getNewcomersWithoutNotes(intakes: IntakeLite[]): IntakeLite[] {
  return (intakes || []).filter((i) => PIPELINE_ACTIVE.has(i.status) && !hasNote(i))
}

/** Nom des fonctions autorisées (contrôle explicite / tests anti-régression de l'allow-list). */
export const ALLOWED_NEWCOMER_SELECTORS = [
  'getNewcomerIntakesSummary',
  'getNewcomerPriorities',
  'getUnassignedNewcomers',
  'getConversionIssues',
  'getNewcomersWithoutNotes',
] as const
