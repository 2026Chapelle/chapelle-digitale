import 'server-only'

import { cmsList } from '@/lib/cms'
import {
  CMS_LIVE_MAX_DURATION_MS,
  resolveLiveState,
  youtubeVideoIdFrom,
  type CmsLiveLike,
  type LiveState,
} from '@/lib/home/contextual'
import {
  detectYouTubeLiveDetailed,
  getYouTubeLiveDiagnostics,
  verifyYouTubeVideoLive,
  type YouTubeLiveDiagnostics,
} from '@/lib/home/youtube-live'

const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
/** Nombre maximal de lignes CMS « live » vérifiées auprès de YouTube par résolution. */
const MAX_CMS_VERIFICATIONS = 3

export type CanonicalLiveSource = 'youtube' | 'cms' | 'none'

export type CanonicalLiveSnapshot = {
  state: LiveState
  /** Origine de l'état retenu. */
  source: CanonicalLiveSource
  /** Code d'erreur YouTube non sensible (jamais de secret), null si la détection a réussi. */
  youtubeError: string | null
}

export type CanonicalLiveDiagnostics = CanonicalLiveSnapshot & {
  youtube: YouTubeLiveDiagnostics
  policy: { cmsLiveMaxHours: number; cmsVerifiedAgainstYouTube: boolean }
  checkedAt: string
}

/** Borne de sécurité du fallback CMS, ajustable sans redéploiement (LIVE_CMS_MAX_HOURS, 1 à 48 h). */
export function cmsLiveMaxDurationMs(env: Record<string, string | undefined> = process.env): number {
  const hours = Number.parseFloat(env.LIVE_CMS_MAX_HOURS ?? '')
  if (!Number.isFinite(hours) || hours < 1 || hours > 48) return CMS_LIVE_MAX_DURATION_MS
  return Math.round(hours * 60 * 60_000)
}

const cmsOptions = () => ({ maxLiveDurationMs: cmsLiveMaxDurationMs() })

/**
 * Fallback CMS avec vérité YouTube : tant que la ligne CMS retenue comme LIVE pointe vers un
 * direct YouTube que l'API déclare TERMINÉ, elle est écartée et la résolution reprend sans elle.
 * Les autres verdicts (live, à venir, vidéo classique, inconnu) conservent la ligne, bornée par
 * la durée maximale.
 */
async function resolveCmsState(rows: CmsLiveLike[] | null, youtubeHealthy: boolean): Promise<LiveState> {
  let remaining = rows || []
  for (let attempt = 0; attempt <= MAX_CMS_VERIFICATIONS; attempt++) {
    const state = resolveLiveState(remaining, new Date(), cmsOptions())
    if (!youtubeHealthy || state.status !== 'LIVE' || !state.youtubeVideoId || attempt === MAX_CMS_VERIFICATIONS) return state
    const verdict = await verifyYouTubeVideoLive(state.youtubeVideoId)
    if (verdict !== 'ENDED') return state
    const endedId = state.youtubeVideoId
    remaining = remaining.filter(r => youtubeVideoIdFrom(r.youtube_url) !== endedId)
  }
  return resolveLiveState(remaining, new Date(), cmsOptions())
}

/**
 * État canonique + diagnostic non sensible : permet de distinguer une erreur OAuth
 * (`youtubeError` renseigné, fallback CMS) d'une simple absence de direct YouTube.
 */
export async function getCanonicalLiveSnapshot(): Promise<CanonicalLiveSnapshot> {
  let youtubeError: string | null = null

  try {
    const detection = await detectYouTubeLiveDetailed()
    youtubeError = detection.error

    if (detection.state) {
      return { state: detection.state, source: 'youtube', youtubeError: null }
    }
  } catch {
    // YouTube indisponible : le CMS reste le fallback.
    youtubeError = youtubeError ?? 'youtube_live_error'
  }

  try {
    const rows = await cmsList<CmsLiveLike>('cms_lives', {
      publicOnly: true,
      noStore: true,
      orderBy: 'created_at',
      ascending: false,
      limit: 12,
    })

    const state = await resolveCmsState(rows, youtubeError === null)

    return { state, source: state.status === 'OFFLINE' ? 'none' : 'cms', youtubeError }
  } catch {
    return { state: { status: 'OFFLINE' }, source: 'none', youtubeError }
  }
}

export async function getCanonicalLiveState(): Promise<LiveState> {
  return (await getCanonicalLiveSnapshot()).state
}

/** Diagnostic complet, réservé aux routes administrateur (aucun secret). */
export async function getCanonicalLiveDiagnostics(): Promise<CanonicalLiveDiagnostics> {
  const snapshot = await getCanonicalLiveSnapshot()
  return {
    ...snapshot,
    youtube: getYouTubeLiveDiagnostics(),
    policy: { cmsLiveMaxHours: cmsLiveMaxDurationMs() / 3_600_000, cmsVerifiedAgainstYouTube: snapshot.youtubeError === null },
    checkedAt: new Date().toISOString(),
  }
}

export function liveKeyFromState(
  state: LiveState,
): string | null {
  if (state.status !== 'LIVE') {
    return null
  }

  const videoId = state.youtubeVideoId?.trim()

  if (!videoId || !YOUTUBE_VIDEO_ID_RE.test(videoId)) {
    return null
  }

  return `youtube:${videoId}`
}
