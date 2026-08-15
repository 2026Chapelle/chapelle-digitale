/**
 * Modèle « Parcours pastoral » du Nouveau Venu (V2.7-B) — typage + helpers PURS.
 *
 * Reflète le modèle SQL V2.7-A appliqué en prod (tables newcomer_journey_steps /
 * newcomer_journey_events + colonnes additives sur newcomer_intakes). Ce module ne fait
 * AUCUN accès base : il typographie et met en forme des données déjà chargées. Toutes les
 * fonctions sont TOLÉRANTES aux champs absents/null (compatibilité totale, jamais de crash).
 */

/** Colonnes additives de newcomer_intakes (V2.7-A). Toutes nullables. */
export interface NewcomerIntakeJourneyFields {
  journey_step_key: string | null
  journey_status: string | null
  journey_updated_at: string | null
  journey_completed_at: string | null
  follow_up_due_at: string | null
  last_contacted_at: string | null
}

/** Statut de parcours (ouvert : on ne fige pas l'enum SQL côté client). */
export type NewcomerJourneyStatus = string

/** Ligne du catalogue d'étapes (schéma exact non figé côté app). */
export interface NewcomerJourneyStep {
  key: string
  label?: string | null
  position?: number | null
  [k: string]: unknown
}

/** Événement d'historique (schéma V2.7-A ; tolérant — on lit ce qui existe). */
export interface NewcomerJourneyEvent {
  id?: string
  newcomer_intake_id?: string
  event_type?: string | null
  from_step_key?: string | null
  to_step_key?: string | null
  from_status?: string | null
  to_status?: string | null
  step_key?: string | null
  label?: string | null
  note?: string | null
  created_by?: string | null
  created_at?: string | null
  at?: string | null
  [k: string]: unknown
}

// ── Fallbacks pastoraux sobres ───────────────────────────────────────────────
export const FALLBACK_NO_JOURNEY = 'Parcours non renseigné'
export const FALLBACK_NO_FOLLOWUP = 'Aucune relance programmée'
export const FALLBACK_NO_CONTACT = 'Aucun contact enregistré'
export const FALLBACK_NO_HISTORY = 'Aucun historique de parcours enregistré'

const s = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

/** Extrait de façon sûre les champs de parcours depuis un enregistrement d'intake. */
export function readJourneyFields(intake: unknown): NewcomerIntakeJourneyFields {
  const o = intake && typeof intake === 'object' ? (intake as Record<string, unknown>) : {}
  return {
    journey_step_key: s(o.journey_step_key),
    journey_status: s(o.journey_status),
    journey_updated_at: s(o.journey_updated_at),
    journey_completed_at: s(o.journey_completed_at),
    follow_up_due_at: s(o.follow_up_due_at),
    last_contacted_at: s(o.last_contacted_at),
  }
}

/** Le parcours est-il renseigné (au moins une étape ou un statut) ? */
export function hasJourney(f: NewcomerIntakeJourneyFields): boolean {
  return !!(f.journey_step_key || f.journey_status)
}

