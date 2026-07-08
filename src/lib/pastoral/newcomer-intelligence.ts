/**
 * Intelligence Pastorale — moteur de recommandations DÉTERMINISTE (V2.5-A).
 *
 * 100 % LECTURE SEULE : ne fait aucune écriture, aucun appel réseau, aucune IA externe.
 * Fonction PURE (testable) prenant les demandes « Nouveau Venu » réelles
 * (public.newcomer_intakes, via /api/admin/newcomer-intakes) et produisant des
 * synthèses + priorités + recommandations à partir des seuls champs existants.
 *
 * Langage prudent et bienveillant : aucun jugement négatif sur une personne ou un pasteur.
 * Aucune donnée « zone » n'existe sur newcomer_intakes → aucune reco géographique.
 */

export interface IntakeLite {
  id: string
  prenom: string
  nom: string | null
  status: string
  created_at: string
  metadata?: { admin_note?: string } | null
}

export interface IntelSummary {
  total: number
  aContacter: number       // statuts new + to_review
  contactes: number        // statut contacted
  integresOuSuivi: number  // converted (intégré) + contacted (en suivi)
  avecNote: number
  nouveaux7j: number
}

export type Severity = 'haute' | 'moyenne' | 'douce'

export interface Priority {
  id: string
  name: string
  status: string
  reason: string
  severity: Severity
  createdAt: string
}

export interface Recommendation { id: string; title: string; detail: string; count: number }
export interface QuickAnswer { id: string; question: string; answer: string }

export interface IntelResult {
  summary: IntelSummary
  priorities: Priority[]
  recommendations: Recommendation[]
  quick: QuickAnswer[]
}

const DAY = 24 * 60 * 60 * 1000
const NOT_CONTACTED = new Set(['new', 'to_review'])
const ACTIVE = new Set(['new', 'to_review', 'contacted', 'converted']) // exclut duplicate/archived
const SEV_RANK: Record<Severity, number> = { haute: 3, moyenne: 2, douce: 1 }

const hasNote = (i: IntakeLite) => !!(i.metadata?.admin_note && i.metadata.admin_note.trim())
const fullName = (i: IntakeLite) => `${i.prenom || ''} ${i.nom || ''}`.trim() || 'Nouveau venu'
const ageDays = (iso: string, now: number) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : Math.floor((now - t) / DAY)
}

/** Détermine si une demande active nécessite une attention + la raison prudente. */
function evaluate(i: IntakeLite, now: number): { reason: string; severity: Severity } | null {
  const age = ageDays(i.created_at, now)
  if (NOT_CONTACTED.has(i.status)) {
    if (age > 30) return { reason: 'En attente depuis plus de 30 jours — une relance semble nécessaire.', severity: 'haute' }
    if (age <= 7) return { reason: 'Nouvel arrivant — un accueil rapide est recommandé.', severity: 'haute' }
    return { reason: 'En attente d’un premier contact — à prioriser.', severity: 'moyenne' }
  }
  if (i.status === 'contacted' && !hasNote(i)) {
    return { reason: 'Contacté — la note pastorale reste à compléter.', severity: 'douce' }
  }
  if (i.status === 'converted' && !hasNote(i)) {
    return { reason: 'En suivi — la note pastorale reste à compléter.', severity: 'douce' }
  }
  return null
}

export function computeNewcomerIntelligence(
  intakes: IntakeLite[],
  now: number = Date.now(),
  priorityLimit = 25,
): IntelResult {
  const list = intakes || []

  const summary: IntelSummary = {
    total: list.length,
    aContacter: list.filter((i) => NOT_CONTACTED.has(i.status)).length,
    contactes: list.filter((i) => i.status === 'contacted').length,
    integresOuSuivi: list.filter((i) => i.status === 'converted' || i.status === 'contacted').length,
    avecNote: list.filter(hasNote).length,
    nouveaux7j: list.filter((i) => ageDays(i.created_at, now) <= 7).length,
  }

  const priorities: Priority[] = list
    .filter((i) => ACTIVE.has(i.status))
    .map((i) => {
      const ev = evaluate(i, now)
      return ev ? { id: i.id, name: fullName(i), status: i.status, reason: ev.reason, severity: ev.severity, createdAt: i.created_at } : null
    })
    .filter((p): p is Priority => p !== null)
    .sort((a, b) => (SEV_RANK[b.severity] - SEV_RANK[a.severity]) || (Date.parse(a.createdAt) - Date.parse(b.createdAt)))
    .slice(0, priorityLimit)

  const activeList = list.filter((i) => ACTIVE.has(i.status))
  const sansNoteActifs = activeList.filter((i) => !hasNote(i)).length
  const anciensSansEvolution = list.filter((i) => NOT_CONTACTED.has(i.status) && ageDays(i.created_at, now) > 30).length

  const recommendations: Recommendation[] = ([
    summary.aContacter > 0 && { id: 'contacter', title: 'Prendre contact avec les nouveaux venus en attente', detail: `${summary.aContacter} demande(s) au statut « Nouveau » ou « À revoir » à contacter.`, count: summary.aContacter },
    sansNoteActifs > 0 && { id: 'notes', title: 'Compléter les notes pastorales manquantes', detail: `${sansNoteActifs} demande(s) active(s) sans note pastorale.`, count: sansNoteActifs },
    summary.nouveaux7j > 0 && { id: 'accueil', title: 'Assurer un accueil rapide des arrivées récentes', detail: `${summary.nouveaux7j} demande(s) reçue(s) ces 7 derniers jours.`, count: summary.nouveaux7j },
    anciensSansEvolution > 0 && { id: 'relance', title: 'Relancer les demandes sans évolution récente', detail: `${anciensSansEvolution} demande(s) en attente depuis plus de 30 jours.`, count: anciensSansEvolution },
  ].filter(Boolean)) as Recommendation[]

  const topNames = priorities.filter((p) => NOT_CONTACTED.has(p.status)).slice(0, 3).map((p) => p.name)
  const quick: QuickAnswer[] = [
    { id: 'q-contact', question: 'Qui contacter en priorité ?', answer: summary.aContacter > 0 ? `${summary.aContacter} nouveau(x) venu(s) en attente de contact${topNames.length ? ` — ex. ${topNames.join(', ')}.` : '.'}` : 'Personne en attente de premier contact pour le moment.' },
    { id: 'q-notes', question: 'Combien de notes pastorales manquent ?', answer: sansNoteActifs > 0 ? `${sansNoteActifs} demande(s) active(s) sans note pastorale.` : 'Toutes les demandes actives ont une note pastorale.' },
    { id: 'q-semaine', question: 'Combien d’arrivées cette semaine ?', answer: `${summary.nouveaux7j} arrivée(s) ces 7 derniers jours.` },
    { id: 'q-suivi', question: 'Combien sont intégrés ou en suivi ?', answer: `${summary.integresOuSuivi} demande(s) intégrée(s) ou en suivi.` },
  ]

  return { summary, priorities, recommendations, quick }
}
