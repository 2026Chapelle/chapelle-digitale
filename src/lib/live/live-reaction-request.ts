import type { NextRequest } from 'next/server'

const MAX_BODY_BYTES = 1024
const LIVE_KEY_RE = /^youtube:[A-Za-z0-9_-]{11}$/
const JSON_CONTENT_TYPE_RE = /^application\/json(?:\s*;\s*charset=utf-8)?$/i

export type ParsedReactionRequest =
  | {
      ok: true
      reaction: unknown
      guestSessionId?: string
      expectedLiveKey: string
    }
  | {
      ok: false
      reason: 'invalid_request'
    }

function invalid(): ParsedReactionRequest {
  return { ok: false, reason: 'invalid_request' }
}

export async function parseReactionRequest(
  request: NextRequest,
): Promise<ParsedReactionRequest> {
  const contentType = request.headers.get('content-type')

  if (!contentType || !JSON_CONTENT_TYPE_RE.test(contentType)) {
    return invalid()
  }

  const expectedLiveKey = request.headers.get('x-live-context')

  if (!expectedLiveKey || !LIVE_KEY_RE.test(expectedLiveKey)) {
    return invalid()
  }

  if (!request.body) {
    return invalid()
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break
      if (!value) continue

      total += value.byteLength

      if (total > MAX_BODY_BYTES) {
        await reader.cancel()
        return invalid()
      }

      chunks.push(value)
    }
  } catch {
    try {
      await reader.cancel()
    } catch {
      // ignored
    }

    return invalid()
  }

  if (total === 0) {
    return invalid()
  }

  const bytes = new Uint8Array(total)
  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  let text: string

  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return invalid()
  }

  let value: unknown

  try {
    value = JSON.parse(text)
  } catch {
    return invalid()
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid()
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record)

  if (
    !keys.includes('reaction') ||
    keys.some((key) => key !== 'reaction' && key !== 'guestSessionId')
  ) {
    return invalid()
  }

  if (
    Object.hasOwn(record, 'guestSessionId') &&
    typeof record.guestSessionId !== 'string'
  ) {
    return invalid()
  }

  return {
    ok: true,
    reaction: record.reaction,
    ...(typeof record.guestSessionId === 'string'
      ? { guestSessionId: record.guestSessionId }
      : {}),
    expectedLiveKey,
  }
}