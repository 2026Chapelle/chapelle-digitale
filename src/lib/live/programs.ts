/**
 * PROGRAMMES LIVE — modèle d'affichage PUR (client-safe) dérivé de `live_programs`.
 *
 * ⚠️ Un programme = une PROGRAMMATION RÉGULIÈRE (définition permanente), PAS une
 * occurrence Live réelle. Les états LIVE_NOW/UPCOMING/REPLAY restent déterminés par
 * cms_lives. Ce module n'affirme jamais « EN DIRECT » — il décrit un rendez-vous habituel.
 *
 * Module PUR (aucune I/O). La lecture serveur vit dans ./load-programs.
 */
import { youtubePlaylistEmbedUrl } from '@/lib/video'
import { coerceWeekdays } from './weekdays'

export interface LiveProgram {
  id: string | null
  slug: string
  title: string
  description: string | null
  imageUrl: string | null
  weekdays: number[]              // 0=dim..6=sam ; [] = irrégulier
  startTime: string | null        // "HH:MM" (heure locale récurrente)
  timezone: string
  scheduleNote: string | null
  playlistId: string | null
  playlistEmbedUrl: string | null
}

/** Ligne brute `live_programs` (colonnes SQL). */
export interface RawLiveProgram {
  id?: string | null
  slug: string
  title: string
  description?: string | null
  image_url?: string | null
  weekdays?: unknown
  start_time?: string | null
  timezone?: string | null
  schedule_note?: string | null
  youtube_playlist_id?: string | null
  is_active?: boolean | null
  status?: string | null
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const

/** Libellés courts des jours d'un programme (dans l'ordre fourni). */
export function weekdayLabels(weekdays: number[]): string[] {
  return weekdays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6).map((n) => DAY_LABELS[n])
}

/** Normalise une heure SQL `time` ("05:30:00") ou "HH:MM" en "HH:MM", sinon null. */
export function formatStartTime(value: string | null | undefined): string | null {
  if (!value) return null
  const m = String(value).match(/^(\d{1,2}):(\d{2})/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

/** Libellé d'horaire régulier (« Lun, Mer, Ven · 05:30 »), sinon la note, sinon null. */
export function scheduleLabel(p: Pick<LiveProgram, 'weekdays' | 'startTime' | 'scheduleNote'>): string | null {
  const days = weekdayLabels(p.weekdays)
  const time = formatStartTime(p.startTime)
  if (days.length && time) return `${days.join(', ')} · ${time}`
  if (days.length) return days.join(', ')
  return p.scheduleNote || null
}

const DAY_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const

/** Créneau hebdomadaire dérivé d'un programme (un par jour de récurrence). */
export interface ProgramWeeklySlot {
  label: string       // titre du programme
  slug: string
  jour: string        // « Lundi »
  heure: string       // « 05h30 »
  dayIndex: number    // 0=dim..6=sam
  hour: number
  min: number
}

/**
 * Éclate les programmes en créneaux hebdomadaires (un par jour), triés par jour puis
 * heure. Source de vérité UNIQUE des horaires réguliers (remplace tout SCHEDULE en dur).
 * Les programmes irréguliers (weekdays vide) ou sans heure sont ignorés (pas de créneau).
 */
export function programWeeklySlots(programs: LiveProgram[]): ProgramWeeklySlot[] {
  const slots: ProgramWeeklySlot[] = []
  for (const p of programs) {
    const t = formatStartTime(p.startTime)
    if (!t) continue
    const [hh, mm] = t.split(':').map((x) => Number.parseInt(x, 10))
    for (const d of p.weekdays) {
      if (!Number.isInteger(d) || d < 0 || d > 6) continue
      slots.push({ label: p.title, slug: p.slug, jour: DAY_FULL[d], heure: `${String(hh).padStart(2, '0')}h${String(mm).padStart(2, '0')}`, dayIndex: d, hour: hh, min: mm })
    }
  }
  return slots.sort((a, b) => a.dayIndex - b.dayIndex || a.hour - b.hour || a.min - b.min)
}

/** Normalise une ligne `live_programs` brute en modèle d'affichage. */
export function normalizeProgram(row: RawLiveProgram): LiveProgram {
  const playlistId = row.youtube_playlist_id?.trim() || null
  return {
    id: row.id ?? null,
    slug: row.slug,
    title: row.title,
    description: row.description?.trim() || null,
    imageUrl: row.image_url?.trim() || null,
    weekdays: coerceWeekdays(row.weekdays),
    startTime: formatStartTime(row.start_time),
    timezone: row.timezone || 'Africa/Abidjan',
    scheduleNote: row.schedule_note?.trim() || null,
    playlistId,
    playlistEmbedUrl: playlistId ? youtubePlaylistEmbedUrl(playlistId) : null,
  }
}
