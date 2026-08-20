/**
 * /member/dashboard/lives — espace membre Live/Vidéo.
 *
 * Phase 1D : alimenté par la MÊME source canonique `cms_lives` que /live, via le
 * MÊME loader de domaine (`loadLiveHubData` : cmsList → normalizeLives →
 * partitionLives → computeNextLive). Aucune seconde source de vérité, aucune
 * logique de domaine dupliquée. L'interactivité membre (chat, rappels, partage,
 * traçabilité, offrande, lecteur intégré) est déléguée à `MemberLiveClient`.
 *
 * L'accès membre reste assuré par le middleware (matcher /member/:path*) —
 * inchangé. `force-dynamic` : reflète immédiatement la programmation admin.
 */
import { loadLiveHubData } from '@/lib/live/load-lives'
import { loadLivePrograms } from '@/lib/live/load-programs'
import { MemberLiveClient } from './MemberLiveClient'

export const dynamic = 'force-dynamic'

export default async function LivesPage() {
  // cms_lives (occurrences réelles) + live_programs (programmation régulière canonique).
  const [data, programs] = await Promise.all([loadLiveHubData(), loadLivePrograms()])

  return (
    <MemberLiveClient
      liveNow={data.liveNow}
      nextLive={data.nextLive}
      upcoming={data.upcoming}
      replays={data.replays}
      hasAny={data.hasAny}
      programs={programs}
    />
  )
}