/** Humanise une clé technique : « first_contact » → « First contact ». */
export function humanizeKey(key: string | null | undefined): string {
  if (!key) return ''
  const t = key.replace(/[_-]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

// Libellés FR connus (best-effort ; repli sur l'humanisation de la valeur brute).
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Non démarré',
  pending: 'En attente',
  in_progress: 'En cours',
  active: 'En cours',
  on_hold: 'En pause',
  paused: 'En pause',
  completed: 'Terminé',
  done: 'Terminé',
  integrated: 'Intégré',
  archived: 'Archivé',
  cancelled: 'Annulé',
}

/** Libellé lisible d'un statut de parcours (repli sobre si absent/inconnu). */
export function journeyStatusLabel(status: string | null | undefined): string {
  if (!status) return FALLBACK_NO_JOURNEY
  return STATUS_LABELS[status] || humanizeKey(status)
}

/**
 * Libellés FR intégrés des étapes connues (V2.7-C) — repli si le référentiel SQL
 * newcomer_journey_steps est indisponible. Le catalogue SQL reste prioritaire.
 */
export const STEP_LABELS_FR: Record<string, string> = {
  received: 'Fiche reçue',
  needs_contact: 'À contacter',
  first_contact_done: 'Premier contact effectué',
  pastoral_orientation: 'Orientation pastorale',
  integration_invited: 'Invitation intégration',
  integration_started: 'Intégration commencée',
  discipleship_followup: 'Suivi discipulat',
  completed: 'Parcours terminé',
}

/** Statuts de parcours autorisés (V2.8-A mutations). */
export const JOURNEY_STATUSES = ['active', 'paused', 'completed', 'closed'] as const
export type JourneyStatusValue = (typeof JOURNEY_STATUSES)[number]
export function isValidJourneyStatus(x: unknown): x is JourneyStatusValue {
  return typeof x === 'string' && (JOURNEY_STATUSES as readonly string[]).includes(x)
}

/** Clés d'étapes reconnues pour une mutation (référentiel V2.7-A connu). */
export const JOURNEY_STEP_KEYS = Object.keys(STEP_LABELS_FR)
export function isValidJourneyStepKey(x: unknown): x is string {
  return typeof x === 'string' && JOURNEY_STEP_KEYS.includes(x)
}

/** Étapes « à contacter » d'où « Marquer contact » fait passer à first_contact_done. */
export const PRE_CONTACT_STEPS = ['received', 'needs_contact'] as const
export function isPreContactStep(stepKey: string | null | undefined): boolean {
  return !!stepKey && (PRE_CONTACT_STEPS as readonly string[]).includes(stepKey)
}

/** Construit un catalogue d'étapes depuis des lignes SQL (step_key/label), tolérant. */
export function buildStepCatalog(rows: unknown): NewcomerJourneyStep[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r))
    .map((r) => ({
      key: String(r.step_key ?? r.key ?? ''),
      label: s(r.label),
      position: typeof r.sort_order === 'number' ? r.sort_order : null,
    }))
    .filter((c) => c.key)
}

/**
 * Libellé d'étape (priorité : catalogue SQL → libellés FR intégrés → humanisation).
 * Repli sobre si aucune étape.
 */
export function journeyStepLabel(stepKey: string | null | undefined, catalog?: NewcomerJourneyStep[]): string {
  if (!stepKey) return FALLBACK_NO_JOURNEY
  const found = catalog?.find((c) => c && c.key === stepKey)
  return (found && s(found.label)) || STEP_LABELS_FR[stepKey] || humanizeKey(stepKey)
}

/** Formate une date ISO en fr-FR ; repli fourni si absente/invalide. */
export function fmtWhen(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return fallback
  try { return new Date(iso).toLocaleString('fr-FR') } catch { return fallback }
}

/** Une relance est-elle en retard par rapport à nowMs ? (false si absente). */
export function isFollowUpOverdue(f: NewcomerIntakeJourneyFields, nowMs: number): boolean {
  if (!f.follow_up_due_at) return false
  const t = Date.parse(f.follow_up_due_at)
  return !Number.isNaN(t) && t < nowMs
}

/**
 * Ligne lisible pour un événement d'historique (tolérante au schéma).
 * Utilise le catalogue d'étapes pour afficher des libellés FR (transition from → to).
 */
export function eventLine(ev: NewcomerJourneyEvent, catalog?: NewcomerJourneyStep[]): { label: string; when: string } {
  const to = s(ev.to_step_key)
  const from = s(ev.from_step_key)
  let label: string
  if (s(ev.label)) label = s(ev.label) as string
  else if (to) label = from ? `${journeyStepLabel(from, catalog)} → ${journeyStepLabel(to, catalog)}` : journeyStepLabel(to, catalog)
  else if (s(ev.step_key)) label = journeyStepLabel(s(ev.step_key), catalog)
  else if (s(ev.event_type)) label = humanizeKey(s(ev.event_type))
  else label = 'Événement'
  const when = fmtWhen(s(ev.created_at) || s(ev.at), '')
  return { label, when }
}

/** Normalise un tableau d'événements (filtre le bruit, borne). */
export function normalizeEvents(rows: unknown, max = 20): NewcomerJourneyEvent[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r): r is NewcomerJourneyEvent => !!r && typeof r === 'object' && !Array.isArray(r))
    .slice(0, max)
}
