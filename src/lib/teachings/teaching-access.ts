/**
 * CITADELLE — ENSEIGNEMENTS-SEC
 *
 * Couche PURE de décision d'accès aux enseignements.
 *
 * La matrice public/member/premium reste construite sur PODCAST-SEC.
 * Aucune seconde logique RBAC n'est créée.
 *
 * Particularité Enseignements :
 * un droit Premium n'est jamais suffisant sans être réellement membre.
 */

import {
  decidePlaybackAccess,
  normalizeAccessLevel,
  isMemberStatus,
  reasonToStatus,
  classifyMediaSource,
  type PlaybackAccessLevel,
  type PlaybackContext,
  type PlaybackDecision,
  type PlaybackReason,
} from '@/lib/podcast/playback-access'

export type TeachingAccessLevel = PlaybackAccessLevel
export type TeachingAccessContext = PlaybackContext
export type TeachingAccessDecision = PlaybackDecision
export type TeachingAccessReason = PlaybackReason

export {
  normalizeAccessLevel,
  isMemberStatus,
  reasonToStatus,
  classifyMediaSource,
}

/**
 * Clé canonique du droit Premium ENSEIGNEMENTS.
 *
 * Stockée dans la source de vérité existante :
 * public.user_entitlements.
 */
export const TEACHINGS_PREMIUM_ENTITLEMENT_KEY = 'teachings_premium'

/** TTL d'une URL Storage signée d'enseignement. */
export const TEACHING_DELIVERY_TTL_SECONDS = 6 * 60 * 60

/**
 * Matrice Enseignements.
 *
 * public  → règle canonique
 * member  → règle canonique
 * premium → doit D'ABORD satisfaire la règle member,
 *           puis la règle premium canonique.
 *
 * L'admin conserve le bypass prévu par PODCAST-SEC.
 */
export function decideTeachingAccess(
  accessLevel: TeachingAccessLevel,
  ctx: TeachingAccessContext,
): TeachingAccessDecision {
  if (accessLevel === 'premium' && !ctx.isAdmin) {
    const memberDecision = decidePlaybackAccess('member', ctx)

    if (!memberDecision.allowed) {
      return memberDecision
    }
  }

  return decidePlaybackAccess(accessLevel, ctx)
}

interface RpcClient {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown
    error: unknown
  }>
}

/**
 * Résolution Premium Enseignements.
 *
 * Réutilise STRICTEMENT la primitive générique existante :
 *
 *   has_entitlement(user_id, 'teachings_premium')
 *
 * FAIL-CLOSED sur :
 * - user absent ;
 * - exception ;
 * - erreur RPC ;
 * - réponse non booléenne.
 */
export async function hasTeachingsPremiumAccess(
  client: RpcClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false

  try {
    const { data, error } = await client.rpc(
      'has_entitlement',
      {
        p_user: userId,
        p_key: TEACHINGS_PREMIUM_ENTITLEMENT_KEY,
      },
    )

    if (error) return false

    return data === true
  } catch {
    return false
  }
}

/**
 * Métadonnées autorisées dans la bibliothèque publique,
 * y compris pour une carte verrouillée.
 *
 * Aucun corps, description détaillée ou média n'est présent ici.
 */
export interface TeachingCatalogMeta {
  id: string
  title: string
  slug?: string | null
  speaker?: string | null
  scripture?: string | null
  cover_url?: string | null
  category?: string | null
  published_at?: string | null
  access_level?: string | null
  is_featured?: boolean | null
  sort_order?: number | null
  series_id?: string | null
  season_id?: string | null
}

/**
 * Contenu récupéré dans une requête séparée,
 * EXCLUSIVEMENT pour access_level='public'.
 */
export interface PublicTeachingContent {
  id: string
  description?: string | null
  body?: string | null
  video_url?: string | null
  audio_url?: string | null
}

export interface TeachingCatalogItem extends TeachingCatalogMeta {
  description?: string | null
  body?: string | null
  video_url?: string | null
  audio_url?: string | null
  series_title?: string | null
  series_slug?: string | null
  season_number?: number | null
  season_title?: string | null
}

/**
 * Fusion fail-closed.
 *
 * Même si un appelant fournit par erreur un contenu sensible pour une ligne
 * member/premium, il est explicitement supprimé.
 */
export function mergePublicTeachingContent(
  metadata: TeachingCatalogMeta[],
  publicContent: PublicTeachingContent[],
): TeachingCatalogItem[] {
  const publicById = new Map(
    publicContent.map((row) => [row.id, row]),
  )

  return metadata.map((row) => {
    const accessLevel = normalizeAccessLevel(row.access_level)

    if (accessLevel !== 'public') {
      return {
        ...row,
        description: null,
        body: null,
        video_url: null,
        audio_url: null,
      }
    }

    const content = publicById.get(row.id)

    return {
      ...row,
      description: content?.description ?? null,
      body: content?.body ?? null,
      video_url: content?.video_url ?? null,
      audio_url: content?.audio_url ?? null,
    }
  })
}