import 'server-only'
import type { LiveState } from './contextual'

type YouTubeItem = { id?: { videoId?: string }; snippet?: { title?: string; scheduledStartTime?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } }; liveStreamingDetails?: { actualStartTime?: string; scheduledStartTime?: string } }
const channelId = () => process.env.YOUTUBE_CHANNEL_ID?.trim() || ''
const apiKey = () => process.env.YOUTUBE_API_KEY?.trim() || ''
function toState(item: YouTubeItem | undefined, status: 'LIVE' | 'UPCOMING'): LiveState | null {
  const id = item?.id?.videoId; const title = item?.snippet?.title?.trim()
  if (!id || !title) return null
  const details = item.liveStreamingDetails; const thumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url
  if (status === 'LIVE') return { status, title, youtubeVideoId: id, watchUrl: '/live', thumbnail, startedAt: details?.actualStartTime }
  const scheduledAt = details?.scheduledStartTime || item.snippet?.scheduledStartTime
  return scheduledAt && Number.isFinite(Date.parse(scheduledAt)) ? { status, title, youtubeVideoId: id, watchUrl: '/live', thumbnail, scheduledAt } : null
}
async function search(eventType: 'live' | 'upcoming'): Promise<YouTubeItem | undefined> {
  const key = apiKey(); const channel = channelId(); if (!key || !channel) return undefined
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.search = new URLSearchParams({ part: 'snippet', channelId: channel, eventType, type: 'video', maxResults: '1', key }).toString()
  const response = await fetch(url, { next: { revalidate: 60 } }); if (!response.ok) throw new Error(`youtube_live_${response.status}`)
  return (await response.json() as { items?: YouTubeItem[] }).items?.[0]
}
export async function detectYouTubeLive(): Promise<LiveState | null> {
  if (!apiKey() || !channelId()) return null
  try { return toState(await search('live'), 'LIVE') || toState(await search('upcoming'), 'UPCOMING') } catch { return null }
}
