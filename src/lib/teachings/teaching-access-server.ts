/**
 * CITADELLE — ENSEIGNEMENTS-SEC
 *
 * Couche SERVEUR / I/O.
 *
 * BIBLIOTHÈQUE :
 *   query 1 → métadonnées non sensibles ;
 *   query 2 → description/body/video/audio UNIQUEMENT pour public.
 *
 * RÉSOLUTION :
 *   service_role lit la ligne réelle ;
 *   la décision d'accès est ensuite appliquée ;
 *   aucun contenu protégé n'est retourné si refusé.
 */

import {
  supabaseAdmin,
  supabaseCmsRead,
  IS_DEMO_MODE,
} from '@/lib/supabase'

import {
  classifyMediaSource,
  decideTeachingAccess,
  mergePublicTeachingContent,
  normalizeAccessLevel,
  TEACHING_DELIVERY_TTL_SECONDS,
  type TeachingAccessContext,
  type TeachingAccessReason,
  type TeachingCatalogItem,
  type TeachingCatalogMeta,
  type PublicTeachingContent,
} from './teaching-access'

export interface TeachingDeliveryContent {
  id: string
  title: string
  slug?: string | null
  speaker?: string | null
  scripture?: string | null
  description?: string | null
  body?: string | null
  cover_url?: string | null
  category?: string | null
  published_at?: string | null
  access_level: 'public' | 'member' | 'premium'
  series_id?: string | null
  season_id?: string | null
  videoUrl?: string | null
  audioUrl?: string | null
}

export interface TeachingDeliveryResult {
  allowed: boolean
  reason: TeachingAccessReason
  teaching?: TeachingDeliveryContent
}

/**
 * IMPORTANT :
 * description/body/video/audio volontairement absents.
 */
const METADATA_SELECT =
  'id, title, slug, speaker, scripture, cover_url, category, published_at, access_level, is_featured, sort_order'

/**
 * Ces champs ne sont chargés QUE dans une requête access_level='public'.
 */
const PUBLIC_CONTENT_SELECT =
  'id, description, body, video_url, audio_url'

/**
 * Catalogue public fail-closed.
 *
 * supabaseCmsRead utilise service_role dans l'architecture actuelle :
 * nous ne dépendons donc PAS de RLS pour empêcher les fuites.
 * La séparation des SELECT constitue le verrou applicatif.
 */
export async function listPublishedTeachingCatalog(): Promise<TeachingCatalogItem[]> {
  if (IS_DEMO_MODE) return []

  try {
    const metadataResult = await supabaseCmsRead
      .from('cms_teachings')
      .select(METADATA_SELECT)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    if (
      metadataResult.error ||
      !Array.isArray(metadataResult.data)
    ) {
      return []
    }

    const publicContentResult = await supabaseCmsRead
      .from('cms_teachings')
      .select(PUBLIC_CONTENT_SELECT)
      .eq('status', 'published')
      .eq('access_level', 'public')

    const metadata =
      metadataResult.data as TeachingCatalogMeta[]

    const publicContent =
      !publicContentResult.error &&
      Array.isArray(publicContentResult.data)
        ? publicContentResult.data as PublicTeachingContent[]
        : []

    return mergePublicTeachingContent(
      metadata,
      publicContent,
    )
  } catch {
    return []
  }
}

function expectedStorageHost(): string | null {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    ).hostname || null
  } catch {
    return null
  }
}

/**
 * Résolution d'un média APRÈS autorisation.
 *
 * Storage protégé :
 * signature obligatoire.
 *
 * Si signature impossible :
 * - public → URL originale autorisée ;
 * - member/premium → fail-closed, URL non retournée.
 *
 * YouTube / externe :
 * le lien tiers est retourné seulement après autorisation.
 */
async function resolveTeachingMedia(
  rawValue: unknown,
  accessLevel: 'public' | 'member' | 'premium',
): Promise<string | null> {
  const rawUrl =
    typeof rawValue === 'string'
      ? rawValue.trim()
      : ''

  if (!rawUrl) return null

  const source = classifyMediaSource(
    rawUrl,
    expectedStorageHost(),
  )

  if (
    source.kind !== 'storage' ||
    !source.bucket ||
    !source.path
  ) {
    return rawUrl
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(source.bucket)
      .createSignedUrl(
        source.path,
        TEACHING_DELIVERY_TTL_SECONDS,
      )

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }
  } catch {
    // fail-closed ci-dessous pour member/premium
  }

  if (accessLevel !== 'public') {
    return null
  }

  return rawUrl
}

/**
 * Résout un enseignement canonique par ID.
 *
 * `ctx` doit avoir été construit côté serveur à partir :
 * - session vérifiée ;
 * - membre_statut réel ;
 * - entitlement réel ;
 * - contexte admin réel.
 */
export async function getTeachingDelivery(
  id: string,
  ctx: TeachingAccessContext,
): Promise<TeachingDeliveryResult> {
  const teachingId = (id || '').trim()

  if (!teachingId || IS_DEMO_MODE) {
    return {
      allowed: false,
      reason: 'not_found',
    }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('cms_teachings')
      .select(
        'id, status, title, slug, speaker, scripture, description, body, video_url, audio_url, cover_url, category, published_at, access_level, series_id, season_id',
      )
      .eq('id', teachingId)
      .maybeSingle()

    if (error || !data) {
      return {
        allowed: false,
        reason: 'not_found',
      }
    }

    const row = data as {
      id: string
      status?: string | null
      title?: string | null
      slug?: string | null
      speaker?: string | null
      scripture?: string | null
      description?: string | null
      body?: string | null
      video_url?: string | null
      audio_url?: string | null
      cover_url?: string | null
      category?: string | null
      published_at?: string | null
      access_level?: string | null
      series_id?: string | null
      season_id?: string | null
    }

    if (
      row.status !== 'published' &&
      !ctx.isAdmin
    ) {
      return {
        allowed: false,
        reason: 'not_found',
      }
    }

    const accessLevel =
      normalizeAccessLevel(row.access_level)

    const decision =
      decideTeachingAccess(
        accessLevel,
        ctx,
      )

    if (!decision.allowed) {
      console.info(
        `[teachings/access] denied id=${teachingId} level=${accessLevel} reason=${decision.reason}`,
      )

      return {
        allowed: false,
        reason: decision.reason,
      }
    }

    const [videoUrl, audioUrl] =
      await Promise.all([
        resolveTeachingMedia(
          row.video_url,
          accessLevel,
        ),
        resolveTeachingMedia(
          row.audio_url,
          accessLevel,
        ),
      ])

    const body =
      typeof row.body === 'string' &&
      row.body.trim()
        ? row.body
        : null

    if (!body && !videoUrl && !audioUrl) {
      return {
        allowed: false,
        reason: 'no_media',
      }
    }

    return {
      allowed: true,
      reason: 'ok',
      teaching: {
        id: row.id,
        title: row.title || '',
        slug: row.slug ?? null,
        speaker: row.speaker ?? null,
        scripture: row.scripture ?? null,
        description: row.description ?? null,
        body,
        cover_url: row.cover_url ?? null,
        category: row.category ?? null,
        published_at: row.published_at ?? null,
        access_level: accessLevel,
        series_id: row.series_id ?? null,
        season_id: row.season_id ?? null,
        videoUrl,
        audioUrl,
      },
    }
  } catch (error) {
    console.error(
      `[teachings/access] error id=${teachingId}: ${(error as Error)?.message ?? 'unknown'}`,
    )

    return {
      allowed: false,
      reason: 'not_found',
    }
  }
}