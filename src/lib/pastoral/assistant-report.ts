/**
 * Assistant Pastoral — Report Builder DÉTERMINISTE (V2.5-B.2-B-①).
 *
 * Construit une réponse structurée (résumé, constats, priorités, suggestions,
 * personnes concernées + liens, limites) à partir d'un intent et des demandes
 * « Nouveau Venu » réelles. Fonction PURE, langage prudent et bienveillant,
 * AUCUNE IA, AUCUNE donnée inventée. Ne renvoie que ce que les données permettent.
 */
import { computeNewcomerIntelligence, type IntakeLite, type Severity } from './newcomer-intelligence'
import { getUnassignedNewcomers, getConversionIssues, getNewcomersWithoutNotes } from './assistant-data'
import type { AssistantIntent } from './intent-router'

export interface AssistantPerson {
  id: string
  name: string
  status: string
  reason: string
  severity: Severity | null
  href: string
}

export interface AssistantResponse {
  intent: AssistantIntent
  title: string
  summary: string
  findings: string[]        // constats factuels
  suggestions: string[]     // suggestions pastorales prudentes
  people: AssistantPerson[] // personnes concernées (bornées, cf. PEOPLE_LIMIT)
  peopleTotal: number       // total avant borne (pour « +X autres »)
  limits: string[]          // limites explicites des données
  dataBasis: string         // mention de provenance
}

const PEOPLE_LIMIT = 10
const DAY = 24 * 60 * 60 * 1000
const NOT_CONTACTED = new Set(['new', 'to_review'])

const fullName = (i: IntakeLite) => `${i.prenom || ''} ${i.nom || ''}`.trim() || 'Nouveau venu'
const href = (id: string) => `/admin/nouveaux-venus/${id}`
const ageDays = (iso: string, now: number) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : Math.floor((now - t) / DAY)
}
const DATA_BASIS = 'Réponse basée sur les données disponibles (newcomer_intakes), en lecture seule.'
const NV_LIMITS = [
  "Les nouveaux venus n'ont pas de donnée zone / ville / pays : aucune analyse géographique n'est produite pour eux.",
  "Réponses déterministes (règles simples) fondées uniquement sur newcomer_intakes — pas d'IA, aucune donnée inventée.",
  'Ce périmètre couvre les nouveaux venus ; membres, groupes et responsables seront ajoutés dans un sous-lot ultérieur.',
]

const person = (i: IntakeLite, reason: string, severity: Severity | null): AssistantPerson =>
  ({ id: i.id, name: fullName(i), status: i.status, reason, severity, href: href(i.id) })

const cap = (people: AssistantPerson[]): { people: AssistantPerson[]; peopleTotal: number } =>
  ({ people: people.slice(0, PEOPLE_LIMIT), peopleTotal: people.length })

