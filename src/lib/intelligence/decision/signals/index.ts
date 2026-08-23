/**
 * CITADELLE INTELLIGENCE — 5B · Point d'entrée public des SIGNAUX de décision.
 * Réexporte le moteur pur, les règles, la priorisation et le contexte qualité.
 */

export { evaluateSignals } from './engine'
export {
  SIGNAL_IDS,
  SIGNAL_RULES,
  ruleDropOff,
  ruleConversion,
  ruleChannelOpportunity,
  ruleYouTubeTrend,
  ruleSeoInsufficient,
  ruleDataQualityGaps,
  ruleConnectorStatus,
  ruleContentSignal,
  type SignalsBuildInput,
  type DecisionContentFacts,
  type ConnectorStatusInput,
} from './rules'
export {
  rankAndSelect,
  compareSignals,
  isEligibleActionPriority,
  ACTION_PRIORITY_ELIGIBLE_CATEGORIES,
  MAX_SIGNALS,
  type RankResult,
} from './priority'
export { buildDataQuality, type DataQualityBuildInput } from '../data-quality'
