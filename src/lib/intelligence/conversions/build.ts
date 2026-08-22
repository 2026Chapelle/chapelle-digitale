/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Orchestration PURE du payload Conversions : catégories + tunnel + attribution.
 * Aucun I/O — prend des comptes/acquisition déjà lus + une horloge injectée.
 */

import type { AcquisitionResult } from '../metrics/acquisition'
import { buildConversionCategories, buildConversionStages, type ConversionCounts } from './categories'
import { buildFunnel } from './funnel'
import { buildSourceAttribution } from './source-attribution'
import type { ConversionsPayload } from './types'

export interface BuildConversionsInput {
  counts: ConversionCounts | null
  acquisition: AcquisitionResult | null
  nowIso: string
  period: string
  demo?: boolean
}

/** Construit le payload complet servi par l'API. PURE et déterministe. */
export function buildConversions(input: BuildConversionsInput): ConversionsPayload {
  const demoMode = input.demo === true || input.counts === null
  const categories = buildConversionCategories(input.counts, {
    period: input.period,
    demo: demoMode,
  })
  const stages = buildConversionStages(input.counts, { period: input.period, demo: demoMode })
  const funnel = buildFunnel(stages)
  const sourceAttribution = buildSourceAttribution(demoMode ? null : input.acquisition)

  return {
    generatedAt: input.nowIso,
    demoMode,
    period: input.period,
    funnel,
    categories,
    sourceAttribution,
  }
}
