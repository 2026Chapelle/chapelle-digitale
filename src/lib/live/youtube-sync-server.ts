import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { fetchOwnedBroadcasts, fetchVideoDetails, youtubeErrorCode, __resetYouTubeLiveCache } from '@/lib/home/youtube-live'
import { loadYouTubeConfig } from '@/lib/intelligence/connectors/youtube/config'
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
 * Idempotent : relançable à volonté. Coût quota par passage : 3 appels liveBroadcasts.list
 * (active, upcoming, completed) + 1 appel videos.list par lot de 50 identifiants ≈ 4 unités.
 * Aucune donnée n'est jamais supprimée ; les lignes `ended`/`published`/`draft` ne sont jamais réécrites.
 */
export const SYNC_JOB = 'youtube-live-sync'
const ROWS_LIMIT = 300
const ROWS_WINDOW_MS = 90 * 24 * 60 * 60_000

export type YouTubeSyncSummary = {
  ok: boolean
  error: string | null
  checkedAt: string
  inserted: number
  updated: number
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

async function applyOperation(op: SyncOperation, nowIso: string): Promise<void> {
  if (op.kind === 'insert') {
    const { error } = await supabaseAdmin.from('cms_lives').insert({ ...op.row, sort_order: 0 })
    if (error) throw new Error('cms_lives_insert_failed')
    return
  }
  const { error } = await supabaseAdmin.from('cms_lives').update({ ...op.patch, updated_at: nowIso }).eq('id', op.id)
  if (error) throw new Error('cms_lives_update_failed')
}

async function journal(startedAt: string, summary: YouTubeSyncSummary, trigger: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin.from('cron_runs').insert({ job: SYNC_JOB, started_at: startedAt }).select('id').single()
    const runId = (data as { id?: string } | null)?.id
    if (!runId) return
    await supabaseAdmin.from('cron_runs').update({
      finished_at: new Date().toISOString(),
      ok: summary.ok,
      summary: { trigger, error: summary.error, inserted: summary.inserted, updated: summary.updated, lifecycle: summary.lifecycle, pending: summary.pendingVideoIds.length, skipped: summary.skipped.length, writeErrors: summary.writeErrors },
    }).eq('id', runId)
  } catch { /* journal best-effort : jamais bloquant */ }
}

/** Passage complet de synchronisation (cron ou relance admin). Ne lève jamais. */
export async function syncYouTubeLives(options: SyncOptions = {}): Promise<YouTubeSyncSummary> {
  const now = options.now || new Date()
  const startedAt = now.toISOString()
  const summary: YouTubeSyncSummary = { ok: false, error: null, checkedAt: startedAt, inserted: 0, updated: 0, lifecycle: { scheduled: 0, live: 0, replay_pending: 0, replay_available: 0 }, pendingVideoIds: [], skipped: [], writeErrors: 0, states: null }

  if (IS_DEMO_MODE) return { ...summary, ok: true, error: 'demo_mode' }
  if (!loadYouTubeConfig()) return { ...summary, error: 'youtube_oauth_not_configured' }

  try {
    const [active, upcoming, completed] = await Promise.all(
      (['active', 'upcoming', 'completed'] as const).map(status => fetchOwnedBroadcasts(status, options)),
    )
    const rows = await loadRows(now)
    const videos = await fetchVideoDetails(videoIdsToVerify({ completed, rows, now }), options)
    const plan = planYouTubeSync({ active, upcoming, completed, videos, rows, now })

    for (const op of plan.operations) {
      try {
        await applyOperation(op, startedAt)
        if (op.kind === 'insert') summary.inserted++; else summary.updated++
        summary.lifecycle[op.lifecycle]++
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

  await journal(startedAt, summary, options.trigger || 'cron')
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
