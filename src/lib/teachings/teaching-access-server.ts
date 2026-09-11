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

export interface TeachingReadingContext {
  series?: {
    id: string
    slug?: string | null
    title: string
    short_description?: string | null
    cover_url?: string | null
  } | null
  season?: {
    id: string
    season_number: number
    title?: string | null
    short_description?: string | null
    cover_url?: string | null
  } | null
}

export interface TeachingReadingResult
  extends TeachingDeliveryResult {
  context?: TeachingReadingContext
  previous?: {
    slug: string
    title: string
  } | null
  next?: {
    slug: string
    title: string
  } | null
}

/**
 * IMPORTANT :
 * description/body/video/audio volontairement absents.
 */
const METADATA_SELECT =
  'id, title, slug, speaker, scripture, cover_url, category, published_at, access_level, is_featured, sort_order, series_id, season_id'

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

    const merged =
      mergePublicTeachingContent(
        metadata,
        publicContent,
      )

    const [
      seriesResult,
      seasonsResult,
    ] = await Promise.all([
      supabaseCmsRead
        .from('cms_teaching_series')
        .select('id, slug, title')
        .eq('status', 'published'),

      supabaseCmsRead
        .from('cms_teaching_seasons')
        .select(
          'id, series_id, season_number, title',
        )
        .eq('status', 'published'),
    ])

    const seriesById =
      new Map(
        Array.isArray(seriesResult.data)
          ? seriesResult.data.map(
              (row) => [
                row.id,
                row,
              ],
            )
          : [],
      )

    const seasonsById =
      new Map(
        Array.isArray(seasonsResult.data)
          ? seasonsResult.data.map(
              (row) => [
                row.id,
                row,
              ],
            )
          : [],
      )

    return merged.map((item) => {
      const series =
        item.series_id
          ? seriesById.get(item.series_id)
          : null

      const season =
        item.season_id
          ? seasonsById.get(item.season_id)
          : null

      return {
        ...item,

        series_title:
          series?.title ?? null,

        series_slug:
          series?.slug ?? null,

        season_number:
          season?.season_number != null
            ? Number(season.season_number)
            : null,

        season_title:
          season?.title ?? null,
      }
    })
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
export async function getTeachingReadingBySlug(
  slug: string,
  ctx: TeachingAccessContext,
): Promise<TeachingReadingResult> {
  const teachingSlug = (slug || '').trim()

  if (!teachingSlug || IS_DEMO_MODE) {
    return {
      allowed: false,
      reason: 'not_found',
    }
  }

  try {
    const { data: identity, error: identityError } =
      await supabaseAdmin
        .from('cms_teachings')
        .select(
          'id, slug, series_id, season_id, sort_order',
        )
        .eq('slug', teachingSlug)
        .maybeSingle()

    if (identityError || !identity?.id) {
      return {
        allowed: false,
        reason: 'not_found',
      }
    }

    const delivery =
      await getTeachingDelivery(
        identity.id,
        ctx,
      )

    if (!delivery.allowed || !delivery.teaching) {
      return delivery
    }

    let series: TeachingReadingContext['series'] = null
    let season: TeachingReadingContext['season'] = null

    if (identity.series_id) {
      const { data } =
        await supabaseAdmin
          .from('cms_teaching_series')
          .select(
            'id, slug, title, short_description, cover_url',
          )
          .eq('id', identity.series_id)
          .eq('status', 'published')
          .maybeSingle()

      if (data) {
        series = {
          id: data.id,
          slug: data.slug ?? null,
          title: data.title || '',
          short_description:
            data.short_description ?? null,
          cover_url:
            data.cover_url ?? null,
        }
      }
    }

    if (identity.season_id) {
      const { data } =
        await supabaseAdmin
          .from('cms_teaching_seasons')
          .select(
            'id, season_number, title, short_description, cover_url',
          )
          .eq('id', identity.season_id)
          .eq('status', 'published')
          .maybeSingle()

      if (data) {
        season = {
          id: data.id,
          season_number:
            Number(data.season_number || 0),
          title:
            data.title ?? null,
          short_description:
            data.short_description ?? null,
          cover_url:
            data.cover_url ?? null,
        }
      }
    }

    let siblings: Array<{
      slug: string
      title: string
      sort_order: number
    }> = []

    if (identity.season_id) {
      const { data } =
        await supabaseAdmin
          .from('cms_teachings')
          .select(
            'slug, title, sort_order, access_level',
          )
          .eq('status', 'published')
          .eq('season_id', identity.season_id)
          .not('slug', 'is', null)
          .order('sort_order', {
            ascending: true,
          })

      if (Array.isArray(data)) {
        siblings =
          data
            .filter(
              (item) => {
                if (
                  typeof item.slug !== 'string' ||
                  !item.slug.trim()
                ) {
                  return false
                }

                const level =
                  normalizeAccessLevel(
                    item.access_level,
                  )

                return decideTeachingAccess(
                  level,
                  ctx,
                ).allowed
              },
            )
            .map((item) => ({
              slug: item.slug as string,
              title: item.title || '',
              sort_order:
                Number(item.sort_order || 0),
            }))
      }
    }

    const currentIndex =
      siblings.findIndex(
        (item) =>
          item.slug === teachingSlug,
      )

    const previous =
      currentIndex > 0
        ? {
            slug:
              siblings[currentIndex - 1].slug,
            title:
              siblings[currentIndex - 1].title,
          }
        : null

    const next =
      currentIndex >= 0 &&
      currentIndex < siblings.length - 1
        ? {
            slug:
              siblings[currentIndex + 1].slug,
            title:
              siblings[currentIndex + 1].title,
          }
        : null

    return {
      ...delivery,
      context: {
        series,
        season,
      },
      previous,
      next,
    }
  } catch {
    return {
      allowed: false,
      reason: 'not_found',
    }
  }
}