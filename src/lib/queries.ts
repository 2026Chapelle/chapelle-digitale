/**
 * CIER Platform — Couche d'accès aux données (Data Access Layer)
 *
 * Point d'entrée UNIQUE pour lire les données de l'espace membre / dashboard.
 *
 * Principe : chaque fonction renvoie de VRAIES données Supabase quand la base
 * est configurée, et un repli de démonstration sinon (IS_DEMO_MODE). Les pages
 * branchées sur ce module fonctionnent donc à l'identique en démo et en prod —
 * il suffit de renseigner les variables d'env pour « réveiller » l'espace membre.
 *
 * À appeler depuis des Server Components (await getDashboardSummary(...)) ou des
 * Route Handlers. Pour le client temps réel, utiliser getBrowserClient().
 */
import { IS_DEMO_MODE } from '@/lib/supabase'
import { createServerClient } from '@/lib/supabase-server'
import type { NotificationRow } from '@/types/supabase'
import type { DashboardSummary } from '@/types/dashboard'

export type { DashboardSummary }

/**
 * Client Supabase à utiliser. Les fonctions acceptent un client optionnel pour
 * fonctionner aussi bien dans un Server Component (défaut : createServerClient)
 * que dans un Route Handler (qui passe createRouteClient()). Typé librement car
 * le client n'est pas généré tant que `npm run db:generate` n'a pas tourné.
 */
type DbClient = ReturnType<typeof createServerClient>
type MaybeClient = DbClient | undefined

// ---------------------------------------------------------------------------
// Replis de démonstration
// ---------------------------------------------------------------------------

const DEMO_SUMMARY: DashboardSummary = {
  prenom: 'Jean',
  score_engagement: 72,
  parcours_etape: 3,
  formations_en_cours: 2,
  formations_terminees: 5,
  prieres_actives: 3,
  notifications_non_lues: 4,
}

// ---------------------------------------------------------------------------
// Requêtes
// ---------------------------------------------------------------------------

/** Synthèse pour le tableau de bord membre. */
export async function getDashboardSummary(client?: MaybeClient): Promise<DashboardSummary> {
  if (IS_DEMO_MODE) return DEMO_SUMMARY

  const supabase = client ?? createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEMO_SUMMARY

  const [profile, inscriptions, prieres, notifs] = await Promise.all([
    supabase.from('profiles').select('prenom, score_engagement, parcours_disciple_etape').eq('id', user.id).single(),
    supabase.from('inscriptions_formation').select('statut').eq('user_id', user.id),
    supabase.from('priere_demandes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).neq('statut', 'archivee'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('lue', false),
  ])

  const insc = inscriptions.data ?? []
  return {
    prenom: profile.data?.prenom || 'Bien-aimé',
    score_engagement: profile.data?.score_engagement ?? 0,
    parcours_etape: profile.data?.parcours_disciple_etape ?? 0,
    formations_en_cours: insc.filter((i) => i.statut === 'actif').length,
    formations_terminees: insc.filter((i) => i.statut === 'termine').length,
    prieres_actives: prieres.count ?? 0,
    notifications_non_lues: notifs.count ?? 0,
  }
}

/** Notifications de l'utilisateur (plus récentes d'abord). */
export async function getNotifications(limit = 20, client?: MaybeClient): Promise<NotificationRow[]> {
  if (IS_DEMO_MODE) return []

  const supabase = client ?? createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(limit)
  return data ?? []
}

/** Demandes de prière publiques de la communauté. */
export async function getCommunityPrayers(limit = 30, client?: MaybeClient) {
  if (IS_DEMO_MODE) return []

  const supabase = client ?? createServerClient()
  const { data } = await supabase
    .from('priere_demandes')
    .select('*')
    .eq('is_public', true)
    .neq('statut', 'archivee')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

/** Formations suivies par l'utilisateur, avec progression. */
export async function getMyFormations(client?: MaybeClient) {
  if (IS_DEMO_MODE) return []

  const supabase = client ?? createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // NB : la jointure `formations(*)` sera disponible après `npm run db:generate`
  // (qui ajoute les Relationships au type Database). En attendant, on charge à plat.
  const { data } = await supabase
    .from('inscriptions_formation')
    .select('*')
    .eq('user_id', user.id)
    .order('dernier_acces', { ascending: false })
  return data ?? []
}
