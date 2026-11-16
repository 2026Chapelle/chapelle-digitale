/**
 * CITADELLE — LIVE & REPLAY · PÉRIMÈTRE DE SYNCHRONISATION (module PUR, sans I/O).
 *
 * Problème corrigé : `planYouTubeSync` importe TOUTE diffusion terminée récente de la chaîne
 * (matinales, École du Royaume, Vendredi de puissance…) comme replay public, ce qui mélange
 * les catalogues et peut faire d'une matinale le « dernier culte ».
 *
 * Principe : avant la planification, chaque diffusion YouTube SANS fiche `cms_lives` existante est
 * classée par rapport aux programmes `live_programs`. Seules les diffusions ADMISES pour un programme
 * du périmètre (Lot 1 : `culte-de-celebration-royale`) sont transmises au planificateur ; les autres
 * sont RÉSERVÉES à leur programme (futur catalogue, Lot 2) ou mises EN REVUE (ambiguës). Rien n'est
 * supprimé, ni sur YouTube ni dans `cms_lives`. Les fiches existantes (tout statut) conservent leur
 * cycle de vie actuel : le planificateur continue de les reconnaître (anti-doublon) et de les protéger.
 *
 * Classement — le CRÉNEAU est la seule preuve d'admission ; la playlist et le titre ne font que
 * CONFIRMER ou CONTREDIRE ; toute contradiction → REVUE (jamais d'import). Ordre de priorité :
 *  1. Date de début absente → REVUE (no_start_time).
 *  2. Plusieurs créneaux, ou plusieurs playlists de programmes → REVUE (several_programs).
 *  3. Un seul créneau S (jour + heure locale du fuseau du programme, fenêtre -60/+120 min) :
 *     - playlist d'un AUTRE programme que S → REVUE (playlist_contradicts_schedule) ;
 *       ex. réel T-wX2cISBDU : prière du lundi 05:31 (créneau matinale) rangée dans la playlist du culte ;
 *     - titre nommant un autre programme que S → REVUE (title_contradicts_schedule) ;
 *     - vidéo confirmée « exceptionnelle » alors que S n'est pas du périmètre → REVUE ;
 *     - S du périmètre → ADMIS (schedule / schedule_and_playlist) ;
 *     - sinon → RÉSERVÉ à S (other_program_schedule).
 *  4. Aucun créneau (diffusion hors calendrier) :
 *     - playlist d'un programme du périmètre : ADMIS uniquement avec CONFIRMATION ÉDITORIALE EXPLICITE
 *       (`scope.confirmedVideoIds`) et sans titre contradictoire ; sinon REVUE (playlist_off_schedule).
 *       La playlist seule ne suffit JAMAIS (elle peut contenir d'autres contenus) ;
 *     - playlist d'un autre programme → RÉSERVÉ (other_program_playlist) ;
 *     - confirmation éditoriale explicite sans playlist, titre non contradictoire → ADMIS ;
 *       (confirmation dont le titre nomme un autre programme → REVUE, confirmation_contradicts_title) ;
 *     - titre évoquant le programme cible → REVUE (title_suggests_target_off_schedule) ;
 *     - sinon → HORS PROGRAMME (no_program_match).
 *
 * Extensible (Lot 2) : `scope.programs` liste les programmes admis ; ajouter `matinale` avec son propre
 * catalogue de destination suffira, sans réécrire le classement.
 */
import type { YouTubeItem } from '@/lib/home/youtube-live'
import { youtubeVideoIdFrom } from '@/lib/home/contextual'
import type { CmsLiveSyncRow, SyncOperation } from './youtube-sync'

/** Lot 1 : seul le Culte de Célébration Royale est importé automatiquement. */
export const LOT1_SYNC_SCOPE: SyncScope = { programs: ['culte-de-celebration-royale'] }
/** Fenêtre autour de l'heure récurrente du programme (minutes) : retard de démarrage courant toléré. */
export const SLOT_EARLY_MINUTES = 60
export const SLOT_LATE_MINUTES = 120

/**
 * `confirmedVideoIds` : confirmation éditoriale EXPLICITE (cultes exceptionnels hors calendrier), par
 * identifiant vidéo. Seule voie d'admission hors créneau. Vide par défaut.
 */
export type SyncScope = { programs: string[]; confirmedVideoIds?: string[] }

export type LiveProgramRow = {
  id: string
  slug: string
  title?: string | null
  weekdays?: number[] | null
  start_time?: string | null
  timezone?: string | null
  youtube_playlist_id?: string | null
  status?: string | null
  is_active?: boolean | null
}

