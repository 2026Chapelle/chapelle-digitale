/**
 * Couche CMS — lecture serveur des contenus administrables (schéma public).
 *
 * Principe identique au reste du projet : « Supabase-ready, fallback statique ».
 *   - Supabase configuré   → lit les tables cms_* (lignes publiées).
 *   - Supabase non configuré → renvoie `null` ⇒ l'appelant garde son contenu
 *     statique actuel. Aucune régression du site public.
 *
 * SERVER-ONLY (importe `supabaseAdmin`). Les composants client passent par
 * /api/cms/[resource] ou /api/admin/cms/[resource]. Les *types* sont importables
 * via `import type`.
 */
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

// ── Types de contenu ────────────────────────────────────────────────────────
export type CmsStatus = 'draft' | 'published' | 'scheduled' | 'live' | 'ended' | 'submitted' | 'approved' | 'rejected'

export interface CmsRow { id: string; status?: string; sort_order?: number; [k: string]: any }

export interface CmsPage extends CmsRow { slug: string; title: string; description?: string }
export interface CmsSection extends CmsRow { page_slug: string; key: string; type: string; title?: string; body?: string; is_active: boolean }
export interface CmsHomepageBlock extends CmsRow { block_key: string; title?: string; subtitle?: string; is_active: boolean }
export interface CmsMedia extends CmsRow { type: string; title: string; url: string; category?: string }
export interface CmsEvent extends CmsRow { title: string; starts_at?: string; location?: string; is_online?: boolean }
export interface CmsLive extends CmsRow { title: string; youtube_url?: string; scheduled_at?: string; is_live?: boolean }
export interface CmsPodcast extends CmsRow { title: string; audio_url?: string; episode?: number }
export interface CmsTeaching extends CmsRow { title: string; speaker?: string; scripture?: string }
export interface CmsTestimony extends CmsRow { author_name: string; body: string; featured?: boolean }
export interface CmsArticle extends CmsRow { title: string; slug?: string; excerpt?: string; body?: string; cover_url?: string; author?: string; category?: string; featured?: boolean }
export interface CmsPlatformContent extends CmsRow { platform_slug: string; title: string }

/** Tables CMS reconnues par les routes génériques (sécurité : liste blanche). */
export const CMS_TABLES = [
  'cms_pages', 'cms_sections', 'cms_homepage_blocks', 'cms_navigation', 'cms_media',
  'cms_events', 'cms_lives', 'cms_podcasts', 'cms_teachings', 'cms_testimonies',
  'cms_platform_content', 'cms_settings', 'cms_articles',
] as const
export type CmsTable = typeof CMS_TABLES[number]

/** Statuts considérés « visibles publiquement » selon la table. */
const PUBLIC_STATUSES: Record<string, string[]> = {
  cms_lives: ['scheduled', 'live', 'ended', 'published'],
  cms_testimonies: ['approved', 'published'],
}
const publicStatusesFor = (table: string) => PUBLIC_STATUSES[table] ?? ['published']

interface ListOptions {
  /** Ne renvoyer que les lignes publiées/visibles (lecture publique). */
  publicOnly?: boolean
  /** Filtre d'égalité simple (ex. { page_slug: 'dons' }). */
  filter?: Record<string, string | number | boolean>
  /** Colonne de tri (défaut: sort_order). */
  orderBy?: string
  limit?: number
}

/**
 * Lecture générique d'une table CMS. Renvoie `null` en démo (⇒ fallback UI).
 */
export async function cmsList<T = CmsRow>(table: CmsTable, opts: ListOptions = {}): Promise<T[] | null> {
  if (IS_DEMO_MODE) return null
  try {
    let q = supabaseAdmin.from(table).select('*')
    if (opts.publicOnly) {
      const statuses = publicStatusesFor(table)
      q = q.in('status', statuses)
      // tables avec is_active : filtre additionnel
      if (['cms_sections', 'cms_homepage_blocks', 'cms_navigation'].includes(table)) {
        q = q.eq('is_active', true)
      }
    }
    if (opts.filter) for (const [k, v] of Object.entries(opts.filter)) q = q.eq(k, v as any)
    q = q.order(opts.orderBy ?? 'sort_order', { ascending: true })
    if (opts.limit) q = q.limit(opts.limit)
    const { data, error } = await q
    if (error) return null
    return (data as T[]) ?? null
  } catch {
    return null
  }
}

/** Une page par slug (publiée). */
export async function cmsPage(slug: string): Promise<CmsPage | null> {
  if (IS_DEMO_MODE) return null
  try {
    const { data } = await supabaseAdmin.from('cms_pages').select('*').eq('slug', slug).eq('status', 'published').single()
    return (data as CmsPage) ?? null
  } catch {
    return null
  }
}

/** Sections publiées d'une page, triées. */
export async function cmsSections(pageSlug: string): Promise<CmsSection[] | null> {
  return cmsList<CmsSection>('cms_sections', { publicOnly: true, filter: { page_slug: pageSlug } })
}

/** Paramètres globaux sous forme de dictionnaire clé→valeur. */
export async function cmsSettings(): Promise<Record<string, any> | null> {
  if (IS_DEMO_MODE) return null
  try {
    const { data } = await supabaseAdmin.from('cms_settings').select('key, value')
    if (!data) return null
    const map: Record<string, any> = {}
    for (const row of data as any[]) map[row.key] = row.value
    return map
  } catch {
    return null
  }
}
