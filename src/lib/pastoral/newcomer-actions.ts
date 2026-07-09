/**
 * Actions pastorales enregistrables d'un « Nouveau Venu » (V2.6-C) — logique PURE.
 *
 * Persiste des ACTIONS faites + une relance prévue dans metadata.pastoral_journey (jsonb
 * DÉJÀ existant de newcomer_intakes) — AUCUN SQL, aucune migration, aucune nouvelle table.
 * Le merge est NON DESTRUCTIF (même patron que [[newcomer-notes]] mergeAdminNote) : il
 * préserve metadata.admin_note et toutes les autres clés. Testable en isolation.
 *
 * ⚠️ Ce n'est pas un historique multi-acteurs (réservé à V2.7 : table dédiée + RLS).
 */

/** Whitelist des actions pastorales (clé stable → libellé FR). Aucune autre clé acceptée. */
export const PASTORAL_ACTIONS = [
  { key: 'first_contact', label: 'Premier contact effectué' },
  { key: 'welcome_message', label: 'Message de bienvenue envoyé' },
  { key: 'pastoral_need', label: 'Besoin pastoral identifié' },
  { key: 'encouragement', label: 'Prière / encouragement envoyé' },
  { key: 'orientation', label: 'Orientation proposée' },
  { key: 'integrated', label: 'Intégré / accompagné' },
] as const

export type PastoralActionKey = (typeof PASTORAL_ACTIONS)[number]['key']

const ACTION_LABELS: Record<string, string> = Object.fromEntries(PASTORAL_ACTIONS.map((a) => [a.key, a.label]))

export const STEP_LABEL_MAX = 200
export const PASTORAL_JOURNEY_MAX_STEPS = 50

export interface CompletedStep {
  key: string
  label: string
  at: string // ISO 8601
}

export interface PastoralJourney {
  completed_steps: CompletedStep[]
  last_action: CompletedStep | null
  next_follow_up_at: string | null
}

/** Clé d'action reconnue ? */
export function isValidActionKey(key: unknown): key is PastoralActionKey {
  return typeof key === 'string' && key in ACTION_LABELS
}

/** Libellé FR d'une action (ou la clé brute si inconnue — jamais utilisé pour écrire). */
export function actionLabel(key: string): string {
  return ACTION_LABELS[key] || key
}

/** Valide une date ISO 8601 ; renvoie l'ISO si valide, sinon null. */
export function toValidIso(iso: unknown): string | null {
  if (typeof iso !== 'string' || !iso.trim()) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : iso
}

/** Journey vierge. */
export function createEmptyJourney(): PastoralJourney {
  return { completed_steps: [], last_action: null, next_follow_up_at: null }
}

/** Lit un PastoralJourney depuis metadata (défensif ; repli vierge si absent/malformé). */
export function parseJourney(metadata: unknown): PastoralJourney {
  const j = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>).pastoral_journey
    : null
  if (!j || typeof j !== 'object' || Array.isArray(j)) return createEmptyJourney()
  const raw = j as Record<string, unknown>
  const steps = Array.isArray(raw.completed_steps)
    ? raw.completed_steps
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && !Array.isArray(s))
        .map((s) => ({ key: String(s.key ?? ''), label: String(s.label ?? ''), at: String(s.at ?? '') }))
        .filter((s) => s.key && toValidIso(s.at))
    : []
  const la = raw.last_action
  const lastAction = la && typeof la === 'object' && !Array.isArray(la)
    ? (() => {
        const o = la as Record<string, unknown>
        const at = toValidIso(o.at)
        return o.key && at ? { key: String(o.key), label: String(o.label ?? ''), at } : null
      })()
    : null
  return {
    completed_steps: steps,
    last_action: lastAction,
    next_follow_up_at: toValidIso(raw.next_follow_up_at),
  }
}

/** Ajoute (ou remplace, dédup par clé) une étape complétée. Non mutant. */
export function addCompletedStep(journey: PastoralJourney, key: string, label: string, at: string): PastoralJourney {
  const vAt = toValidIso(at)
  if (!vAt) throw new Error('Date invalide.')
  const vLabel = (label || '').trim().slice(0, STEP_LABEL_MAX) || key
  const steps = journey.completed_steps.filter((s) => s.key !== key)
  steps.push({ key, label: vLabel, at: vAt })
  if (steps.length > PASTORAL_JOURNEY_MAX_STEPS) steps.splice(0, steps.length - PASTORAL_JOURNEY_MAX_STEPS)
  return { ...journey, completed_steps: steps }
}

/**
 * Applique une action pastorale reconnue : marque l'étape faite (horodatée) et la
 * définit comme dernière action. Rejette une clé hors whitelist. Non mutant.
 */
export function applyAction(journey: PastoralJourney, key: string, nowIso: string): PastoralJourney {
  if (!isValidActionKey(key)) throw new Error('Action inconnue.')
  const at = toValidIso(nowIso)
  if (!at) throw new Error('Horodatage invalide.')
  const label = actionLabel(key)
  const next = addCompletedStep(journey, key, label, at)
  return { ...next, last_action: { key, label, at } }
}

/** Définit la relance prévue (ISO) ou la retire (null). Non mutant. */
export function setNextFollowUp(journey: PastoralJourney, iso: string | null): PastoralJourney {
  if (iso === null) return { ...journey, next_follow_up_at: null }
  const v = toValidIso(iso)
  if (!v) throw new Error('Date de relance invalide.')
  return { ...journey, next_follow_up_at: v }
}

export interface PastoralJourneyMerge {
  metadata: Record<string, unknown>
  journey: PastoralJourney
}

/**
 * Fusionne le journey dans metadata SANS écraser admin_note ni les autres clés.
 * Spread shallow (comme mergeAdminNote). Ne mute pas les sources.
 */
export function mergePastoralJourney(metadata: unknown, journey: PastoralJourney, nowIso?: string): PastoralJourneyMerge {
  const base: Record<string, unknown> =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {}
  base.pastoral_journey = journey
  if (nowIso) base.pastoral_journey_updated_at = nowIso
  return { metadata: base, journey }
}

/** Une action est-elle déjà marquée faite ? */
export function isStepDone(journey: PastoralJourney, key: string): boolean {
  return journey.completed_steps.some((s) => s.key === key)
}