export type ScopeVerdict = 'admitted' | 'reserved' | 'review' | 'out_of_scope'
export type ScopeDecision = {
  videoId: string
  verdict: ScopeVerdict
  /** Programme retenu (admis ou réservé). */
  program: string | null
  programId: string | null
  /** Preuve ou motif, non sensible. */
  reason:
    | 'schedule' | 'schedule_and_playlist' | 'editorial_confirmation'
    | 'other_program_schedule' | 'other_program_playlist'
    | 'several_programs' | 'playlist_contradicts_schedule' | 'title_contradicts_schedule' | 'confirmation_contradicts_schedule' | 'confirmation_contradicts_title'
    | 'playlist_off_schedule' | 'title_suggests_target_off_schedule' | 'no_start_time' | 'no_program_match'
  start: string | null
  title: string | null
}

export type ScopeInput = {
  active: YouTubeItem[]
  upcoming: YouTubeItem[]
  completed: YouTubeItem[]
  rows: CmsLiveSyncRow[]
  programs: LiveProgramRow[]
  /** Identifiants vidéo des playlists des programmes (par slug), quand disponibles. */
  playlistVideoIds?: Record<string, string[]>
  scope: SyncScope
}

export type ScopeResult = {
  active: YouTubeItem[]
  upcoming: YouTubeItem[]
  completed: YouTubeItem[]
  decisions: ScopeDecision[]
}

const videoIdOf = (item: YouTubeItem) => (typeof item.id === 'string' ? item.id : item.id?.videoId) || ''

/** Programmes utilisables : publiés et actifs. */
export const usablePrograms = (programs: LiveProgramRow[]) => programs.filter(p => p.status === 'published' && p.is_active !== false)

/** Programme du périmètre introuvable / non publié / inactif → la synchronisation doit refuser d'écrire. */
export function missingScopePrograms(programs: LiveProgramRow[], scope: SyncScope): string[] {
  const usable = new Set(usablePrograms(programs).map(p => p.slug))
  return scope.programs.filter(slug => !usable.has(slug))
}

/** Jour (0 = dimanche) et minutes depuis minuit dans le fuseau du programme. */
export function localSlot(iso: string, timeZone: string): { weekday: number; minutes: number } | null {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t))
  } catch {
    return null // fuseau invalide : aucun créneau (jamais d'admission par défaut)
  }
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  const minutes = Number(get('hour')) * 60 + Number(get('minute'))
  return weekday < 0 || !Number.isFinite(minutes) ? null : { weekday, minutes }
}

