/**
 * CITADELLE INTELLIGENCE HUB — HUB-2 (First-party attribution)
 * Lecteur IMPUR de l'acquisition (service_role only). Le client est INJECTÉ (port
 * `RowsDb`) pour rester testable sans réseau. Toutes les lectures sont BORNÉES
 * (limit) et filtrées sur la fenêtre du jour ; on ne renvoie jamais de PII —
 * seulement des sources normalisées agrégées ensuite.
 */

import {
  buildSessionIndex,
  resolveConversions,
  type RawVisitSession,
  type SessionSourceRow,
} from '../attribution/resolve'
import type { NormalizedSource, NormalizeOptions } from '../attribution/normalize'

/** Borne de sécurité par lecture (fenêtre d'un jour → volumes modestes). */
export const ACQ_MAX_ROWS = 20_000

export interface RowsResult<T> {
  data: T[] | null
  error: { message: string } | null
}
export interface SelectBuilder<T> extends PromiseLike<RowsResult<T>> {
  eq(col: string, val: string): SelectBuilder<T>
  in(col: string, vals: string[]): SelectBuilder<T>
  gte(col: string, val: string): SelectBuilder<T>
  limit(n: number): SelectBuilder<T>
}
export interface RowsDb {
  from(table: string): { select<T = unknown>(cols: string): SelectBuilder<T> }
}

export interface AcquisitionWindow {
  sinceTodayIso: string
  nowIso: string
}

export interface AcquisitionRawData {
  visits: RawVisitSession[]
  signupSources: Array<NormalizedSource | null>
  podcastSources: Array<NormalizedSource | null>
  parcoursSources: Array<NormalizedSource | null>
}

async function run<T>(b: SelectBuilder<T>, where: string): Promise<T[]> {
  const { data, error } = await b.limit(ACQ_MAX_ROWS)
  if (error) throw new Error(`acquisition read failed on ${where}: ${error.message}`)
  return data ?? []
}

function uniq(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)))
}

/**
 * Lit et RÉSOUT l'acquisition du jour. Retourne des visites brutes (source/referrer)
 * + les sources résolues (ou null) pour chaque conversion.
 */
export async function readAcquisition(
  db: RowsDb,
  w: AcquisitionWindow,
  opts?: NormalizeOptions,
): Promise<AcquisitionRawData> {
  // 1) Vague 1 — 4 lectures INDÉPENDANTES en parallèle (visites + clés de conversions).
  //    NB podcast : play_start + play_resume = volume d'ÉCOUTES (plays), pas plays uniques,
  //    cohérent avec le total_plays canonique d'audio-analytics.
  const [visits, signups, podcast, parcours] = await Promise.all([
    run<RawVisitSession>(
      db.from('analytics_sessions').select<RawVisitSession>('source, referrer').gte('first_seen', w.sinceTodayIso),
      'analytics_sessions/visits',
    ),
    run<{ id: string }>(
      db.from('profiles').select<{ id: string }>('id').gte('created_at', w.sinceTodayIso),
      'profiles/signups',
    ),
    run<{ session_key: string | null; user_id: string | null }>(
      db
        .from('audio_listening_events')
        .select<{ session_key: string | null; user_id: string | null }>('session_key, user_id')
        .in('event_type', ['play_start', 'play_resume'])
        .gte('occurred_at', w.sinceTodayIso),
      'audio_listening_events/podcast',
    ),
    run<{ user_id: string | null }>(
      db.from('module_completions').select<{ user_id: string | null }>('user_id').gte('completed_at', w.sinceTodayIso),
      'module_completions/parcours',
    ),
  ])

  // 2) Sessions nécessaires à la résolution (par clé de session et par utilisateur).
  const sessionKeys = uniq(podcast.map((p) => p.session_key))
  const userIds = uniq([
    ...signups.map((s) => s.id),
    ...parcours.map((p) => p.user_id),
    ...podcast.map((p) => p.user_id),
  ])

  // 3) Vague 2 — les deux lectures de résolution en parallèle.
  const COLS = 'session_key, user_id, source, referrer, first_seen'
  const [byKeyRows, byUserRows] = await Promise.all([
    sessionKeys.length
      ? run<SessionSourceRow>(db.from('analytics_sessions').select<SessionSourceRow>(COLS).in('session_key', sessionKeys), 'analytics_sessions/byKey')
      : Promise.resolve<SessionSourceRow[]>([]),
    userIds.length
      ? run<SessionSourceRow>(db.from('analytics_sessions').select<SessionSourceRow>(COLS).in('user_id', userIds), 'analytics_sessions/byUser')
      : Promise.resolve<SessionSourceRow[]>([]),
  ])

  const index = buildSessionIndex([...byKeyRows, ...byUserRows])

  // 4) Résolution PURE (session_key prioritaire, sinon session la plus ancienne du user).
  const signupSources = resolveConversions(signups.map((s) => ({ userId: s.id })), index, opts)
  const podcastSources = resolveConversions(
    podcast.map((p) => ({ sessionKey: p.session_key, userId: p.user_id })),
    index,
    opts,
  )
  const parcoursSources = resolveConversions(parcours.map((p) => ({ userId: p.user_id })), index, opts)

  return { visits, signupSources, podcastSources, parcoursSources }
}
