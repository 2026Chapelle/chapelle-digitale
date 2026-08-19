/**
 * /live — Hub Live public Citadelle, alimenté par `cms_lives` (source de vérité
 * CANONIQUE du domaine Live). Phase 1B :
 *   - chargement SERVEUR via `cmsList` (aucun client Supabase ajouté) ;
 *   - normalisation par les fondations Phase 1A (état live/upcoming/replay/empty) ;
 *   - l'interactivité (onglets, lecteur, chat, offrande) est déléguée au client
 *     `LiveHubClient`, qui ne reçoit que des données déjà prêtes à afficher.
 *
 * `force-dynamic` : la page reflète immédiatement les publications faites depuis
 * l'administration canonique `/admin/lives` (qui écrit `cms_lives`).
 */
import { loadLiveHubData } from '@/lib/live/load-lives'
import { LiveHubClient } from '@/components/live/LiveHubClient'

export const dynamic = 'force-dynamic'

export default async function LivePage() {
  const data = await loadLiveHubData()

  return (
    <LiveHubClient
      liveNow={data.liveNow}
      nextLive={data.nextLive}
      upcoming={data.upcoming}
      replays={data.replays}
      hasAny={data.hasAny}
    />
  )
}
