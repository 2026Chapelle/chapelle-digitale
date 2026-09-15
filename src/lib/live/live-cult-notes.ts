export const LIVE_CULT_NOTE_KINDS = [
  'note',
  'received_word',
  'scripture',
  'decision',
  'meditation',
] as const

export type LiveCultNoteKind =
  (typeof LIVE_CULT_NOTE_KINDS)[number]

export type LiveCultNote = {
  id: string
  cmsLiveId: string
  kind: LiveCultNoteKind
  body: string
  positionSeconds: number | null
  scriptureReference: string | null
  createdAt: string
  updatedAt: string
}

export type LiveCultNoteWrite = {
  id: string
  cmsLiveId: string
  kind: LiveCultNoteKind
  body: string
  positionSeconds: number | null
  scriptureReference: string | null
}

export function normalizeLiveCultNoteKind(
  value: unknown,
): LiveCultNoteKind | null {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 'note'
  }

  if (
    typeof value !== 'string' ||
    !LIVE_CULT_NOTE_KINDS.includes(
      value as LiveCultNoteKind,
    )
  ) {
    return null
  }

  return value as LiveCultNoteKind
}

export function normalizeLiveCultNoteBody(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const body = value.trim()

  if (
    body.length < 1 ||
    body.length > 10000
  ) {
    return null
  }

  return body
}

export function normalizeScriptureReference(
  value: unknown,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null
  }

  if (typeof value !== 'string') {
    return null
  }

  const reference = value.trim()

  if (reference.length === 0) {
    return null
  }

  if (reference.length > 200) {
    return null
  }

  return reference
}

export function normalizePositionSeconds(
  value: unknown,
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null
  }

  return Math.floor(value)
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validCultNoteUuid(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    UUID_PATTERN.test(value)
  )
}
