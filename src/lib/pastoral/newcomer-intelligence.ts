/**
 * Intelligence Pastorale — moteur de recommandations DÉTERMINISTE (V2.5-A → V2.5-B.2-A).
 *
 * 100 % LECTURE SEULE : ne fait aucune écriture, aucun appel réseau, aucune IA externe.
 * Fonction PURE (testable) prenant les demandes « Nouveau Venu » réelles
 * (public.newcomer_intakes, via /api/admin/newcomer-intakes) et produisant des
 * synthèses + priorités + recommandations à partir des seuls champs EXISTANTS.
 *
 * V2.5-B.2-A — enrichissement SANS SQL : exploite trois colonnes déjà présentes en base
 * (assigned_to_profile_id, converted_profile_id, intake_payload) + priority + processed_at
 * pour raisonner sur l'assignation, la conversion et le délai de premier contact.
 * AUCUNE nouvelle donnée, AUCUNE colonne créée, AUCUNE zone inventée pour les nouveaux venus.
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
  // V2.5-B.2-A — champs existants exposés en plus (tous optionnels : rétro-compatible).
  priority?: string | null
  source?: string | null
  processed_at?: string | null
  assigned_to_profile_id?: string | null
  converted_profile_id?: string | null
}

export interface IntelSummary {
  total: number
  aContacter: number       // statuts new + to_review
  contactes: number        // statut contacted
  integresOuSuivi: number  // converted (intégré) + contacted (en suivi)
  avecNote: number
  nouveaux7j: number
  // V2.5-B.2-A — signaux enrichis (colonnes existantes uniquement)
  assignes: number             // demandes actives avec un responsable assigné
  nonAssignes: number          // demandes actives sans responsable assigné
  convertis: number            // statut converted
  conversionsAVerifier: number // converted SANS converted_profile_id lié
  delaiContactMoyenJours: number | null // moyenne (processed_at - created_at), null si aucune
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

/**
 * Item structuré d'une réponse rapide (Formatter) — de quoi construire une ligne
 * cliquable côté UI. `href` n'est PAS inclus ici (le moteur reste pur, sans routing) :
 * l'UI le dérive via `/admin/nouveaux-venus/${id}`.
 */
export interface QuickItem {
  id: string
  name: string
  status: string
  reason: string
  severity: Severity
  createdAt: string
}
export interface QuickAnswer { id: string; question: string; answer: string; items: QuickItem[] }

export interface IntelResult {
  summary: IntelSummary
  priorities: Priority[]
  recommendations: Recommendation[]
  quick: QuickAnswer[]
}

const DAY = 24 * 60 * 60 * 1000
const NOT_CONTACTED = new Set(['new', 'to_review'])
const ACTIVE = new Set(['new', 'to_review', 'contacted', 'converted']) // exclut duplicate/archived
const HIGH_PRIORITY = new Set(['high', 'urgent'])
const SEV_RANK: Record<Severity, number> = { haute: 3, moyenne: 2, douce: 1 }

const hasNote = (i: IntakeLite) => !!(i.metadata?.admin_note && i.metadata.admin_note.trim())
const fullName = (i: IntakeLite) => `${i.prenom || ''} ${i.nom || ''}`.trim() || 'Nouveau venu'
const isAssigned = (i: IntakeLite) => !!(i.assigned_to_profile_id && String(i.assigned_to_profile_id).trim())
const isConvertedLinked = (i: IntakeLite) => !!(i.converted_profile_id && String(i.converted_profile_id).trim())
const isHighPriority = (i: IntakeLite) => !!(i.priority && HIGH_PRIORITY.has(i.priority))
const ageDays = (iso: string, now: number) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : Math.floor((now - t) / DAY)
}
/** Délai (jours) entre réception et premier traitement, ou null si non traité / dates invalides. */
const contactDelayDays = (i: IntakeLite): number | null => {
  if (!i.processed_at) return null
  const c = Date.parse(i.created_at)
  const p = Date.parse(i.processed_at)
  if (Number.isNaN(c) || Number.isNaN(p)) return null
  return Math.max(0, Math.round((p - c) / DAY))
}

