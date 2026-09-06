import { cmsList } from '@/lib/cms'
import { ContextualHome } from '@/components/sections/ContextualHome'
import { resolveLiveState, type CmsLiveLike, type LiveState } from '@/lib/home/contextual'
import { detectYouTubeLive } from '@/lib/home/youtube-live'

export async function HomeSections() {
  const liveRows = await cmsList<CmsLiveLike>('cms_lives', {
    publicOnly: true,
    noStore: true,
    orderBy: 'created_at',
    ascending: false,
    limit: 12,
  })
  const testMode = process.env.CITADELLE_TEST_MODE === '1'
  const testState = process.env.CITADELLE_TEST_LIVE_STATE?.trim().toUpperCase()

  let testLiveState: LiveState | null = null

  if (testMode && testState === 'UPCOMING') {
    testLiveState = {
      status: 'UPCOMING',
      title: 'REVIENS À LA MAISON : LE PÈRE T’ATTEND ENCORE',
      youtubeVideoId: '6oryN3PHHBQ',
      watchUrl: '/live',
      thumbnail: 'https://i.ytimg.com/vi/6oryN3PHHBQ/hqdefault_live.jpg',
    }
  } else if (testMode && testState === 'LIVE') {
    testLiveState = {
      status: 'LIVE',
      title: 'Culte en direct',
      youtubeVideoId: '6oryN3PHHBQ',
      watchUrl: '/live',
      thumbnail: 'https://i.ytimg.com/vi/6oryN3PHHBQ/hqdefault_live.jpg',
    }
  } else if (testMode && testState === 'OFFLINE') {
    testLiveState = { status: 'OFFLINE' }
  }

  const liveState =
    testLiveState ||
    (await detectYouTubeLive()) ||
    resolveLiveState(liveRows)

  return <ContextualHome liveState={liveState} />
}
