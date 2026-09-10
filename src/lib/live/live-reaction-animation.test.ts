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
  '2026-09-10T10:00:00.000Z'

function event(
  suffix: number,
  acceptedAt = SERVER_TIME,
): ReactionEvent {
  return {
    eventId:
      `11111111-1111-4111-8111-${String(suffix).padStart(12, '0')}`,
    liveKey: 'youtube:ABCDEFGHIJK',
    reaction: 'fire',
    acceptedAt,
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
    receivedMono: 0,
  })

  scheduler.setMode({
    visible: true,
    enabled: true,
    reducedMotion: false,
  })

  return scheduler
}

describe('confirmed reaction animation scheduler', () => {
  it('requires a reliable server clock', () => {
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
    })

    scheduler.sampleClock({
      serverTime: SERVER_TIME,
      sentWall: 0,
      receivedWall: 5_000,
      receivedMono: 0,
    })

    scheduler.enqueue(event(2))

    expect(
      scheduler.inspect().queued,
    ).toBe(0)
  })

  it('starts low-flow FIFO every 400ms with at most four active items', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 8;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.tick(),
    ).toHaveLength(1)

    time = 400
    expect(
      scheduler.tick(),
    ).toHaveLength(2)

    time = 800
    expect(
      scheduler.tick(),
    ).toHaveLength(3)

    time = 1_200
    expect(
      scheduler.tick(),
    ).toHaveLength(4)

    expect(
      scheduler.inspect().active,
    ).toBeLessThanOrEqual(4)
  })

  it('keeps at most twelve queued events and drops oldest first', () => {
    let time = 0
    const scheduler = ready(() => time)

    for (
      let index = 0;
      index < 13;
      index += 1
    ) {
      scheduler.enqueue(event(index))
    }

    expect(
      scheduler.inspect().queued,
    ).toBe(12)

    const active =
      scheduler.tick()

    expect(
      active[0].event.eventId,
    ).toContain(
      '000000000001',
    )
  })

  it('expires active animations after 1600ms', () => {
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

  it('rejects events older than four seconds or too far in the future', () => {
    let time = 0
    const scheduler = ready(() => time)

    const base =
      Date.parse(SERVER_TIME)

    scheduler.enqueue(
      event(
        1,
        new Date(
          base - 4_100,
        ).toISOString(),
      ),
    )

    scheduler.enqueue(
      event(
        2,
        new Date(
          base + 2_100,
        ).toISOString(),
      ),
    )

    expect(
      scheduler.inspect().queued,
    ).toBe(0)
  })

  it('uses deterministic two-rail assignment', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(99))

    const first =
      scheduler.tick()[0]

    expect(
      [0, 1],
    ).toContain(
      first.rail,
    )

    scheduler.clear()

    scheduler.enqueue(event(99))

    const second =
      scheduler.tick()[0]

    expect(
      second.rail,
    ).toBe(
      first.rail,
    )
  })

  it('clears animation work when hidden, disabled or reduced motion', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(1))
    scheduler.enqueue(event(2))
    scheduler.tick()

    scheduler.setMode({
      visible: false,
      enabled: true,
      reducedMotion: false,
    })

    expect(
      scheduler.inspect(),
    ).toMatchObject({
      queued: 0,
      active: 0,
    })

    scheduler.setMode({
      visible: true,
      enabled: true,
      reducedMotion: true,
    })

    scheduler.enqueue(event(3))

    expect(
      scheduler.inspect().queued,
    ).toBe(0)
  })

  it('clear removes queued and active animation state', () => {
    let time = 0
    const scheduler = ready(() => time)

    scheduler.enqueue(event(1))
    scheduler.enqueue(event(2))
    scheduler.tick()

    scheduler.clear()

    expect(
      scheduler.inspect(),
    ).toEqual({
      queued: 0,
      active: 0,
      load: 0,
      regime: 'low',
    })
  })
})