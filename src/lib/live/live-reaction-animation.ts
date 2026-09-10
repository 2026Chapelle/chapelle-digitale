import type {
  ReactionClockSample,
  ReactionEvent,
} from './live-reactions-client'

export type VisibleReaction = {
  event: ReactionEvent
  rail: 0 | 1
  startedAt: number
  endsAt: number
}

export type ReactionAnimationScheduler = {
  sampleClock: (
    sample: ReactionClockSample,
  ) => void
  enqueue: (
    event: ReactionEvent,
  ) => void
  tick: () => VisibleReaction[]
  setMode: (
    mode: {
      visible: boolean
      enabled: boolean
      reducedMotion: boolean
    },
  ) => void
  clear: () => void
  inspect: () => {
    queued: number
    active: number
    load: number
    regime: 'low' | 'medium' | 'high'
  }
}

const QUEUE_LIMIT = 12
const ACTIVE_LIMIT = 4
const START_INTERVAL_MS = 400
const ACTIVE_LIFETIME_MS = 1_600
const START_TTL_MS = 4_000
const FUTURE_TOLERANCE_MS = 2_000
const MAX_CLOCK_RTT_MS = 2_000

function railFor(
  eventId: string,
): 0 | 1 {
  let hash = 0

  for (
    let index = 0;
    index < eventId.length;
    index += 1
  ) {
    hash = (
      (hash * 31) +
      eventId.charCodeAt(index)
    ) >>> 0
  }

  return (hash % 2) as 0 | 1
}

export function createReactionAnimationScheduler(
  now: () => number,
): ReactionAnimationScheduler {
  let queue: ReactionEvent[] = []
  let active: VisibleReaction[] = []

  let lastStartAt =
    Number.NEGATIVE_INFINITY

  let clock:
    | {
        serverAtReceived: number
        receivedMono: number
      }
    | null = null

  let mode = {
    visible: true,
    enabled: true,
    reducedMotion: false,
  }

  function clear(): void {
    queue = []
    active = []

    lastStartAt =
      Number.NEGATIVE_INFINITY
  }

  function canAnimate(): boolean {
    return (
      mode.visible &&
      mode.enabled &&
      !mode.reducedMotion &&
      clock !== null
    )
  }

  function sampleClock(
    sample: ReactionClockSample,
  ): void {
    const parsed =
      Date.parse(sample.serverTime)

    const rtt =
      sample.receivedWall -
      sample.sentWall

    if (
      !Number.isFinite(parsed) ||
      !Number.isFinite(rtt) ||
      rtt < 0 ||
      rtt > MAX_CLOCK_RTT_MS ||
      !Number.isFinite(sample.receivedMono)
    ) {
      clock = null
      clear()
      return
    }

    clock = {
      serverAtReceived:
        parsed + (rtt / 2),
      receivedMono:
        sample.receivedMono,
    }
  }

  function estimatedServerNow(): number | null {
    if (!clock) return null

    return (
      clock.serverAtReceived +
      (now() - clock.receivedMono)
    )
  }

  function enqueue(
    event: ReactionEvent,
  ): void {
    if (!canAnimate()) return

    const acceptedAt =
      Date.parse(event.acceptedAt)

    const currentServer =
      estimatedServerNow()

    if (
      !Number.isFinite(acceptedAt) ||
      currentServer === null
    ) {
      return
    }

    const age =
      currentServer - acceptedAt

    if (
      age >= START_TTL_MS ||
      age < -FUTURE_TOLERANCE_MS
    ) {
      return
    }

    queue.push(event)

    while (
      queue.length > QUEUE_LIMIT
    ) {
      queue.shift()
    }
  }

  function tick(): VisibleReaction[] {
    const current = now()

    active = active.filter(
      item =>
        item.endsAt > current,
    )

    if (!canAnimate()) {
      return []
    }

    if (
      queue.length > 0 &&
      active.length < ACTIVE_LIMIT &&
      current - lastStartAt >=
        START_INTERVAL_MS
    ) {
      const event =
        queue.shift()

      if (event) {
        active.push({
          event,
          rail:
            railFor(event.eventId),
          startedAt:
            current,
          endsAt:
            current +
            ACTIVE_LIFETIME_MS,
        })

        lastStartAt =
          current
      }
    }

    return active.map(
      item => ({
        ...item,
        event: {
          ...item.event,
        },
      }),
    )
  }

  function setMode(
    next: {
      visible: boolean
      enabled: boolean
      reducedMotion: boolean
    },
  ): void {
    mode = {
      ...next,
    }

    if (
      !mode.visible ||
      !mode.enabled ||
      mode.reducedMotion
    ) {
      clear()
    }
  }

  function inspect() {
    return {
      queued:
        queue.length,
      active:
        active.length,
      load:
        queue.length +
        active.length,
      regime:
        'low' as const,
    }
  }

  return {
    sampleClock,
    enqueue,
    tick,
    setMode,
    clear,
    inspect,
  }
}