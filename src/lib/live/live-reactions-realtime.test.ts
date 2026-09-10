import { describe, expect, it, vi } from 'vitest'

import {
  createReactionDedupe,
  subscribeLiveReactionEvents,
} from './live-reactions-realtime'

const LIVE = 'youtube:ABCDEFGHIJK'
const EVENT = {
  eventId: '11111111-1111-4111-8111-111111111111',
  liveKey: LIVE,
  reaction: 'fire' as const,
  acceptedAt: '2026-09-10T10:00:00.000Z',
}

function channelFixture() {
  let change: ((payload: unknown) => void) | undefined
  let status: ((status: string) => void) | undefined
  const channel = {
    on: vi.fn((_kind: string, _filter: unknown, callback: (payload: unknown) => void) => { change = callback; return channel }),
    subscribe: vi.fn((callback: (next: string) => void) => { status = callback; return channel }),
  }
  return {
    channel,
    client: { channel: vi.fn(() => channel), removeChannel: vi.fn(async () => 'ok') },
    change: (payload: unknown) => change?.(payload),
    status: (next: string) => status?.(next),
  }
}

function payload(newRow: Record<string, unknown> = {
  event_id: EVENT.eventId, live_key: EVENT.liveKey, reaction: EVENT.reaction, accepted_at: EVENT.acceptedAt,
}) {
  return { eventType: 'INSERT', schema: 'public', table: 'live_reaction_events', new: newRow }
}

describe('LIVE reaction INSERT-only subscription', () => {
  it('creates one channel and registers the exact public INSERT projection filter', () => {
    const fixture = channelFixture(); const statuses: string[] = []
    subscribeLiveReactionEvents(fixture.client as never, LIVE, () => undefined, status => statuses.push(status))
    expect(statuses).toEqual(['connecting'])
    expect(fixture.client.channel).toHaveBeenCalledTimes(1)
    expect(fixture.channel.on).toHaveBeenCalledWith('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'live_reaction_events', filter: `live_key=eq.${LIVE}`,
    }, expect.any(Function))
  })

  it.each([
    ['SUBSCRIBED', 'subscribed'], ['CHANNEL_ERROR', 'degraded'], ['TIMED_OUT', 'degraded'], ['CLOSED', 'degraded'],
  ])('maps channel status %s to %s', (input, expected) => {
    const fixture = channelFixture(); const statuses: string[] = []
    subscribeLiveReactionEvents(fixture.client as never, LIVE, () => undefined, status => statuses.push(status))
    fixture.status(input)
    expect(statuses.at(-1)).toBe(expected)
  })

  it('accepts only the exact four-field committed event projection', () => {
    const fixture = channelFixture(); const events: unknown[] = []
    subscribeLiveReactionEvents(fixture.client as never, LIVE, event => events.push(event), () => undefined)
    fixture.change(payload())
    expect(events).toEqual([EVENT])
  })

  it.each([
    ['UPDATE', { ...payload(), eventType: 'UPDATE' }],
    ['DELETE', { ...payload(), eventType: 'DELETE' }],
    ['broadcast', { event: 'broadcast', payload: payload() }],
    ['wrong schema', { ...payload(), schema: 'private' }],
    ['wrong table', { ...payload(), table: 'live_reaction_runs' }],
    ['wrong run', payload({ event_id: EVENT.eventId, live_key: 'youtube:LMNOPQRSTUV', reaction: 'fire', accepted_at: EVENT.acceptedAt })],
    ['bad live key', payload({ event_id: EVENT.eventId, live_key: 'bad', reaction: 'fire', accepted_at: EVENT.acceptedAt })],
    ['unknown reaction', payload({ event_id: EVENT.eventId, live_key: LIVE, reaction: 'sparkle', accepted_at: EVENT.acceptedAt })],
    ['bad uuid', payload({ event_id: 'bad', live_key: LIVE, reaction: 'fire', accepted_at: EVENT.acceptedAt })],
    ['bad date', payload({ event_id: EVENT.eventId, live_key: LIVE, reaction: 'fire', accepted_at: 'never' })],
    ['missing field', payload({ event_id: EVENT.eventId, live_key: LIVE, reaction: 'fire' })],
    ['private extra field', payload({ event_id: EVENT.eventId, live_key: LIVE, reaction: 'fire', accepted_at: EVENT.acceptedAt, actor_key: 'guest:hash' })],
  ])('rejects %s', (_label, rejected) => {
    const fixture = channelFixture(); const events: unknown[] = []
    subscribeLiveReactionEvents(fixture.client as never, LIVE, event => events.push(event), () => undefined)
    fixture.change(rejected)
    expect(events).toEqual([])
  })

  it('removes its channel once, is idempotent, and ignores stale events after cleanup', () => {
    const fixture = channelFixture(); const events: unknown[] = []
    const cleanup = subscribeLiveReactionEvents(fixture.client as never, LIVE, event => events.push(event), () => undefined)
    cleanup(); cleanup(); fixture.change(payload())
    expect(fixture.client.removeChannel).toHaveBeenCalledTimes(1)
    expect(fixture.client.removeChannel).toHaveBeenCalledWith(fixture.channel)
    expect(events).toEqual([])
  })
})

describe('reaction event dedupe', () => {
  it('accepts a first event, rejects a duplicate in either arrival order, and clear resets memory', () => {
    const dedupe = createReactionDedupe(() => 0)
    expect(dedupe.accept(EVENT)).toBe(true)
    expect(dedupe.accept(EVENT)).toBe(false)
    dedupe.clear()
    expect(dedupe.accept(EVENT)).toBe(true)
  })

  it('bounds remembered identities to 512 and prunes entries at sixty seconds', () => {
    let time = 0; const dedupe = createReactionDedupe(() => time)
    for (let index = 0; index < 513; index += 1) {
      expect(dedupe.accept({ ...EVENT, eventId: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}` })).toBe(true)
    }
    expect(dedupe.accept({ ...EVENT, eventId: '11111111-1111-4111-8111-000000000000' })).toBe(true)
    time = 60_000
    expect(dedupe.accept(EVENT)).toBe(true)
  })
})
