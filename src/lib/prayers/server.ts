/**
 * Couche data serveur « Prières & Guides » (V2.3-C).
 *
 * Lit depuis Supabase (table public.prayer_guides) SI elle existe, sinon REPLI
 * automatique sur le contenu statique de ./library.ts. L'app fonctionne donc
 * normalement tant que le SQL manuel (docs/sql/citadelle-v23c-*) n'est pas appliqué.
 *
 * ⚠️ SERVEUR UNIQUEMENT (importe supabaseAdmin). La projection publique n'expose
 * JAMAIS `content`/`guideSteps`/`takeaway`/`pdfUrl`.
 */
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import {
  listPublicPrayerCards, listMemberPrayers, getFullPrayer,
  categoryColor, categoryEmoji,
  type PublicPrayerCard, type MemberPrayer,
} from '@/lib/prayers/library'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (s: string) => UUID_RE.test(s)

/* ---------- mappers DB → projections ---------- */
function rowToPublicCard(r: any): PublicPrayerCard {
  return {
    id: r.id, slug: r.slug, title: r.title, category: r.category,
    summary: r.excerpt, excerpt: r.excerpt,
    coverIcon: categoryEmoji(r.category), color: categoryColor(r.category),
    durationMinutes: r.duration_minutes || 0,
    intention: r.intention || '', recommendedMoment: r.recommended_moment || '',
    imageUrl: r.image_url || undefined, imageAlt: r.image_alt || undefined, overlayTone: r.overlay_tone || undefined,
    accessLevel: r.access_level || 'member', locked: true,
  }
}
function rowToMember(r: any): MemberPrayer {
  return {
    id: r.id, slug: r.slug, title: r.title, category: r.category,
    summary: r.excerpt, excerpt: r.excerpt, content: r.content,
    coverIcon: categoryEmoji(r.category), color: categoryColor(r.category),
    durationMinutes: r.duration_minutes || 0, level: r.level || '',
    intention: r.intention || '', recommendedMoment: r.recommended_moment || '',
    guideSteps: Array.isArray(r.guide_steps) ? r.guide_steps : [],
    takeaway: r.takeaway || '',
    imageUrl: r.image_url || undefined, imageAlt: r.image_alt || undefined, overlayTone: r.overlay_tone || undefined,
    hasPdf: !!r.pdf_url, accessLevel: r.access_level || 'member',
  }
}
const PUBLIC_COLS = 'id, slug, title, category, excerpt, duration_minutes, intention, recommended_moment, image_url, image_alt, overlay_tone, access_level, status, display_order'

/* ---------- lecture publique / membre (fallback statique) ---------- */
export async function getPublicPrayerCards(): Promise<PublicPrayerCard[]> {
  if (IS_DEMO_MODE) return listPublicPrayerCards()
  try {
    const { data, error } = await supabaseAdmin.from('prayer_guides')
      .select(PUBLIC_COLS).eq('status', 'published')
      .order('display_order', { ascending: true }).order('title', { ascending: true })
    if (error || !data) return listPublicPrayerCards()
    return data.map(rowToPublicCard)
  } catch { return listPublicPrayerCards() }
}

export async function getMemberPrayers(): Promise<MemberPrayer[]> {
  if (IS_DEMO_MODE) return listMemberPrayers()
  try {
    const { data, error } = await supabaseAdmin.from('prayer_guides')
      .select('*').eq('status', 'published')
      .order('display_order', { ascending: true }).order('title', { ascending: true })
    if (error || !data) return listMemberPrayers()
    return data.map(rowToMember)
  } catch { return listMemberPrayers() }
}

/** Détail par slug (ou uuid) — fallback statique si table absente. */
export async function getMemberPrayerDetail(idOrSlug: string): Promise<MemberPrayer | null> {
  if (IS_DEMO_MODE) return getFullPrayer(idOrSlug)
  try {
    const col = isUuid(idOrSlug) ? 'id' : 'slug'
    const { data, error } = await supabaseAdmin.from('prayer_guides')
      .select('*').eq(col, idOrSlug).eq('status', 'published').limit(1).maybeSingle()
    if (error) return getFullPrayer(idOrSlug) // table absente → repli statique
    if (!data) return null                    // table présente mais introuvable
    return rowToMember(data)
  } catch { return getFullPrayer(idOrSlug) }
}

/** URL PDF autorisée pour un membre (avec l'id pour tracer). null si aucun PDF. */
export async function getMemberPrayerPdf(idOrSlug: string): Promise<{ id: string; url: string } | null> {
  if (IS_DEMO_MODE) return null
  try {
    const col = isUuid(idOrSlug) ? 'id' : 'slug'
    const { data, error } = await supabaseAdmin.from('prayer_guides')
      .select('id, pdf_url, status').eq(col, idOrSlug).limit(1).maybeSingle()
    if (error || !data || data.status !== 'published' || !data.pdf_url) return null
    return { id: data.id, url: data.pdf_url }
  } catch { return null }
}

/** Enregistre un événement stat. No-op silencieux si table absente ou id non-uuid. */
export async function recordPrayerEvent(prayerGuideId: string, eventType: string, userId?: string | null): Promise<void> {
  if (IS_DEMO_MODE || !prayerGuideId || !isUuid(prayerGuideId)) return
  try {
    await supabaseAdmin.from('prayer_guide_events')
      .insert({ prayer_guide_id: prayerGuideId, event_type: eventType, user_id: userId || null })
  } catch { /* no-op : table events absente */ }
}

