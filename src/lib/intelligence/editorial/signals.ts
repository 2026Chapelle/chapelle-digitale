import type { EditorialSignal, EditorialSignalTruthState as ContractTruthState } from './contracts'

export type EditorialSignalTruthState = Exclude<ContractTruthState, 'EDITORIAL_RECOMMENDATION'>

export interface EditorialSignalWindow {
  start: string
  end: string
}

export interface EditorialSignalInput {
  organizationId: string
  window: EditorialSignalWindow
  nowIso: string
}

export interface EditorialSignalProvider {
  key: string
  fetch(input: EditorialSignalInput): Promise<ReadonlyArray<EditorialSignal>>
}

export interface EditorialTrendInput {
  organizationId: string
  window: EditorialSignalWindow
  nowIso: string
}

export interface EditorialTrendSignal {
  key: string
  source: string
  truthState: EditorialSignalTruthState
  available: boolean
  observedAt: string
  value: unknown
  note?: string | null
}

export interface ExternalTrendProvider {
  key: string
  fetch(input: EditorialTrendInput): Promise<ReadonlyArray<EditorialTrendSignal>>
}

function sortSignals(a: EditorialSignal, b: EditorialSignal): number {
  if (a.source !== b.source) return a.source < b.source ? -1 : 1
  if (a.key !== b.key) return a.key < b.key ? -1 : 1
  if (a.observedAt !== b.observedAt) return a.observedAt < b.observedAt ? -1 : 1
  return 0
}

function normalizeSignal(signal: EditorialSignal, providerKey: string, nowIso: string): EditorialSignal {
  const available = signal.available ?? (signal.truthState === 'REAL' || signal.truthState === 'PARTIAL')
  const truthState = signal.truthState === 'EDITORIAL_RECOMMENDATION'
    ? 'EDITORIAL_RECOMMENDATION'
    : signal.truthState === 'PARTIAL' ? 'PARTIAL' : available ? 'REAL' : 'UNAVAILABLE'

  return {
    ...signal,
    source: signal.source || providerKey,
    available,
    truthState,
    observedAt: signal.observedAt || nowIso,
  }
}

export function classifyEditorialSignalTruthState(input: { available: boolean; complete: boolean }): EditorialSignalTruthState {
  if (!input.available) return 'UNAVAILABLE'
  return input.complete ? 'REAL' : 'PARTIAL'
}

export async function mergeEditorialSignals(
  providers: ReadonlyArray<EditorialSignalProvider>,
  input: EditorialSignalInput,
): Promise<ReadonlyArray<EditorialSignal>> {
  const out: EditorialSignal[] = []

  for (const provider of providers) {
    try {
      const result = await provider.fetch(input)
      for (const signal of result ?? []) {
        out.push(normalizeSignal(signal, provider.key, input.nowIso))
      }
    } catch (error) {
      out.push({
        key: `${provider.key}:unavailable`,
        source: provider.key,
        truthState: 'UNAVAILABLE',
        available: false,
        observedAt: input.nowIso,
        value: null,
        note: error instanceof Error ? error.message : 'provider unavailable',
      })
    }
  }

  return out.sort(sortSignals)
}

export const EXTERNAL_TREND_PROVIDERS: ReadonlyArray<ExternalTrendProvider> = []

