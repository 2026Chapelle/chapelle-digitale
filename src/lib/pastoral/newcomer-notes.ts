/**
 * Note pastorale interne sur une demande « Nouveau Venu » (V2.2-B).
 *
 * Stockée dans le champ `metadata` (jsonb) DÉJÀ EXISTANT de public.newcomer_intakes
 * — aucune colonne ajoutée, aucun SQL, aucune migration. `mergeAdminNote` est PURE
 * et NON destructive : elle préserve toutes les autres clés de `metadata`.
 */
export const ADMIN_NOTE_MAX = 2000

export interface AdminNoteMerge {
  metadata: Record<string, unknown>
  note: string // texte normalisé effectivement écrit (borné)
}

/** Normalise une note : trim + borne la longueur. Renvoie '' si vide / non-string. */
export function normalizeAdminNote(note: unknown): string {
  if (typeof note !== 'string') return ''
  return note.trim().slice(0, ADMIN_NOTE_MAX)
}

/**
 * Fusionne une note pastorale dans un objet `metadata` sans écraser les autres clés.
 * Ne mute pas l'objet source. Repart d'un objet vide si metadata est null/invalide.
 * @throws si la note normalisée est vide (rien à écrire).
 */
export function mergeAdminNote(metadata: unknown, note: unknown, nowIso: string): AdminNoteMerge {
  const clean = normalizeAdminNote(note)
  if (!clean) throw new Error('Note vide.')
  const base: Record<string, unknown> =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {}
  base.admin_note = clean
  base.admin_note_at = nowIso
  return { metadata: base, note: clean }
}
