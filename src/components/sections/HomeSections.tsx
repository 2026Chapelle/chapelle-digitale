import { cmsList } from '@/lib/cms'
import { ContextualHome } from '@/components/sections/ContextualHome'
import { InstallCitadelleSection } from '@/components/home/InstallCitadelleSection'
import type { LiveState } from '@/lib/home/contextual'
import { getCanonicalLiveState } from '@/lib/live/canonical-server'
import { selectFeaturedHomeEvent, type FeaturedHomeEvent } from '@/lib/home/featured-event'

export async function HomeSections() {
  // Explicit CMS editorial selection only; use uncached reads for admin changes.
  const featuredRows = await cmsList<FeaturedHomeEvent>('cms_events', {
    publicOnly: true,
    filter: { is_featured: true },
    noStore: true,
    orderBy: 'sort_order',
    ascending: true,
  })
  const featuredEvent = selectFeaturedHomeEvent(featuredRows)
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

  // Source unique : même résolveur canonique que /api/live/canonical (YouTube prioritaire,
  // fallback CMS borné dans le temps). Plus de sélection dupliquée côté accueil.
  const liveState = testLiveState || (await getCanonicalLiveState())

  // Section d'installation (PWA existante) retablie en bas de l'accueil, avant le footer.
  return (
    <>
      <ContextualHome liveState={liveState} featuredEvent={featuredEvent} />
      <InstallCitadelleSection />
    </>
  )
}
