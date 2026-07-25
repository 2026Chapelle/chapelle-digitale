/**
 * Citadelle — Lot Offline 1 : résolution serveur des contenus téléchargeables.
 *
 * SOURCE DE VÉRITÉ UNIQUE des droits : ce module ne recrée pas de système de
 * permissions. Il réutilise l'identité membre canonique (`getVerifiedRouteProfile`,
 * `src/lib/member-auth.ts`) et la publication du contenu (`cms_media.status`).
 *
 * Contenu concerné par le Lot 1 : uniquement `cms_media` de type `pdf` | `audio`
 * (médiathèque). Les PDF de modules de formation (gatés par la validation vidéo
 * 90 %) sont volontairement HORS périmètre pour ne pas toucher la chaîne
 * pédagogique.
 *
 * Sécurité : le bucket `media` est PUBLIC aujourd'hui (constat d'audit). On ne
 * peut donc pas prétendre à une DRM. Ce qu'on garantit ici : (1) les octets sont
 * lus côté serveur via la service role (`storage.download`), jamais via une URL
 * publique renvoyée au client ; (2) chaque appel ré-authentifie et re-vérifie la
 * publication ; (3) aucune URL permanente n'est persistée dans le navigateur.
 */
import { supabaseAdmin } from '@/lib/supabase'
import type { OfflineContentType } from '@/lib/offline/policy'

export interface ResolvedOfflineContent {
  id: string
  type: OfflineContentType
  title: string
  url: string
  mime: string | null
  sizeBytes: number | null
  coverUrl: string | null
  duration: string | null
  status: string
  accessVersion: string
}

const OFFLINE_TYPES: readonly string[] = ['pdf', 'audio']

/** Empreinte d'accès stable (publication + dernière modification). Non secret. */
export function computeAccessVersion(row: {
  status?: string | null
  updated_at?: string | null
  created_at?: string | null
}): string {
  return `${row.status ?? 'unknown'}:${row.updated_at ?? row.created_at ?? '0'}`
}

/**
 * Extrait le chemin objet d'une URL publique Supabase Storage.
 * Ex. `https://x.supabase.co/storage/v1/object/public/media/audio/xxx.mp3`
 *   → `audio/xxx.mp3`. Renvoie null si l'URL n'appartient pas au bucket.
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

/**
 * Résout un contenu téléchargeable PUBLIÉ de type pdf|audio. Renvoie null si
 * absent, non publié, ou d'un type non téléchargeable.
 */
export async function resolveOfflineContent(
  contentId: string,
): Promise<ResolvedOfflineContent | null> {
  if (!contentId || typeof contentId !== 'string') return null
  const { data, error } = await supabaseAdmin
    .from('cms_media')
    .select('id, type, title, url, mime, size_bytes, thumbnail_url, duration, status, created_at, updated_at')
    .eq('id', contentId)
    .maybeSingle()

  if (error || !data) return null
  const row = data as Record<string, any>
  if (row.status !== 'published') return null
  if (!OFFLINE_TYPES.includes(row.type)) return null
  if (!row.url) return null

  return {
    id: row.id,
    type: row.type as OfflineContentType,
    title: row.title || 'Ressource',
    url: row.url,
    mime: row.mime ?? null,
    sizeBytes: typeof row.size_bytes === 'number' ? row.size_bytes : null,
    coverUrl: row.thumbnail_url ?? null,
    duration: row.duration ?? null,
    status: row.status,
    accessVersion: computeAccessVersion(row),
  }
}

/** Bucket public où sont rangés les médias de la médiathèque. */
export const MEDIA_BUCKET = 'media'
