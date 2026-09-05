import { cmsList } from '@/lib/cms'
import { ContextualHome } from '@/components/sections/ContextualHome'
import { resolveLiveState, type CmsLiveLike } from '@/lib/home/contextual'

export async function HomeSections() {
  const liveRows = await cmsList<CmsLiveLike>('cms_lives', {
    publicOnly: true,
    noStore: true,
    orderBy: 'created_at',
    ascending: false,
    limit: 12,
  })
  return <ContextualHome liveState={resolveLiveState(liveRows)} />
}
