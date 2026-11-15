import { describe, expect, it } from 'vitest'
import { countLifecycleStates, durationSeconds, planYouTubeSync, replayVerdict, videoIdsToVerify, COMPLETED_WINDOW_MS, REPLAY_PENDING_STATUS, type CmsLiveSyncRow } from './youtube-sync'

const now = new Date('2026-11-15T10:00:00Z')
const ID = 'culte123456'
const b = (over: Record<string, unknown> = {}) => ({ id: ID, snippet: { title: 'Culte du dimanche', description: 'Louange et parole', channelId: 'UCtest', scheduledStartTime: '2026-11-16T09:00:00Z', thumbnails: { high: { url: `https://i.ytimg.com/vi/${ID}/hqdefault_live.jpg` } } }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' }, ...over })
const live = () => b({ status: { lifeCycleStatus: 'live', privacyStatus: 'public' }, snippet: { ...b().snippet, actualStartTime: '2026-11-16T09:02:00Z' } })
const complete = () => b({ status: { lifeCycleStatus: 'complete', privacyStatus: 'public' }, snippet: { ...b().snippet, actualStartTime: '2026-11-16T09:02:00Z', actualEndTime: '2026-11-16T11:00:00Z' } })
const video = (over: Record<string, unknown> = {}) => ({ id: ID, snippet: { title: 'Culte du dimanche', description: 'Louange et parole', liveBroadcastContent: 'none', thumbnails: { high: { url: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg` } } }, status: { uploadStatus: 'processed', privacyStatus: 'public', embeddable: true }, contentDetails: { duration: 'PT1H58M' }, liveStreamingDetails: { scheduledStartTime: '2026-11-16T09:00:00Z', actualStartTime: '2026-11-16T09:02:00Z', actualEndTime: '2026-11-16T11:00:00Z' }, ...over })
const row = (over: Partial<CmsLiveSyncRow> = {}): CmsLiveSyncRow => ({ id: 'row-1', title: 'Culte du dimanche', youtube_url: `https://www.youtube.com/watch?v=${ID}`, status: 'scheduled', is_live: false, scheduled_at: '2026-11-16T09:00:00Z', platform: 'YouTube', cover_url: 'https://i.ytimg.com/vi/culte123456/hqdefault_live.jpg', description: 'Louange et parole', ...over })
const empty = { active: [], upcoming: [], completed: [], videos: [], rows: [], now }

describe('planYouTubeSync — cycle PROGRAMMÉ → EN DIRECT → TERMINÉ → REPLAY', () => {
  it('creates a scheduled row from an upcoming broadcast with title, thumbnail, date and watch link', () => {
    const plan = planYouTubeSync({ ...empty, upcoming: [b()] })
    expect(plan.operations).toEqual([{ kind: 'insert', videoId: ID, lifecycle: 'scheduled', row: { title: 'Culte du dimanche', description: 'Louange et parole', cover_url: `https://i.ytimg.com/vi/${ID}/hqdefault_live.jpg`, youtube_url: `https://www.youtube.com/watch?v=${ID}`, platform: 'YouTube', status: 'scheduled', is_live: false, scheduled_at: '2026-11-16T09:00:00Z' } }])
  })

  it('is idempotent: a second run on an already synced row produces no operation', () => {
    expect(planYouTubeSync({ ...empty, upcoming: [b()], rows: [row()] }).operations).toEqual([])
  })

  it('switches the same row to live when the broadcast starts (no duplicate)', () => {
    const plan = planYouTubeSync({ ...empty, active: [live()], rows: [row()] })
    expect(plan.operations).toEqual([{ kind: 'update', videoId: ID, lifecycle: 'live', id: 'row-1', patch: { status: 'live', is_live: true } }])
  })

  it('moves a finished broadcast to replay_pending while the archive is still processing, then to ended once available', () => {
    const pending = planYouTubeSync({ ...empty, completed: [complete()], videos: [video({ status: { uploadStatus: 'uploaded', privacyStatus: 'public' } })], rows: [row({ status: 'live', is_live: true })] })
    expect(pending.operations).toEqual([{ kind: 'update', videoId: ID, lifecycle: 'replay_pending', id: 'row-1', patch: { status: REPLAY_PENDING_STATUS, is_live: false } }])
    expect(pending.pendingVideoIds).toEqual([ID])
    expect(pending.skipped).toEqual([{ videoId: ID, reason: 'processing' }])

    const available = planYouTubeSync({ ...empty, completed: [complete()], videos: [video()], rows: [row({ status: REPLAY_PENDING_STATUS })] })
    expect(available.operations).toEqual([{ kind: 'update', videoId: ID, lifecycle: 'replay_available', id: 'row-1', patch: { status: 'ended' } }])
    expect(available.pendingVideoIds).toEqual([])
  })

  it('re-checks pending rows even when the broadcast left the completed list (resume after interruption)', () => {
    const plan = planYouTubeSync({ ...empty, videos: [video()], rows: [row({ status: REPLAY_PENDING_STATUS })] })
    expect(plan.operations).toMatchObject([{ kind: 'update', lifecycle: 'replay_available', patch: { status: 'ended' } }])
    expect(videoIdsToVerify({ completed: [], rows: [row({ status: REPLAY_PENDING_STATUS })], now })).toEqual([ID])
  })

  it('never publishes a private, deleted, non-embeddable or UNCERTAIN archive', () => {
    expect(replayVerdict(video())).toBe('available')
    expect(replayVerdict(video({ status: { uploadStatus: 'processed', privacyStatus: 'private' } }))).toBe('private')
    expect(replayVerdict(undefined)).toBe('unavailable')
    expect(replayVerdict(video({ status: { uploadStatus: 'processed', privacyStatus: 'public', embeddable: false } }))).toBe('unavailable')
    expect(replayVerdict(video({ status: { uploadStatus: 'rejected', privacyStatus: 'public', embeddable: true } }))).toBe('unavailable')
    expect(replayVerdict(video({ snippet: { liveBroadcastContent: 'live' } }))).toBe('processing')
    expect(replayVerdict(video({ status: { uploadStatus: 'uploaded', privacyStatus: 'public', embeddable: true } }))).toBe('processing')
    // Informations absentes ou incomplètes → incertain → jamais publié
    expect(replayVerdict(video({ status: { uploadStatus: 'processed', embeddable: true } }))).toBe('uncertain')
    expect(replayVerdict(video({ status: { privacyStatus: 'public', embeddable: true } }))).toBe('uncertain')
    expect(replayVerdict(video({ status: { uploadStatus: 'processed', privacyStatus: 'public' } }))).toBe('uncertain')
    expect(replayVerdict(video({ snippet: { thumbnails: {} } }))).toBe('uncertain')
    expect(replayVerdict(video({ liveStreamingDetails: { actualStartTime: '2026-11-16T09:02:00Z' } }))).toBe('uncertain')
    expect(replayVerdict(video({ contentDetails: {} }))).toBe('uncertain')
    expect(replayVerdict(video({ contentDetails: { duration: 'P0D' } }))).toBe('uncertain')
    expect(durationSeconds('PT1H58M')).toBe(7_080)
    expect(durationSeconds('P1DT2S')).toBe(86_402)
    expect(durationSeconds('nope')).toBeUndefined()
    const uncertain = planYouTubeSync({ ...empty, completed: [complete()], videos: [video({ status: { uploadStatus: 'processed', privacyStatus: 'public' } })], rows: [row({ status: 'live', is_live: true })] })
    expect(uncertain.operations).toMatchObject([{ patch: { status: REPLAY_PENDING_STATUS, is_live: false } }])
    expect(uncertain.skipped).toEqual([{ videoId: ID, reason: 'uncertain' }])
    const plan = planYouTubeSync({ ...empty, completed: [complete()], videos: [], rows: [row({ status: 'live', is_live: true })] })
    expect(plan.operations).toMatchObject([{ patch: { status: REPLAY_PENDING_STATUS, is_live: false } }])
    expect(plan.skipped).toEqual([{ videoId: ID, reason: 'unavailable' }])
    const priv = planYouTubeSync({ ...empty, completed: [complete()], videos: [video({ status: { uploadStatus: 'processed', privacyStatus: 'private' } })], rows: [row({ status: REPLAY_PENDING_STATUS })] })
    expect(priv.operations).toEqual([])
    expect(priv.skipped).toEqual([{ videoId: ID, reason: 'private' }])
  })

  it('never rewrites an existing replay (ended/published) nor an admin draft', () => {
    for (const status of ['ended', 'published', 'draft']) {
      const plan = planYouTubeSync({ ...empty, active: [live()], completed: [complete()], videos: [video()], rows: [row({ status, title: 'Titre choisi par l’admin' })] })
      expect(plan.operations).toEqual([])
      expect(plan.skipped[0]).toMatchObject({ videoId: ID, reason: status === 'draft' ? 'draft_row' : 'already_replay' })
    }
  })

  it('attaches a manual scheduled row without URL instead of duplicating it, filling only empty fields', () => {
    const manual = row({ id: 'manual', youtube_url: null, cover_url: null, description: null, platform: null, title: 'Culte spécial (titre admin)', scheduled_at: '2026-11-16T09:20:00Z' })
    const plan = planYouTubeSync({ ...empty, upcoming: [b()], rows: [manual] })
    expect(plan.operations).toEqual([{ kind: 'update', videoId: ID, lifecycle: 'scheduled', id: 'manual', patch: { description: 'Louange et parole', cover_url: `https://i.ytimg.com/vi/${ID}/hqdefault_live.jpg`, youtube_url: `https://www.youtube.com/watch?v=${ID}`, platform: 'YouTube', scheduled_at: '2026-11-16T09:00:00Z' } }])
    expect(plan.operations[0].kind === 'update' && 'title' in plan.operations[0].patch).toBe(false)
  })

  it('skips private upcoming broadcasts, old completed broadcasts and untitled items', () => {
    const old = complete(); old.id = 'oldlive1234'; (old.snippet as { actualEndTime?: string }).actualEndTime = new Date(now.getTime() - COMPLETED_WINDOW_MS - 1).toISOString()
    const plan = planYouTubeSync({ ...empty, upcoming: [b({ status: { lifeCycleStatus: 'ready', privacyStatus: 'private' } })], completed: [old], videos: [video()] })
    expect(plan.operations).toEqual([])
    expect(plan.skipped).toEqual([{ videoId: ID, reason: 'private' }, { videoId: 'oldlive1234', reason: 'outside_window' }])
    expect(planYouTubeSync({ ...empty, upcoming: [b({ snippet: { scheduledStartTime: '2026-11-16T09:00:00Z' } })] }).skipped).toEqual([{ videoId: ID, reason: 'no_title' }])
  })

  it('gives the active broadcast priority over the same id listed as upcoming', () => {
    const plan = planYouTubeSync({ ...empty, active: [live()], upcoming: [b()] })
    expect(plan.operations).toHaveLength(1)
    expect(plan.operations[0]).toMatchObject({ kind: 'insert', lifecycle: 'live', row: { status: 'live', is_live: true } })
  })

  it('counts lifecycle states for the admin panel', () => {
    expect(countLifecycleStates([row(), row({ status: 'live' }), row({ status: REPLAY_PENDING_STATUS }), row({ status: 'ended' }), row({ status: 'published', youtube_url: null, video_url: 'https://cdn/x.mp4' }), row({ status: 'draft' })])).toEqual({ scheduled: 1, live: 1, replayPending: 1, replayAvailable: 2 })
  })

  it('preserves administrators’ editorial choices on synced rows', () => {
    const edited = row({ title: 'Titre choisi par l’admin', description: 'Résumé rédigé par l’admin', cover_url: 'https://cdn.citadelle/cover-admin.jpg', platform: 'Chapelle Royale TV', scheduled_at: '2026-11-16T09:00:00Z' })
    // Programmé : aucun champ éditorial réécrit, même si YouTube a d'autres valeurs.
    expect(planYouTubeSync({ ...empty, upcoming: [b({ snippet: { ...b().snippet, title: 'Titre YouTube', description: 'Description YouTube' } })], rows: [edited] }).operations).toEqual([])
    // Passage en direct : seul le statut change.
    expect(planYouTubeSync({ ...empty, active: [live()], rows: [edited] }).operations).toEqual([{ kind: 'update', videoId: ID, lifecycle: 'live', id: 'row-1', patch: { status: 'live', is_live: true } }])
    // Replay disponible : seul le statut change, titre/description/couverture/plateforme intacts.
    expect(planYouTubeSync({ ...empty, completed: [complete()], videos: [video()], rows: [{ ...edited, status: REPLAY_PENDING_STATUS }] }).operations).toEqual([{ kind: 'update', videoId: ID, lifecycle: 'replay_available', id: 'row-1', patch: { status: 'ended' } }])
    // `is_live` activé à la main sur un direct programmé : non forcé à false par la synchronisation.
    expect(planYouTubeSync({ ...empty, upcoming: [b()], rows: [row({ is_live: true })] }).operations).toEqual([])
    // Date modifiée par l'admin : YouTube reste la vérité horaire (seul champ non éditorial réaligné).
    expect(planYouTubeSync({ ...empty, upcoming: [b()], rows: [row({ scheduled_at: '2026-11-16T10:00:00Z' })] }).operations).toEqual([{ kind: 'update', videoId: ID, lifecycle: 'scheduled', id: 'row-1', patch: { scheduled_at: '2026-11-16T09:00:00Z' } }])
  })
})
