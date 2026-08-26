import type { EditorialRecommendation, EditorialSignal } from './contracts'

export interface EditorialPerformanceObservationInput {
  organizationId: string
  recommendationId: string
  status: EditorialRecommendation['status']
  metrics: Record<string, number | null>
  humanEdited: boolean
  appendEvent?: (input: {
    organizationId: string
    recommendationId: string
    eventType: string
    payload: Record<string, unknown>
    createdBy: string | null
  }) => Promise<unknown>
  createdBy?: string | null
}

export async function recordEditorialPerformanceObservation(
  input: EditorialPerformanceObservationInput,
): Promise<{ appended: boolean; reason?: string }> {
  if (input.status !== 'COMPLETED') return { appended: false, reason: 'completion-required' }
  if (input.appendEvent) {
    await input.appendEvent({
      organizationId: input.organizationId,
      recommendationId: input.recommendationId,
      eventType: 'PERFORMANCE_OBSERVED',
      payload: { metrics: input.metrics, humanEdited: input.humanEdited },
      createdBy: input.createdBy ?? null,
    })
  }
  return { appended: true }
}

export function buildEditorialSignalSignature(signals: ReadonlyArray<EditorialSignal>): string {
  return signals
    .map((signal) =>
      [
        signal.key,
        signal.truthState,
        signal.available ? '1' : '0',
        signal.observedAt,
        JSON.stringify(signal.value ?? null),
      ].join(':'),
    )
    .sort()
    .join('|')
}

export function hasMeaningfulNewEditorialSignal(previousSignature: string, currentSignature: string): boolean {
  return previousSignature !== currentSignature
}

export function isHumanLockedEditorialStatus(status: EditorialRecommendation['status']): boolean {
  return status === 'ACCEPTED' || status === 'SCHEDULED' || status === 'COMPLETED'
}

export function shouldSuppressRejectedEditorialRecommendation(
  recommendation: EditorialRecommendation,
  currentSignalSignature: string,
): boolean {
  if (recommendation.status !== 'REJECTED') return false
  const previousSignature = typeof recommendation.sourceSnapshot.signalSignature === 'string'
    ? recommendation.sourceSnapshot.signalSignature
    : null
  return previousSignature === currentSignalSignature
}
