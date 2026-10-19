export const SENTINELLES_FORMATION_SLUG = 'ecole-des-sentinelles'
export const SENTINELLES_MODULE_COUNT = 6

export function isSentinellesFormation(slug: unknown): boolean {
  return slug === SENTINELLES_FORMATION_SLUG
}

/**
 * Sentinelles est un parcours accompagné : le membre déclare la complétion
 * après avoir consulté au moins un support publié. Les autres formations
 * restent soumises à leur validation vidéo habituelle.
 */
export function canDeclareSentinellesModuleComplete(input: {
  slug: unknown
  hasVideo: boolean
  hasAudio: boolean
  hasPdf: boolean
}): boolean {
  return isSentinellesFormation(input.slug)
    && (input.hasVideo || input.hasAudio || input.hasPdf)
}

/** L'engagement n'est disponible qu'après les six modules publiés et terminés. */
export function hasCompletedAllSentinellesModules(
  publishedModuleIds: readonly string[],
  completedModuleIds: ReadonlySet<string>,
): boolean {
  return (
    publishedModuleIds.length === SENTINELLES_MODULE_COUNT
    && publishedModuleIds.every((moduleId) => completedModuleIds.has(moduleId))
  )
}

export function normalizeSentinellesEngagement(input: {
  declaration?: unknown
  consent?: unknown
}): { declaration: string } | null {
  const declaration = typeof input.declaration === 'string' ? input.declaration.trim() : ''
  if (input.consent !== true || !declaration) return null
  return { declaration: declaration.slice(0, 2000) }
}