/* ---------- Admin CRUD (DB uniquement ; sqlReady=false si table absente) ---------- */
export interface AdminGuidesResult { sqlReady: boolean; guides: any[] }

export async function adminListGuides(): Promise<AdminGuidesResult> {
  if (IS_DEMO_MODE) return { sqlReady: false, guides: [] }
  try {
    const { data, error } = await supabaseAdmin.from('prayer_guides')
      .select('id, slug, title, category, status, access_level, duration_minutes, image_url, image_alt, overlay_tone, display_order, updated_at')
      .order('display_order', { ascending: true }).order('updated_at', { ascending: false })
    if (error) return { sqlReady: false, guides: [] }
    return { sqlReady: true, guides: data || [] }
  } catch { return { sqlReady: false, guides: [] } }
}

export async function adminGetGuide(id: string): Promise<any | null> {
  if (IS_DEMO_MODE) return null
  try {
    const { data, error } = await supabaseAdmin.from('prayer_guides').select('*').eq('id', id).limit(1).maybeSingle()
    if (error) return null
    return data || null
  } catch { return null }
}

export async function adminCreateGuide(payload: Record<string, any>): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (IS_DEMO_MODE) return { ok: false, message: 'Supabase requis.' }
  try {
    const { data, error } = await supabaseAdmin.from('prayer_guides').insert(payload).select('id').single()
    if (error || !data) return { ok: false, message: error?.message || 'Création impossible (table absente ?).' }
    return { ok: true, id: data.id }
  } catch (e: any) { return { ok: false, message: e?.message || 'Erreur' } }
}

export async function adminUpdateGuide(id: string, patch: Record<string, any>): Promise<{ ok: boolean; message?: string }> {
  if (IS_DEMO_MODE) return { ok: false, message: 'Supabase requis.' }
  try {
    const { data, error } = await supabaseAdmin.from('prayer_guides').update(patch).eq('id', id).select('id').single()
    if (error || !data) return { ok: false, message: error?.message || 'Mise à jour impossible.' }
    return { ok: true }
  } catch (e: any) { return { ok: false, message: e?.message || 'Erreur' } }
}

export async function adminArchiveGuide(id: string): Promise<{ ok: boolean; message?: string }> {
  return adminUpdateGuide(id, { status: 'archived' })
}

/* ---------- Stats admin ---------- */
export interface PrayerStats {
  sqlReady: boolean
  totalPublished: number
  totalViews: number
  totalReads: number
  totalDownloads: number
  topViewed: { id: string; title: string; count: number }[]
  topRead: { id: string; title: string; count: number }[]
  topDownloaded: { id: string; title: string; count: number }[]
  byCategory: { category: string; count: number }[]
  recent: { title: string; eventType: string; createdAt: string }[]
}

function emptyStats(sqlReady: boolean): PrayerStats {
  return { sqlReady, totalPublished: 0, totalViews: 0, totalReads: 0, totalDownloads: 0, topViewed: [], topRead: [], topDownloaded: [], byCategory: [], recent: [] }
}

export async function getPrayerStats(): Promise<PrayerStats> {
  if (IS_DEMO_MODE) return emptyStats(false)
  try {
    const { data: guides, error: gErr } = await supabaseAdmin.from('prayer_guides').select('id, title, category, status')
    if (gErr || !guides) return emptyStats(false)
    const { data: events, error: eErr } = await supabaseAdmin.from('prayer_guide_events')
      .select('prayer_guide_id, event_type, created_at').order('created_at', { ascending: false }).limit(2000)
    if (eErr) return { ...emptyStats(false), totalPublished: guides.filter((g: any) => g.status === 'published').length }

    const titleById: Record<string, string> = {}
    const catById: Record<string, string> = {}
    for (const g of guides as any[]) { titleById[g.id] = g.title; catById[g.id] = g.category }

    const viewsBy: Record<string, number> = {}
    const readsBy: Record<string, number> = {}
    const dlBy: Record<string, number> = {}
    const byCat: Record<string, number> = {}
    let totalViews = 0, totalReads = 0, totalDownloads = 0
    for (const ev of (events as any[]) || []) {
      const pid = ev.prayer_guide_id
      const t = ev.event_type
      if (t === 'member_open' || t === 'public_view') { viewsBy[pid] = (viewsBy[pid] || 0) + 1; totalViews++ }
      if (t === 'member_read') { readsBy[pid] = (readsBy[pid] || 0) + 1; totalReads++ }
      if (t === 'download') { dlBy[pid] = (dlBy[pid] || 0) + 1; totalDownloads++ }
      const cat = catById[pid] || 'Autre'
      byCat[cat] = (byCat[cat] || 0) + 1
    }
    const top = (m: Record<string, number>) => Object.entries(m)
      .map(([id, count]) => ({ id, title: titleById[id] || '—', count }))
      .sort((a, b) => b.count - a.count).slice(0, 5)

    const recent = ((events as any[]) || []).slice(0, 10).map((ev) => ({
      title: titleById[ev.prayer_guide_id] || '—', eventType: ev.event_type, createdAt: ev.created_at,
    }))

    return {
      sqlReady: true,
      totalPublished: guides.filter((g: any) => g.status === 'published').length,
      totalViews, totalReads, totalDownloads,
      topViewed: top(viewsBy), topRead: top(readsBy), topDownloaded: top(dlBy),
      byCategory: Object.entries(byCat).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      recent,
    }
  } catch { return emptyStats(false) }
}
