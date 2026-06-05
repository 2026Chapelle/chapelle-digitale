/**
 * PRÉSENCES — validation & statistiques PURES (testable). Aucune I/O.
 * Chantier 4. Réutilisé par le service presences-server + les routes.
 */
import { isValidMeetingUrl } from './meeting-platform'

export const REUNION_TYPES = ['physique', 'virtuelle', 'hybride'] as const
export type ReunionType = (typeof REUNION_TYPES)[number]

export const ATTENDANCE_STATUTS = ['present', 'absent', 'excuse'] as const
export type AttendanceStatut = (typeof ATTENDANCE_STATUTS)[number]

export const REUNION_STATUTS = ['planifiee', 'tenue', 'annulee'] as const

const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s : null
}

export interface ReunionInput {
  groupe_id?: unknown; titre?: unknown; description?: unknown; type?: unknown
  date_reunion?: unknown; duree_min?: unknown; lieu?: unknown; lien_visio?: unknown
}

export interface NormalizedReunion {
  groupe_id: string; titre: string; description: string | null; type: ReunionType
  date_reunion: string; duree_min: number | null; lieu: string | null; lien_visio: string | null
}

/** Valide/normalise une saisie de réunion. groupe_id, titre, date obligatoires. */
export function validateReunionInput(input: ReunionInput): { ok: boolean; errors: string[]; value?: NormalizedReunion } {
  const errors: string[] = []

  const groupe_id = typeof input.groupe_id === 'string' ? input.groupe_id.trim() : ''
  if (!groupe_id) errors.push('Le groupe est requis.')

  const titre = typeof input.titre === 'string' ? input.titre.trim() : ''
  if (!titre) errors.push('Le titre de la réunion est requis.')

  const date_reunion = typeof input.date_reunion === 'string' ? input.date_reunion.trim() : ''
  if (!date_reunion || Number.isNaN(new Date(date_reunion).getTime())) errors.push('Une date de réunion valide est requise.')

  const type = (typeof input.type === 'string' && input.type) ? input.type : 'physique'
  if (!REUNION_TYPES.includes(type as ReunionType)) errors.push('Type de réunion invalide.')

  let duree_min: number | null = null
  if (input.duree_min != null && input.duree_min !== '') {
    duree_min = Number(input.duree_min)
    if (!Number.isInteger(duree_min) || duree_min <= 0) errors.push('La durée doit être un entier > 0 (minutes).')
  }

  // Lien visio (V1) : si fourni, doit être une URL http(s) valide (sécurité).
  const lienRaw = typeof input.lien_visio === 'string' ? input.lien_visio.trim() : ''
  if (lienRaw && !isValidMeetingUrl(lienRaw)) errors.push('Le lien de réunion doit être une URL http(s) valide.')

  if (errors.length) return { ok: false, errors }
  return {
    ok: true, errors: [],
    value: {
      groupe_id, titre, description: str(input.description), type: type as ReunionType,
      date_reunion, duree_min, lieu: str(input.lieu), lien_visio: str(input.lien_visio),
    },
  }
}

export interface AttendanceStats {
  total: number; present: number; absent: number; excuse: number
  taux_presence: number   // present / total (%)
  taux_assiduite: number  // (present + excuse) / total (%)
}

/** Statistiques d'assiduité à partir d'une liste de présences. */
export function computeAttendanceStats(records: { statut: string }[]): AttendanceStats {
  const total = records.length
  const present = records.filter((r) => r.statut === 'present').length
  const absent = records.filter((r) => r.statut === 'absent').length
  const excuse = records.filter((r) => r.statut === 'excuse').length
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
  return { total, present, absent, excuse, taux_presence: pct(present), taux_assiduite: pct(present + excuse) }
}

/**
 * Nombre d'absences NON excusées consécutives, en partant de la réunion la plus
 * récente. `recordsChrono` doit être trié du plus RÉCENT au plus ancien.
 * Un « excuse » ou « present » interrompt la série.
 */
export function absenceStreak(recordsChrono: { statut: string }[]): number {
  let streak = 0
  for (const r of recordsChrono) {
    if (r.statut === 'absent') streak++
    else break
  }
  return streak
}

/** Faut-il déclencher une alerte d'absence ? (série ≥ seuil, défaut 3). */
export function shouldAlertAbsence(streak: number, threshold = 3): boolean {
  return streak >= threshold
}

/**
 * Agrège des présences par clé (groupe / plateforme / pays / leader…) — PUR.
 * Réutilise computeAttendanceStats. Trie du moins au plus assidu (taux_presence).
 */
export function aggregateAttendance(items: { key: string; statut: string }[]): { key: string; stats: AttendanceStats }[] {
  const byKey = new Map<string, { statut: string }[]>()
  for (const it of items) {
    if (!it.key) continue
    const arr = byKey.get(it.key) || []
    arr.push({ statut: it.statut })
    byKey.set(it.key, arr)
  }
  const out: { key: string; stats: AttendanceStats }[] = []
  for (const [key, recs] of Array.from(byKey)) out.push({ key, stats: computeAttendanceStats(recs) })
  return out.sort((a, b) => a.stats.taux_presence - b.stats.taux_presence)
}

export function reunionTypeLabel(t?: string | null): string {
  return t === 'virtuelle' ? 'En ligne' : t === 'hybride' ? 'Hybride' : 'Présentiel'
}
export function attendanceLabel(s?: string | null): string {
  return s === 'present' ? 'Présent' : s === 'absent' ? 'Absent' : s === 'excuse' ? 'Excusé' : '—'
}
