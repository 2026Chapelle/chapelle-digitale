import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { fetchOwnedBroadcasts, fetchVideoDetails, youtubeErrorCode, __resetYouTubeLiveCache } from '@/lib/home/youtube-live'
import { loadYouTubeConfig } from '@/lib/intelligence/connectors/youtube/config'
import { youtubeVideoIdFrom } from '@/lib/home/contextual'
import {
  countLifecycleStates,
  planYouTubeSync,
  videoIdsToVerify,
  REPLAY_PENDING_STATUS,
  type CmsLiveSyncRow,
  type SyncOperation,
  type SyncSkip,
  type SyncStateCounts,
} from './youtube-sync'

/**
 * CITADELLE — LIVE & REPLAY AUTOMATIQUE V1 · Exécuteur serveur (SERVER-ONLY).
 *
 * Lit YouTube (lecture seule, OAuth propriétaire), planifie (module pur) puis écrit `cms_lives`
 * via le service role. Journalisé dans `cron_runs` (job `youtube-live-sync`, table existante).
 * Idempotent : relançable à volonté. Concurrence : verrou intra-processus + bail `cron_runs` (120 s) +
 * insertion vérifiée (anti-doublon inter-processus). Coût quota par passage : 3 appels liveBroadcasts.list
 * (active, upcoming, completed) + 1 appel videos.list par lot de 50 identifiants ≈ 4 unités.
 * Aucune donnée n'est jamais supprimée ; les lignes `ended`/`published`/`draft` ne sont jamais réécrites.
 */
export const SYNC_JOB = 'youtube-live-sync'
const ROWS_LIMIT = 300
const ROWS_WINDOW_MS = 90 * 24 * 60 * 60_000
/** Bail d'exécution : un passage démarré depuis moins longtemps et non terminé bloque les suivants. */
export const SYNC_LEASE_MS = 120_000
/** Verrou intra-processus : deux appels simultanés dans le même processus Passenger sont sérialisés. */
let inflight: Promise<YouTubeSyncSummary> | null = null

export type YouTubeSyncSummary = {
  ok: boolean
  error: string | null
  checkedAt: string
  inserted: number
  updated: number
  /** Lignes créées puis retirées parce qu'une course avait déjà créé la même vidéo. */
  deduplicated: number
  lifecycle: Record<'scheduled' | 'live' | 'replay_pending' | 'replay_available', number>
  pendingVideoIds: string[]
  skipped: SyncSkip[]
  writeErrors: number
  states: SyncStateCounts | null
}

export type YouTubeSyncStatus = {
  configured: boolean
  lastRun: { startedAt: string; finishedAt: string | null; ok: boolean | null; summary: Record<string, unknown> } | null
  states: SyncStateCounts | null
}

type SyncOptions = { now?: Date; fetchImpl?: typeof fetch; trigger?: 'cron' | 'admin' }

async function loadRows(now: Date): Promise<CmsLiveSyncRow[]> {
  const since = new Date(now.getTime() - ROWS_WINDOW_MS).toISOString()
  const { data, error } = await supabaseAdmin
    .from('cms_lives')
    .select('id,title,description,youtube_url,video_url,cover_url,scheduled_at,is_live,platform,status,created_at,updated_at')
    .or(`youtube_url.not.is.null,status.in.(scheduled,live,${REPLAY_PENDING_STATUS}),created_at.gte.${since}`)
    .order('created_at', { ascending: false })
    .limit(ROWS_LIMIT)
  if (error) throw new Error('cms_lives_read_failed')
  return (data as CmsLiveSyncRow[]) || []
}

/**
 * Insertion VÉRIFIÉE : après création, on relit toutes les lignes portant le même identifiant vidéo.
 * S'il en existe plusieurs (course entre deux cron/relances sur des processus différents), la ligne que
 * nous venons de créer est retirée (elle n'a encore ni réaction ni progression) et la plus ancienne reste.
 * Renvoie true si notre ligne a été conservée.
 */
async function insertVerified(op: Extract<SyncOperation, { kind: 'insert' }>): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('cms_lives').insert({ ...op.row, sort_order: 0 }).select('id,created_at').single()
  if (error) throw new Error('cms_lives_insert_failed')
  const ours = (data as { id: string; created_at?: string } | null)
  if (!ours?.id) return true
  const { data: twins } = await supabaseAdmin.from('cms_lives').select('id,youtube_url,created_at').ilike('youtube_url', `%${op.videoId}%`).order('created_at', { ascending: true }).limit(10)
  const exact = ((twins as Array<{ id: string; youtube_url?: string | null; created_at?: string }> | null) || []).filter(t => youtubeVideoIdFrom(t.youtube_url) === op.videoId)
  if (exact.length > 1 && exact[0].id !== ours.id) {
    await supabaseAdmin.from('cms_lives').delete().eq('id', ours.id).eq('youtube_url', op.row.youtube_url).eq('status', op.row.status)
    return false
  }
  return true
}

async function applyOperation(op: SyncOperation, nowIso: string): Promise<'inserted' | 'updated' | 'deduplicated'> {
  if (op.kind === 'insert') return (await insertVerified(op)) ? 'inserted' : 'deduplicated'
  const { error } = await supabaseAdmin.from('cms_lives').update({ ...op.patch, updated_at: nowIso }).eq('id', op.id)
  if (error) throw new Error('cms_lives_update_failed')
  return 'updated'
}

