import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  createReactionAnimationScheduler,
} from './live-reaction-animation'

import type {
  ReactionEvent,
} from './live-reactions-client'

const SERVER_TIME =
  '2026-09-10T12:00:00.000Z'

const SERVER_EPOCH =
  Date.parse(SERVER_TIME)

function uuid(
  value: number,
): string {
  return (
    '11111111-1111-4111-8111-' +
    String(value).padStart(12, '0')
  )
}

function event(
  value: number,
  acceptedOffsetMs = 0,
): ReactionEvent {
  return {
    eventId: uuid(value),
    liveKey: 'youtube:ABCDEFGHIJK',
    reaction: 'fire',
    acceptedAt:
      new Date(
        SERVER_EPOCH +
        acceptedOffsetMs,
      ).toISOString(),
  }
}

function ready(
  now: () => number,
) {
  const scheduler =
    createReactionAnimationScheduler(
      now,
    )

  scheduler.sampleClock({
    serverTime: SERVER_TIME,
    sentWall: 0,
    receivedWall: 100,
    receivedMono: now(),
  })

  scheduler.setMode({
    visible: true,
    enabled: true,
    reducedMotion: false,
  })

  return scheduler
}

describe('deterministic adaptive confirmed reaction animation flow', () => {
  it('classifies 10 arrivals as low and starts every 400ms', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 10;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 10,
      load: 10,
      regime: 'low',
    })

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 399

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 400

    expect(
      scheduler.tick(),
    ).toHaveLength(2)
  })

  it('classifies 11 arrivals as medium and starts every 800ms', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 11;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 11,
      load: 11,
      regime: 'medium',
    })

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 799

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 800

    expect(
      scheduler.tick(),
    ).toHaveLength(2)
  })

  it('keeps 40 arrivals medium', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 40;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 12,
      load: 40,
      regime: 'medium',
    })
  })

  it('classifies 41 arrivals as high and starts no faster than 1200ms', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 41;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 12,
      load: 41,
      regime: 'high',
    })

    const first =
      scheduler.tick()

    expect(first).toHaveLength(1)

    scheduler.enqueue(
      event(100),
    )

    time = 1_199

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 1_200

    expect(
      scheduler.tick(),
    ).toHaveLength(2)
  })

  it('saturates measured load at 41', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 500;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      load: 41,
      regime: 'high',
    })
  })

  it('uses ten one-second buckets and expires the oldest epoch exactly', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 10;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.inspect().load,
    ).toBe(10)

    time = 9_999

    expect(
      scheduler.inspect().load,
    ).toBe(10)

    time = 10_000

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      load: 0,
      regime: 'low',
    })
  })

  it('keeps queue memory bounded under ten thousand real arrivals', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 10_000;
      index += 1
    ) {
      scheduler.enqueue(
        event(index),
      )
    }

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 12,
      load: 41,
      regime: 'high',
    })
  })

  it('high load chooses the newest real eligible event and clears the burst backlog', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 41;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    const visible =
      scheduler.tick()

    expect(
      visible,
    ).toHaveLength(1)

    expect(
      visible[0].event.eventId,
    ).toBe(
      uuid(40),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(0)

    expect(
      visible[0].event,
    ).toEqual(
      event(40),
    )
  })

  it('never creates synthetic aggregate events or xN particles', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 41;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    const visible =
      scheduler.tick()

    expect(
      visible[0].event.eventId,
    ).toBe(uuid(40))

    expect(
      Object.keys(
        visible[0].event,
      ).sort(),
    ).toEqual(
      [
        'acceptedAt',
        'eventId',
        'liveKey',
        'reaction',
      ].sort(),
    )

    expect(
      JSON.stringify(visible),
    ).not.toMatch(
      /x\d+|synthetic|aggregate/i,
    )
  })

  it('never exceeds four active animations', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 10;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    scheduler.tick()

    time = 400
    scheduler.tick()

    time = 800
    scheduler.tick()

    time = 1_200

    expect(
      scheduler.tick(),
    ).toHaveLength(4)

    expect(
      scheduler.inspect().active,
    ).toBeLessThanOrEqual(4)
  })

  it('keeps active lifetime exactly 1600ms', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(1))

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 1_599

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 1_600

    expect(
      scheduler.tick(),
    ).toHaveLength(0)
  })

  it('accepts age 3999ms but rejects age 4000ms before animation start', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(
      event(
        1,
        -3_999,
      ),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(1)

    scheduler.clear()

    scheduler.sampleClock({
      serverTime: SERVER_TIME,
      sentWall: 0,
      receivedWall: 0,
      receivedMono: time,
    })

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: false,
    })

    scheduler.enqueue(
      event(
        2,
        -4_000,
      ),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(0)
  })

  it('rejects events more than two seconds in the future and defers mildly future events', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(
      event(
        1,
        2_001,
      ),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(0)

    scheduler.enqueue(
      event(
        2,
        1_500,
      ),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(1)

    expect(
      scheduler.tick(),
    ).toHaveLength(0)

    time = 1_500

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    expect(
      scheduler.tick()[0].event.eventId,
    ).toBe(uuid(2))
  })

  it('rejects missing or slow-RTT clock samples', () => {
    let time = 0

    const scheduler =
      createReactionAnimationScheduler(
        () => time,
      )

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: false,
    })

    scheduler.enqueue(event(1))

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 0,
      active: 0,
      load: 0,
    })

    scheduler.sampleClock({
      serverTime: SERVER_TIME,
      sentWall: 0,
      receivedWall: 2_000,
      receivedMono: 0,
    })

    scheduler.enqueue(event(2))

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 0,
      active: 0,
      load: 0,
    })
  })

  it('expires the server clock at exactly 60000ms and clears visible work', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(1))
    scheduler.tick()

    time = 59_999

    expect(
      scheduler.inspect().active,
    ).toBe(0)

    scheduler.enqueue(
      event(
        2,
        59_000,
      ),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(1)

    time = 60_000

    expect(
      scheduler.inspect(),
    ).toEqual({
      queued: 0,
      active: 0,
      load: 0,
      regime: 'low',
    })

    scheduler.enqueue(
      event(
        3,
        60_000,
      ),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(0)
  })

  it('clears hidden work and never catches up when visibility returns', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 8;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    scheduler.tick()

    scheduler.setMode({
      visible: false,
      enabled: true,
      reducedMotion: false,
    })

    expect(
      scheduler.inspect(),
    ).toEqual({
      queued: 0,
      active: 0,
      load: 0,
      regime: 'low',
    })

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: false,
    })

    time = 5_000

    expect(
      scheduler.tick(),
    ).toHaveLength(0)
  })

  it('clears replay/disabled work and never catches up after returning live', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(1))
    scheduler.tick()

    scheduler.setMode({
      visible: true,
      enabled: false,
      reducedMotion: false,
    })

    scheduler.enqueue(event(2))

    expect(
      scheduler.inspect().queued,
    ).toBe(0)

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: false,
    })

    expect(
      scheduler.tick(),
    ).toHaveLength(0)
  })

  it('reacts dynamically to reduced motion and keeps no animation backlog', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(1))

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: true,
    })

    expect(
      scheduler.inspect(),
    ).toEqual({
      queued: 0,
      active: 0,
      load: 0,
      regime: 'low',
    })

    scheduler.enqueue(event(2))

    expect(
      scheduler.inspect().queued,
    ).toBe(0)

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: false,
    })

    expect(
      scheduler.tick(),
    ).toHaveLength(0)
  })

  it('uses a stable deterministic two-rail hash', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(99))

    const first =
      scheduler.tick()[0]

    expect(
      [0, 1],
    ).toContain(first.rail)

    scheduler.clear()

    scheduler.sampleClock({
      serverTime: SERVER_TIME,
      sentWall: 0,
      receivedWall: 100,
      receivedMono: time,
    })

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: false,
    })

    scheduler.enqueue(event(99))

    const second =
      scheduler.tick()[0]

    expect(
      second.rail,
    ).toBe(first.rail)
  })
})