/** Détermine si une demande active nécessite une attention + la raison prudente. */
function evaluate(i: IntakeLite, now: number): { reason: string; severity: Severity } | null {
  const age = ageDays(i.created_at, now)
  if (NOT_CONTACTED.has(i.status)) {
    // Le champ priority existant peut relever la sévérité, jamais l'abaisser.
    if (age > 30) return { reason: 'En attente depuis plus de 30 jours — une relance semble nécessaire.', severity: 'haute' }
    if (age <= 7) return { reason: 'Nouvel arrivant — un accueil rapide est recommandé.', severity: 'haute' }
    if (isHighPriority(i)) return { reason: 'Signalé comme prioritaire et en attente d’un premier contact.', severity: 'haute' }
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
  const activeList = list.filter((i) => ACTIVE.has(i.status))

  // Délai moyen de premier contact (sur les demandes réellement traitées).
  const delais = list.map(contactDelayDays).filter((d): d is number => d !== null)
  const delaiContactMoyenJours = delais.length
    ? Math.round(delais.reduce((s, d) => s + d, 0) / delais.length)
    : null

  const summary: IntelSummary = {
    total: list.length,
    aContacter: list.filter((i) => NOT_CONTACTED.has(i.status)).length,
    contactes: list.filter((i) => i.status === 'contacted').length,
    integresOuSuivi: list.filter((i) => i.status === 'converted' || i.status === 'contacted').length,
    avecNote: list.filter(hasNote).length,
    nouveaux7j: list.filter((i) => ageDays(i.created_at, now) <= 7).length,
    assignes: activeList.filter(isAssigned).length,
    nonAssignes: activeList.filter((i) => !isAssigned(i)).length,
    convertis: list.filter((i) => i.status === 'converted').length,
    conversionsAVerifier: list.filter((i) => i.status === 'converted' && !isConvertedLinked(i)).length,
    delaiContactMoyenJours,
  }

  const priorities: Priority[] = activeList
    .map((i) => {
      const ev = evaluate(i, now)
      return ev ? { id: i.id, name: fullName(i), status: i.status, reason: ev.reason, severity: ev.severity, createdAt: i.created_at } : null
    })
    .filter((p): p is Priority => p !== null)
    .sort((a, b) => (SEV_RANK[b.severity] - SEV_RANK[a.severity]) || (Date.parse(a.createdAt) - Date.parse(b.createdAt)))
    .slice(0, priorityLimit)

  const sansNoteActifs = activeList.filter((i) => !hasNote(i)).length
  const anciensSansEvolution = list.filter((i) => NOT_CONTACTED.has(i.status) && ageDays(i.created_at, now) > 30).length

  const recommendations: Recommendation[] = ([
    summary.aContacter > 0 && { id: 'contacter', title: 'Prendre contact avec les nouveaux venus en attente', detail: `${summary.aContacter} demande(s) au statut « Nouveau » ou « À revoir » à contacter.`, count: summary.aContacter },
    summary.nonAssignes > 0 && { id: 'assigner', title: 'Assigner un responsable aux demandes actives', detail: `${summary.nonAssignes} demande(s) active(s) sans responsable assigné.`, count: summary.nonAssignes },
    anciensSansEvolution > 0 && { id: 'relance', title: 'Relancer les demandes sans évolution récente', detail: `${anciensSansEvolution} demande(s) en attente depuis plus de 30 jours.`, count: anciensSansEvolution },
    summary.conversionsAVerifier > 0 && { id: 'conversion-verifier', title: 'Vérifier les conversions non reliées à un profil', detail: `${summary.conversionsAVerifier} demande(s) marquée(s) « Intégré » sans profil membre lié.`, count: summary.conversionsAVerifier },
    sansNoteActifs > 0 && { id: 'notes', title: 'Compléter le suivi pastoral (notes manquantes)', detail: `${sansNoteActifs} demande(s) active(s) sans note pastorale.`, count: sansNoteActifs },
    summary.nouveaux7j > 0 && { id: 'accueil', title: 'Assurer un accueil rapide des arrivées récentes', detail: `${summary.nouveaux7j} demande(s) reçue(s) ces 7 derniers jours.`, count: summary.nouveaux7j },
  ].filter(Boolean)) as Recommendation[]

  // ── Formatter — items structurés cliquables par question rapide ────────────────
  const item = (i: IntakeLite, reason: string, severity: Severity): QuickItem =>
    ({ id: i.id, name: fullName(i), status: i.status, reason, severity, createdAt: i.created_at })
  const bySeverityThenAge = (a: QuickItem, b: QuickItem) =>
    (SEV_RANK[b.severity] - SEV_RANK[a.severity]) || (Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const byOldest = (a: QuickItem, b: QuickItem) => Date.parse(a.createdAt) - Date.parse(b.createdAt)

  const contactItems = activeList
    .filter((i) => NOT_CONTACTED.has(i.status))
    .map((i) => { const ev = evaluate(i, now)!; return item(i, ev.reason, ev.severity) })
    .sort(bySeverityThenAge)

  const assignItems = activeList
    .filter((i) => !isAssigned(i))
    .map((i) => item(i, 'Aucun responsable assigné pour le moment.', NOT_CONTACTED.has(i.status) ? 'moyenne' : 'douce'))
    .sort(bySeverityThenAge)

  const noteItems = activeList
    .filter((i) => !hasNote(i))
    .map((i) => item(i, 'Note pastorale à compléter.', 'douce'))
    .sort(byOldest)

  const delaiItems = list
    .filter((i) => contactDelayDays(i) !== null)
    .map((i) => { const d = contactDelayDays(i)!; return { it: item(i, `Premier traitement ${d} jour(s) après la réception.`, d > 14 ? 'moyenne' as Severity : 'douce' as Severity), d } })
    .sort((a, b) => b.d - a.d)
    .map((x) => x.it)

  const semaineItems = list
    .filter((i) => ageDays(i.created_at, now) <= 7)
    .map((i) => item(i, `Arrivé(e) il y a ${ageDays(i.created_at, now)} jour(s).`, NOT_CONTACTED.has(i.status) ? 'haute' : 'douce'))
    .sort(byOldest)

  const suiviItems = list
    .filter((i) => i.status === 'converted' || i.status === 'contacted')
    .map((i) => item(i, i.status === 'converted' ? 'Intégré(e) — suivi en cours.' : 'Contacté(e) — en cours de suivi.', 'douce'))
    .sort(byOldest)

  const topNames = contactItems.slice(0, 3).map((p) => p.name)
  const quick: QuickAnswer[] = [
    { id: 'q-contact', question: 'Qui contacter en priorité ?', items: contactItems,
      answer: summary.aContacter > 0 ? `${summary.aContacter} nouveau(x) venu(s) en attente de contact${topNames.length ? ` — ex. ${topNames.join(', ')}.` : '.'}` : 'Personne en attente de premier contact pour le moment.' },
    { id: 'q-assigner', question: 'Combien de demandes sans responsable ?', items: assignItems,
      answer: summary.nonAssignes > 0 ? `${summary.nonAssignes} demande(s) active(s) sans responsable assigné.` : 'Toutes les demandes actives ont un responsable assigné.' },
    { id: 'q-notes', question: 'Combien de notes pastorales manquent ?', items: noteItems,
      answer: sansNoteActifs > 0 ? `${sansNoteActifs} demande(s) active(s) sans note pastorale.` : 'Toutes les demandes actives ont une note pastorale.' },
    { id: 'q-delai', question: 'Quel est le délai moyen de premier contact ?', items: delaiItems,
      answer: delaiContactMoyenJours === null ? 'Pas encore de demande traitée pour estimer le délai.' : `Environ ${delaiContactMoyenJours} jour(s) entre la réception et le premier traitement.` },
    { id: 'q-semaine', question: 'Combien d’arrivées cette semaine ?', items: semaineItems,
      answer: `${summary.nouveaux7j} arrivée(s) ces 7 derniers jours.` },
    { id: 'q-suivi', question: 'Combien sont intégrés ou en suivi ?', items: suiviItems,
      answer: `${summary.integresOuSuivi} demande(s) intégrée(s) ou en suivi.` },
  ]

  return { summary, priorities, recommendations, quick }
}
