/**
 * Construction/validation du payload admin « Prières & Guides » (V2.3-C).
 * Module lib (hors route) : réutilisé par POST et PATCH. Pur, testable.
 */
export const GUIDE_STATUSES = ['draft', 'published', 'archived']
export const GUIDE_ACCESS = ['public_preview', 'member', 'premium']

export function buildGuidePayload(body: any): { payload?: Record<string, any>; error?: string } {
  const str = (v: any, max = 20000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const slug = str(body?.slug, 160).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '')
  const title = str(body?.title, 200)
  const category = str(body?.category, 80)
  const excerpt = str(body?.excerpt, 600)
  const content = str(body?.content, 20000)
  if (!slug) return { error: 'slug requis.' }
  if (!title) return { error: 'titre requis.' }
  if (!category) return { error: 'catégorie requise.' }
  if (!excerpt) return { error: 'extrait requis.' }
  if (!content) return { error: 'contenu requis.' }
  const status = GUIDE_STATUSES.includes(body?.status) ? body.status : 'draft'
  const access_level = GUIDE_ACCESS.includes(body?.access_level) ? body.access_level : 'member'
  const steps = Array.isArray(body?.guide_steps)
    ? body.guide_steps.map((s: any) => str(s, 500)).filter(Boolean)
    : []
  const payload: Record<string, any> = {
    slug, title, category, excerpt, content, status, access_level,
    duration_minutes: Number.isFinite(+body?.duration_minutes) ? Math.max(0, Math.trunc(+body.duration_minutes)) : null,
    level: str(body?.level, 40) || null,
    intention: str(body?.intention, 400) || null,
    recommended_moment: str(body?.recommended_moment, 200) || null,
    guide_steps: steps,
    takeaway: str(body?.takeaway, 1000) || null,
    image_url: str(body?.image_url, 800) || null,
    image_alt: str(body?.image_alt, 300) || null,
    overlay_tone: str(body?.overlay_tone, 40) || null,
    pdf_url: str(body?.pdf_url, 800) || null,
    display_order: Number.isFinite(+body?.display_order) ? Math.trunc(+body.display_order) : 0,
  }
  if (status === 'published') payload.published_at = new Date().toISOString()
  return { payload }
}
