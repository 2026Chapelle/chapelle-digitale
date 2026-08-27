type EditorialLogicalIdentityInput = {
  organizationId?: string | null
  recommendationKind?: string | null
  contentKind?: string | null
  targetChannel?: string | null
  sourceContentId?: string | null
  sourceSnapshot?: Record<string, unknown> | null
  signals?: ReadonlyArray<{ key?: string | null }> | null
}

function normalized(value?: string | null) {
  return value?.trim() || 'none'
}

function signalSourceIdentity(input: EditorialLogicalIdentityInput) {
  const snapshotKeys = input.sourceSnapshot?.signalKeys
  const signalKeys = Array.isArray(snapshotKeys)
    ? snapshotKeys.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : input.signals?.map((signal) => signal.key).filter((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? []
  return signalKeys.length > 0 ? `signals:${[...signalKeys].sort().join(',')}` : 'signals:none'
}

export function buildEditorialLogicalIdentity(input: EditorialLogicalIdentityInput) {
  const sourceIdentity = input.sourceContentId?.trim()
    ? `source:${input.sourceContentId.trim()}`
    : signalSourceIdentity(input)
  return [
    normalized(input.organizationId),
    normalized(input.recommendationKind),
    normalized(input.contentKind),
    normalized(input.targetChannel),
    sourceIdentity,
  ].join('|')
}
