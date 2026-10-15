const RETREAT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function mahanaimRetreatDayImageSlug(retreatSlug: string, dayNumber: number): string | null {
  if (!RETREAT_SLUG.test(retreatSlug) || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 99) {
    return null
  }

  return `mahanaim-${retreatSlug}-jour-${String(dayNumber).padStart(2, '0')}`
}

export function resolveMahanaimDayImageUrl(dayNumber: number, cmsImageUrl: string | null): string | null {
  if (cmsImageUrl) return cmsImageUrl
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 10) return null

  return `/images/mahanaim/jour-${String(dayNumber).padStart(2, '0')}.webp`
}
