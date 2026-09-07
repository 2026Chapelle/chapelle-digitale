import 'server-only'

import { cmsList } from '@/lib/cms'
import {
  resolveLiveState,
  type CmsLiveLike,
  type LiveState,
} from '@/lib/home/contextual'
import { detectYouTubeLive } from '@/lib/home/youtube-live'

const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

export async function getCanonicalLiveState(): Promise<LiveState> {
  try {
    const youtubeState = await detectYouTubeLive()

    if (youtubeState) {
      return youtubeState
    }
  } catch {
    // YouTube indisponible : le CMS reste le fallback.
  }

  try {
    const rows = await cmsList<CmsLiveLike>('cms_lives', {
      publicOnly: true,
      noStore: true,
      orderBy: 'created_at',
      ascending: false,
      limit: 12,
    })

    return resolveLiveState(rows)
  } catch {
    return { status: 'OFFLINE' }
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