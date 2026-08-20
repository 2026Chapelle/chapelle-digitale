/**
 * CITADELLE INTELLIGENCE HUB — HUB-3 (Campagnes)
 * Lecteur IMPUR de l'acquisition PAR CAMPAGNE (service_role only), client INJECTÉ.
 *
 * SÉPARÉ du lecteur HUB-2 : il sélectionne les colonnes utm_* (HUB-3). Si la
 * migration n'est pas appliquée, ce SELECT échoue et l'API retombe en démo — sans
 * jamais régresser l'endpoint /acquisition existant (qui ne lit pas ces colonnes).
 * Lectures bornées + parallélisées (même patron que acquisition-reader).
 */

import { ACQ_MAX_ROWS, type RowsDb, type SelectBuilder } from './acquisition-reader'
import {
  buildSessionIndex,
  resolveConversionRows,
  type SessionSourceRow,
} from '../attribution/resolve'
import type { RawCampaignVisit } from '../metrics/campaigns'

export interface CampaignWindow {
  sinceTodayIso: string
  nowIso: string
}

export interface CampaignRawData {
  visits: RawCampaignVisit[]
  signupRows: Array<SessionSourceRow | null>
  podcastRows: Array<SessionSourceRow | null>
  parcoursRows: Array<SessionSourceRow | null>
}

async function run<T>(b: SelectBuilder<T>, where: string): Promise<T[]> {
  const { data, error } = await b.limit(ACQ_MAX_ROWS)
  if (error) throw new Error(`campaign read failed on ${where}: ${error.message}`)
  return data ?? []
}

function uniq(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)))
}

const SESSION_COLS = 'session_key, user_id, source, referrer, first_seen, utm_campaign, utm_medium, utm_content'
const VISIT_COLS = 'source, referrer, utm_campaign, utm_medium, utm_content'

export async function readCampaigns(db: RowsDb, w: CampaignWindow): Promise<CampaignRawData> {
  // Vague 1 — visites + clés de conversions (indépendantes) en parallèle.
  const [visits, signups, podcast, parcours] = await Promise.all([
    run<RawCampaignVisit>(
      db.from('analytics_sessions').select<RawCampaignVisit>(VISIT_COLS).gte('first_seen', w.sinceTodayIso),
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

  const sessionKeys = uniq(podcast.map((p) => p.session_key))
  const userIds = uniq([...signups.map((s) => s.id), ...parcours.map((p) => p.user_id), ...podcast.map((p) => p.user_id)])

  // Vague 2 — sessions de résolution (portant les utm_*) en parallèle.
  const [byKeyRows, byUserRows] = await Promise.all([
    sessionKeys.length
      ? run<SessionSourceRow>(db.from('analytics_sessions').select<SessionSourceRow>(SESSION_COLS).in('session_key', sessionKeys), 'analytics_sessions/byKey')
      : Promise.resolve<SessionSourceRow[]>([]),
    userIds.length
      ? run<SessionSourceRow>(db.from('analytics_sessions').select<SessionSourceRow>(SESSION_COLS).in('user_id', userIds), 'analytics_sessions/byUser')
      : Promise.resolve<SessionSourceRow[]>([]),
  ])

  const index = buildSessionIndex([...byKeyRows, ...byUserRows])

  return {
    visits,
    signupRows: resolveConversionRows(signups.map((s) => ({ userId: s.id })), index),
    podcastRows: resolveConversionRows(podcast.map((p) => ({ sessionKey: p.session_key, userId: p.user_id })), index),
    parcoursRows: resolveConversionRows(parcours.map((p) => ({ userId: p.user_id })), index),
  }
}