/** Construit la réponse de l'assistant pour un intent donné (déterministe, lecture seule). */
export function buildAssistantResponse(
  intent: AssistantIntent,
  intakes: IntakeLite[],
  now: number = Date.now(),
): AssistantResponse {
  const list = intakes || []
  const intel = computeNewcomerIntelligence(list, now)
  const s = intel.summary

  const base = { intent, findings: [] as string[], suggestions: [] as string[], limits: NV_LIMITS, dataBasis: DATA_BASIS }

  switch (intent) {
    case 'rapport_global': {
      const prio = intel.priorities.map((p) => ({ id: p.id, name: p.name, status: p.status, reason: p.reason, severity: p.severity, href: href(p.id) }))
      return {
        ...base,
        title: 'Rapport pastoral — nouveaux venus',
        summary: `${s.total} demande(s) au total : ${s.aContacter} à contacter, ${s.contactes} contactée(s), ${s.convertis} intégrée(s). ${s.nouveaux7j} arrivée(s) ces 7 derniers jours.`,
        findings: [
          `${s.nonAssignes} demande(s) active(s) sans responsable assigné.`,
          `${s.conversionsAVerifier} conversion(s) à vérifier (marquée « Intégré » sans profil lié).`,
          s.delaiContactMoyenJours === null ? 'Aucune demande encore traitée pour estimer le délai de contact.' : `Délai moyen de premier contact : environ ${s.delaiContactMoyenJours} jour(s).`,
        ],
        suggestions: intel.recommendations.map((r) => r.title),
        ...cap(prio),
      }
    }

    case 'suivis_prioritaires': {
      const prio = intel.priorities.map((p) => ({ id: p.id, name: p.name, status: p.status, reason: p.reason, severity: p.severity, href: href(p.id) }))
      return {
        ...base,
        title: 'Personnes à suivre en priorité',
        summary: prio.length ? `${prio.length} demande(s) méritent une attention, par ordre de priorité.` : 'Aucune demande ne requiert d’attention particulière pour le moment.',
        suggestions: prio.length ? ['Commencer par les demandes « À prioriser » (accueil ou relance).'] : [],
        ...cap(prio),
      }
    }

    case 'nouveaux_venus': {
      const recent = list
        .filter((i) => ageDays(i.created_at, now) <= 7)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        .map((i) => person(i, `Arrivé(e) il y a ${ageDays(i.created_at, now)} jour(s).`, NOT_CONTACTED.has(i.status) ? 'haute' : 'douce'))
      return {
        ...base,
        title: 'Nouveaux venus récents',
        summary: `${s.nouveaux7j} arrivée(s) ces 7 derniers jours.`,
        suggestions: recent.length ? ['Assurer un accueil bienveillant et rapide des arrivées récentes.'] : [],
        ...cap(recent),
      }
    }

    case 'non_assignes': {
      const unassigned = getUnassignedNewcomers(list)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        .map((i) => person(i, 'Aucun responsable assigné pour le moment.', NOT_CONTACTED.has(i.status) ? 'moyenne' : 'douce'))
      return {
        ...base,
        title: 'Nouveaux venus sans responsable',
        summary: unassigned.length ? `${unassigned.length} demande(s) active(s) sans responsable assigné.` : 'Toutes les demandes actives ont un responsable assigné.',
        suggestions: unassigned.length ? ['Assigner un responsable pastoral à chaque demande active pour faciliter le suivi.'] : [],
        ...cap(unassigned),
      }
    }

    case 'conversions_a_verifier': {
      const issues = getConversionIssues(list)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        .map((i) => person(i, 'Marqué « Intégré » sans profil membre lié — à vérifier.', 'moyenne'))
      return {
        ...base,
        title: 'Conversions à vérifier',
        summary: issues.length ? `${issues.length} demande(s) marquée(s) « Intégré » sans profil membre correspondant.` : 'Aucune conversion à vérifier : les intégrations semblent correctement reliées.',
        suggestions: issues.length ? ['Rapprocher chaque conversion d’un profil membre, ou corriger le statut si besoin.'] : [],
        ...cap(issues),
      }
    }

    case 'notes_manquantes': {
      const noNotes = getNewcomersWithoutNotes(list)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        .map((i) => person(i, 'Note pastorale à compléter.', 'douce'))
      return {
        ...base,
        title: 'Suivis sans note pastorale',
        summary: noNotes.length ? `${noNotes.length} demande(s) active(s) sans note pastorale.` : 'Toutes les demandes actives ont une note pastorale.',
        suggestions: noNotes.length ? ['Compléter une brève note pastorale pour documenter le suivi.'] : [],
        ...cap(noNotes),
      }
    }

    case 'limites_donnees':
      return {
        ...base,
        title: 'Données disponibles et limites',
        summary: 'Voici ce que l’assistant peut analyser aujourd’hui, et ce qu’il ne peut pas encore couvrir.',
        findings: [
          'Disponible : statut, priorité, dates, note pastorale, assignation et conversion des nouveaux venus.',
          'Indisponible : zone / ville / pays des nouveaux venus (colonnes absentes).',
          'Indisponible ici : membres, groupes, responsables (prévus dans un sous-lot ultérieur).',
        ],
        people: [],
        peopleTotal: 0,
      }

    case 'unknown':
    default:
      return {
        ...base,
        intent: 'unknown',
        title: 'Question non reconnue',
        summary: "Je n’ai pas reconnu cette demande comme une question pastorale prise en charge. Aucune réponse n’est inventée.",
        suggestions: [
          'Fais-moi un rapport pastoral de cette semaine.',
          'Qui dois-je suivre en priorité ?',
          'Montre-moi les nouveaux venus sans responsable.',
          'Quelles conversions doivent être vérifiées ?',
        ],
        people: [],
        peopleTotal: 0,
      }
  }
}
