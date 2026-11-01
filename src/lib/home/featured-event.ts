export interface FeaturedHomeEvent {
  id: string
  title: string
  description?: string | null
  starts_at: string | null
  ends_at?: string | null
  location?: string | null
  is_online?: boolean | null
  cover_url?: string | null
  cta_href?: string | null
  cta_label?: string | null
  status?: string | null
  is_featured?: boolean | null
  sort_order?: number | null
}

/** Only an explicit, published CMS selection may appear on the homepage. */
export function selectFeaturedHomeEvent(rows: FeaturedHomeEvent[] | null, now = Date.now()): FeaturedHomeEvent | null {
  const eligible = (rows ?? []).filter(row => {
    if (row.status !== 'published' || row.is_featured !== true || !row.title?.trim()) return false
    if (!row.starts_at) return false
    const start = Date.parse(row.starts_at)
    if (!Number.isFinite(start)) return false
    // No guessed end time: an event without ends_at stops being promoted at its start.
    const end = row.ends_at ? Date.parse(row.ends_at) : start
    return Number.isFinite(end) && end > now && end >= start
  })
  eligible.sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    Date.parse(a.starts_at!) - Date.parse(b.starts_at!) ||
    a.id.localeCompare(b.id),
  )
  return eligible[0] ?? null
}