function startMinutes(value?: string | null): number | null {
  const m = typeof value === 'string' ? value.match(/^(\d{1,2}):(\d{2})/) : null
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Programmes dont le créneau récurrent contient l'instant donné. */
export function programsMatchingSlot(iso: string | null | undefined, programs: LiveProgramRow[]): LiveProgramRow[] {
  if (!iso) return []
  return programs.filter(p => {
    const start = startMinutes(p.start_time)
    if (start === null || !Array.isArray(p.weekdays) || !p.weekdays.length) return false
    const slot = localSlot(iso, p.timezone || 'Africa/Abidjan')
    if (!slot || !p.weekdays.includes(slot.weekday)) return false
    return slot.minutes >= start - SLOT_EARLY_MINUTES && slot.minutes <= start + SLOT_LATE_MINUTES
  })
}

const norm = (s?: string | null) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
/** Indices de titre (jamais suffisants seuls) : nom ou slug d'un programme cité dans le titre. */
function titleMentions(title: string | null, program: LiveProgramRow): boolean {
  const t = norm(title)
  if (!t) return false
  const words = [norm(program.title), norm(program.slug).replace(/-/g, ' ')].filter(w => w.length >= 5)
  if (program.slug === 'culte-de-celebration-royale') words.push('culte')
  return words.some(w => t.includes(w))
}

/** Début de diffusion connu : réel, sinon programmé. */
const startOf = (item: YouTubeItem): string | null =>
  item.snippet?.actualStartTime || item.liveStreamingDetails?.actualStartTime || item.snippet?.scheduledStartTime || item.liveStreamingDetails?.scheduledStartTime || null

export function classifyForScope(item: YouTubeItem, programs: LiveProgramRow[], scope: SyncScope, playlistVideoIds: Record<string, string[]> = {}): ScopeDecision {
  const videoId = videoIdOf(item)
  const title = item.snippet?.title ?? null
  const start = startOf(item)
  const usable = usablePrograms(programs)
  const inScope = (p: LiveProgramRow) => scope.programs.includes(p.slug)
  const confirmed = (scope.confirmedVideoIds || []).includes(videoId)
  const decide = (verdict: ScopeVerdict, reason: ScopeDecision['reason'], p: LiveProgramRow | null): ScopeDecision =>
    ({ videoId, title, start, verdict, reason, program: p?.slug ?? null, programId: p?.id ?? null })
  /** Le titre nomme un autre programme que `p` (sans nommer `p`) : contradiction. */
  const titleContradicts = (p: LiveProgramRow) => usable.some(o => o.slug !== p.slug && titleMentions(title, o) && !titleMentions(title, p))

  // 1) Sans date : jamais d'admission.
  if (!start) return decide('review', 'no_start_time', null)

  // 2) Signaux multiples incompatibles.
  const slots = programsMatchingSlot(start, usable)
  const playlists = usable.filter(p => (playlistVideoIds[p.slug] || []).includes(videoId))
  if (slots.length > 1 || playlists.length > 1) return decide('review', 'several_programs', null)
  const playlist = playlists[0] ?? null

  // 3) Un seul créneau : seule preuve d'admission ; toute contradiction → revue.
  if (slots.length === 1) {
    const slot = slots[0]
    if (playlist && playlist.slug !== slot.slug) return decide('review', 'playlist_contradicts_schedule', null)
    if (titleContradicts(slot)) return decide('review', 'title_contradicts_schedule', null)
    if (inScope(slot)) return decide('admitted', playlist ? 'schedule_and_playlist' : 'schedule', slot)
    if (confirmed) return decide('review', 'confirmation_contradicts_schedule', null)
    return decide('reserved', 'other_program_schedule', slot)
  }

  // 4) Hors calendrier : la playlist seule ne suffit jamais pour le périmètre.
  if (playlist) {
    if (!inScope(playlist)) return decide('reserved', 'other_program_playlist', playlist)
    if (confirmed && titleContradicts(playlist)) return decide('review', 'confirmation_contradicts_title', null)
    return confirmed ? decide('admitted', 'editorial_confirmation', playlist) : decide('review', 'playlist_off_schedule', null)
  }
  const target = usable.find(inScope) ?? null
  if (confirmed && target) return titleContradicts(target) ? decide('review', 'confirmation_contradicts_title', null) : decide('admitted', 'editorial_confirmation', target)
  const hinted = usable.find(p => inScope(p) && titleMentions(title, p))
  if (hinted) return decide('review', 'title_suggests_target_off_schedule', null)
  return decide('out_of_scope', 'no_program_match', null)
}

/** Identifiants confirmés (variable d'environnement, liste séparée par des virgules) : seuls les identifiants YouTube valides sont retenus. */
export function parseConfirmedVideoIds(raw: string | undefined | null): string[] {
  return Array.from(new Set((raw || '').split(/[\s,;]+/).map(v => v.trim()).filter(v => /^[\w-]{11}$/.test(v))))
}

/**
 * Filtre les entrées du planificateur. Une diffusion déjà présente dans `cms_lives` (quel que soit son
 * statut, URL avec espaces/tabulations comprise) est TOUJOURS transmise : le planificateur garde la main
 * sur son cycle de vie et l'anti-doublon. Seules les NOUVELLES diffusions sont soumises au périmètre.
 */
export function scopeSyncInput(input: ScopeInput): ScopeResult {
  const known = new Set(input.rows.map(r => youtubeVideoIdFrom(r.youtube_url)).filter((id): id is string => Boolean(id)))
  const decisions: ScopeDecision[] = []
  const seen = new Map<string, ScopeDecision>()
  const keep = (item: YouTubeItem) => {
    const id = videoIdOf(item)
    if (!id) return false
    if (known.has(id)) return true
    let d = seen.get(id)
    if (!d) { d = classifyForScope(item, input.programs, input.scope, input.playlistVideoIds); seen.set(id, d); decisions.push(d) }
    return d.verdict === 'admitted'
  }
  return { active: input.active.filter(keep), upcoming: input.upcoming.filter(keep), completed: input.completed.filter(keep), decisions }
}

/** Renseigne `program_id` des INSERTIONS admises (les mises à jour de fiches existantes n'y touchent jamais). */
export function attachProgramIds(operations: SyncOperation[], decisions: ScopeDecision[]): Array<SyncOperation & { programId?: string }> {
  const byVideo = new Map(decisions.filter(d => d.verdict === 'admitted').map(d => [d.videoId, d.programId]))
  return operations.map(op => (op.kind === 'insert' && byVideo.get(op.videoId) ? { ...op, programId: byVideo.get(op.videoId) as string } : op))
}
