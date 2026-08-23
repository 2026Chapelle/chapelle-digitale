/**
 * CITADELLE INTELLIGENCE — 5B · MOTEUR DE SIGNAUX « À comprendre aujourd'hui ».
 *
 * `evaluateSignals` est PUR : il applique toutes les règles déterministes,
 * collecte les signaux réellement prouvés, les priorise (tri + plafond 5) et
 * sélectionne au plus une action prioritaire. Aucun LLM, aucune I/O.
 */

import type { DecisionSignal, DecisionSignalsPayload } from '../contract'
import { SIGNAL_RULES, type SignalsBuildInput } from './rules'
import { rankAndSelect } from './priority'

/**
 * Évalue tous les signaux de décision à partir des faits déjà lus.
 * Chaque signal émis porte EVIDENCE + SOURCE + PERIOD + SCOPE (garanti par les
 * règles). Les LOW / INSUFFICIENT_DATA sont conservés (jamais action prioritaire).
 */
export function evaluateSignals(input: SignalsBuildInput): DecisionSignalsPayload {
  const raw: DecisionSignal[] = []
  for (const rule of SIGNAL_RULES) {
    const signal = rule(input)
    if (signal) raw.push(signal)
  }

  const { signals, actionPriority } = rankAndSelect(raw)

  return {
    generatedAt: input.nowIso,
    period: input.period,
    scope: input.scope,
    demoMode: input.demo ?? false,
    signals,
    actionPriority,
  }
}
