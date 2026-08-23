/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 1 · BARREL du module Funnel.
 * Réexporte l'API publique du funnel de décision Citadelle (builder pur + table
 * statique des étapes). Aucun I/O ; l'agrégateur superviseur branche le réel.
 */

export { buildDecisionFunnel } from './build'
export type { FunnelBuildInput } from './build'

export {
  DECISION_FUNNEL_STAGE_DEFS,
  isStageInstrumented,
  getStageDef,
  orderedStageDefs,
} from './stages'
export type { FunnelStageDef } from './stages'
