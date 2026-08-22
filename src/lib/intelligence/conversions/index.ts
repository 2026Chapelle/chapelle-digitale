/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Point d'entrée public du module conversions.
 */

export * from './types'
export * from './funnel'
export {
  buildConversionCategories,
  buildConversionStages,
  CATEGORY_DEFS,
  FUNNEL_STAGE_DEFS,
  type ConversionCounts,
  type BuildCategoriesOptions,
} from './categories'
export { buildSourceAttribution, labelSource, SOURCE_LABEL_FR } from './source-attribution'
export { buildConversions, type BuildConversionsInput } from './build'
export {
  conversionCountSpecs,
  type ConversionCountWindow,
  type ConversionCountKey,
} from './count-specs'
export { readConversionCounts, type CountDb } from './reader'
