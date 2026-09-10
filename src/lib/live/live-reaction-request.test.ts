import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { parseReactionRequest } from './live-reaction-request'

const LIVE = 'youtube:ABCDEFGHIJK'

function request(body: BodyInit | null, headers: HeadersInit = {}) {
  return new NextRequest('https://loopback.test/api/live/reactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Live-Context': LIVE,
      ...headers,
    },
    body,
    duplex: 'half',
  } as any)
}

describe('parseReactionRequest', () => {
  it('accepts compact JSON and preserves an unknown reaction for the server engine', async () => {
    await expect(parseReactionRequest(request('{"reaction":"fire"}'))).resolves.toEqual({
      ok: true, reaction: 'fire', expectedLiveKey: LIVE,
    })
  })

  it('accepts an optional guest session id', async () => {
    await expect(parseReactionRequest(request('{"reaction":"heart","guestSessionId":"guest-id"}'))).resolves.toEqual({
      ok: true, reaction: 'heart', guestSessionId: 'guest-id', expectedLiveKey: LIVE,
    })
  })

  it.each([
    ['malformed JSON', '{'],
    ['empty body', ''],
    ['null', 'null'],
    ['an array', '[]'],
    ['an unknown field', '{"reaction":"fire","live_key":"youtube:LMNOPQRSTUV"}'],
    ['a non-string guest id', '{"reaction":"fire","guestSessionId":3}'],
  ])('rejects %s', async (_label, body) => {
    await expect(parseReactionRequest(request(body))).resolves.toEqual({ ok: false, reason: 'invalid_request' })
  })

  it('rejects malformed UTF-8', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xc3, 0x28]))
        controller.close()
      },
    })
    await expect(parseReactionRequest(request(stream))).resolves.toEqual({ ok: false, reason: 'invalid_request' })
  })

  it('accepts exactly 1024 bytes and rejects a 1025-byte body', async () => {
    const exact = JSON.stringify({ reaction: 'fire', guestSessionId: 'x'.repeat(985) })
    expect(new TextEncoder().encode(exact)).toHaveLength(1024)
    await expect(parseReactionRequest(request(exact))).resolves.toMatchObject({ ok: true })

    const oversized = JSON.stringify({ reaction: 'fire', guestSessionId: 'x'.repeat(986) })
    expect(new TextEncoder().encode(oversized)).toHaveLength(1025)
    await expect(parseReactionRequest(request(oversized))).resolves.toEqual({ ok: false, reason: 'invalid_request' })
  })

  it('counts multibyte UTF-8 by bytes and cancels an oversized stream early', async () => {
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1025))
      },
      cancel() {
        cancelled = true
      },
    })
    await expect(parseReactionRequest(request(stream))).resolves.toEqual({ ok: false, reason: 'invalid_request' })
    expect(cancelled).toBe(true)
  })

  it.each([
    ['text/plain'],
    ['application/problem+json'],
  ])('rejects unsupported content type %s', async (contentType) => {
    await expect(parseReactionRequest(request('{"reaction":"fire"}', { 'Content-Type': contentType }))).resolves.toEqual({ ok: false, reason: 'invalid_request' })
  })

  it.each(['application/json', 'application/json; charset=utf-8', 'APPLICATION/JSON;CHARSET=UTF-8'])('accepts JSON content type %s', async (contentType) => {
    await expect(parseReactionRequest(request('{"reaction":"fire"}', { 'Content-Type': contentType }))).resolves.toMatchObject({ ok: true })
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['malformed', 'youtube:bad'],
    ['comma-joined duplicate', `${LIVE}, ${LIVE}`],
    ['whitespace variant', 'youtube: ABCDEFGHIJK'],
  ])('rejects a %s canonical context header', async (_label, context) => {
    const headers = context === undefined ? { 'X-Live-Context': undefined } : { 'X-Live-Context': context }
    await expect(parseReactionRequest(request('{"reaction":"fire"}', headers as HeadersInit))).resolves.toEqual({ ok: false, reason: 'invalid_request' })
  })
})