/** Prend le bail : refuse si un autre passage a démarré depuis moins de SYNC_LEASE_MS sans se terminer. */
async function acquireLease(startedAt: string, nowMs: number): Promise<{ runId: string | null; busy: boolean }> {
  try {
    const since = new Date(nowMs - SYNC_LEASE_MS).toISOString()
    const { data: running } = await supabaseAdmin.from('cron_runs').select('id').eq('job', SYNC_JOB).is('finished_at', null).gte('started_at', since).limit(1)
    if (Array.isArray(running) && running.length) return { runId: null, busy: true }
    const { data } = await supabaseAdmin.from('cron_runs').insert({ job: SYNC_JOB, started_at: startedAt }).select('id').single()
    return { runId: (data as { id?: string } | null)?.id ?? null, busy: false }
  } catch {
    return { runId: null, busy: false } // table absente → pas de bail distribué, le verrou processus reste actif
  }
}

async function journal(runId: string | null, summary: YouTubeSyncSummary, trigger: string): Promise<void> {
  if (!runId) return
  try {
    await supabaseAdmin.from('cron_runs').update({
      finished_at: new Date().toISOString(),
      ok: summary.ok,
      summary: { trigger, error: summary.error, inserted: summary.inserted, updated: summary.updated, deduplicated: summary.deduplicated, lifecycle: summary.lifecycle, pending: summary.pendingVideoIds.length, skipped: summary.skipped.length, writeErrors: summary.writeErrors },
    }).eq('id', runId)
  } catch { /* journal best-effort : jamais bloquant */ }
}

/** Passage complet de synchronisation (cron ou relance admin). Ne lève jamais. Sérialisé par processus. */
export async function syncYouTubeLives(options: SyncOptions = {}): Promise<YouTubeSyncSummary> {
  if (inflight) return inflight
  inflight = runSync(options).finally(() => { inflight = null })
  return inflight
}

async function runSync(options: SyncOptions): Promise<YouTubeSyncSummary> {
  const now = options.now || new Date()
  const startedAt = now.toISOString()
  const summary: YouTubeSyncSummary = { ok: false, error: null, checkedAt: startedAt, inserted: 0, updated: 0, deduplicated: 0, lifecycle: { scheduled: 0, live: 0, replay_pending: 0, replay_available: 0 }, pendingVideoIds: [], skipped: [], writeErrors: 0, states: null }

  if (IS_DEMO_MODE) return { ...summary, ok: true, error: 'demo_mode' }
  if (!loadYouTubeConfig()) return { ...summary, error: 'youtube_oauth_not_configured' }

  const lease = await acquireLease(startedAt, now.getTime())
  if (lease.busy) return { ...summary, ok: true, error: 'sync_already_running' }

  try {
    const [active, upcoming, completed] = await Promise.all(
      (['active', 'upcoming', 'completed'] as const).map(status => fetchOwnedBroadcasts(status, options)),
    )
    const rows = await loadRows(now)
    const videos = await fetchVideoDetails(videoIdsToVerify({ completed, rows, now }), options)
    const plan = planYouTubeSync({ active, upcoming, completed, videos, rows, now })

    for (const op of plan.operations) {
      try {
        const outcome = await applyOperation(op, startedAt)
        if (outcome === 'inserted') summary.inserted++
        else if (outcome === 'updated') summary.updated++
        else summary.deduplicated++
        if (outcome !== 'deduplicated') summary.lifecycle[op.lifecycle]++
      } catch {
        summary.writeErrors++
      }
    }
    summary.pendingVideoIds = plan.pendingVideoIds
    summary.skipped = plan.skipped
    summary.ok = summary.writeErrors === 0
    summary.error = summary.ok ? null : 'cms_lives_write_failed'
    if (summary.inserted + summary.updated > 0) __resetYouTubeLiveCache()
    try { summary.states = countLifecycleStates(await loadRows(now)) } catch { summary.states = null }
  } catch (err) {
    const code = youtubeErrorCode(err)
    summary.error = code === 'youtube_live_error' && err instanceof Error && /^cms_lives_/.test(err.message) ? err.message : code
    console.warn(`[youtube-sync] run failed: ${summary.error}`)
  }

  await journal(lease.runId, summary, options.trigger || 'cron')
  return summary
}

/** État de la synchronisation pour l'administration (dernier passage + comptage des états). */
export async function getYouTubeSyncStatus(now = new Date()): Promise<YouTubeSyncStatus> {
  const status: YouTubeSyncStatus = { configured: loadYouTubeConfig() !== null, lastRun: null, states: null }
  if (IS_DEMO_MODE) return status
  try {
    const { data } = await supabaseAdmin.from('cron_runs').select('started_at,finished_at,ok,summary').eq('job', SYNC_JOB).order('started_at', { ascending: false }).limit(1).maybeSingle()
    const run = data as { started_at: string; finished_at: string | null; ok: boolean | null; summary: Record<string, unknown> } | null
    if (run) status.lastRun = { startedAt: run.started_at, finishedAt: run.finished_at, ok: run.ok, summary: run.summary || {} }
  } catch { /* table absente → pas d'historique */ }
  try { status.states = countLifecycleStates(await loadRows(now)) } catch { status.states = null }
  return status
}

/** Tests uniquement : libère le verrou intra-processus. */
export function __resetYouTubeSyncLock() { inflight = null }
