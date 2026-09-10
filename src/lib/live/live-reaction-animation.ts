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

type LoadBucket = {
  epoch: number
  count: number
}

const QUEUE_LIMIT = 12
const ACTIVE_LIMIT = 4

const LOW_INTERVAL_MS = 400
const MEDIUM_INTERVAL_MS = 800
const HIGH_INTERVAL_MS = 1_200

const ACTIVE_LIFETIME_MS = 1_600

const START_TTL_MS = 4_000
const FUTURE_TOLERANCE_MS = 2_000

const MAX_CLOCK_RTT_MS = 2_000
const CLOCK_TTL_MS = 60_000

const LOAD_BUCKET_COUNT = 10
const LOAD_SATURATION = 41

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
      (31 * hash) +
      eventId.charCodeAt(index)
    ) >>> 0
  }

  return (hash % 2) as 0 | 1
}

function bucketIndex(
  epoch: number,
): number {
  return (
    (
      epoch %
      LOAD_BUCKET_COUNT
    ) +
    LOAD_BUCKET_COUNT
  ) % LOAD_BUCKET_COUNT
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

  const buckets: LoadBucket[] =
    Array.from(
      {
        length:
          LOAD_BUCKET_COUNT,
      },
      () => ({
        epoch:
          Number.NEGATIVE_INFINITY,
        count: 0,
      }),
    )

  function clearLoad(): void {
    for (
      let index = 0;
      index < buckets.length;
      index += 1
    ) {
      buckets[index] = {
        epoch:
          Number.NEGATIVE_INFINITY,
        count: 0,
      }
    }
  }

  function clear(): void {
    queue = []
    active = []

    lastStartAt =
      Number.NEGATIVE_INFINITY

    clearLoad()
  }

  function invalidateClock(): void {
    clock = null
    clear()
  }

  function hasFreshClock(): boolean {
    if (!clock) {
      return false
    }

    const age =
      now() -
      clock.receivedMono

    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age >= CLOCK_TTL_MS
    ) {
      invalidateClock()

      return false
    }

    return true
  }

  function canAnimate(): boolean {
    return (
      mode.visible &&
      mode.enabled &&
      !mode.reducedMotion &&
      hasFreshClock()
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
      rtt >= MAX_CLOCK_RTT_MS ||
      !Number.isFinite(
        sample.receivedMono,
      )
    ) {
      invalidateClock()
      return
    }

    clock = {
      serverAtReceived:
        parsed,

      receivedMono:
        sample.receivedMono,
    }
  }

  function estimatedServerNow(): number | null {
    if (!hasFreshClock()) {
      return null
    }

    if (!clock) {
      return null
    }

    return (
      clock.serverAtReceived +
      (
        now() -
        clock.receivedMono
      )
    )
  }

  function currentLoad(): number {
    const currentEpoch =
      Math.floor(
        now() / 1_000,
      )

    let total = 0

    for (
      let index = 0;
      index < buckets.length;
      index += 1
    ) {
      const bucket =
        buckets[index]

      const age =
        currentEpoch -
        bucket.epoch

      if (
        age >= 0 &&
        age < LOAD_BUCKET_COUNT
      ) {
        total +=
          bucket.count

        if (
          total >=
          LOAD_SATURATION
        ) {
          return LOAD_SATURATION
        }
      }
    }

    return total
  }

  function recordArrival(): void {
    const epoch =
      Math.floor(
        now() / 1_000,
      )

    const index =
      bucketIndex(epoch)

    if (
      buckets[index].epoch !==
      epoch
    ) {
      buckets[index] = {
        epoch,
        count: 0,
      }
    }

    buckets[index].count =
      Math.min(
        LOAD_SATURATION,
        buckets[index].count + 1,
      )
  }

  function currentRegime():
    | 'low'
    | 'medium'
    | 'high' {
    const load =
      currentLoad()

    if (load <= 10) {
      return 'low'
    }

    if (load <= 40) {
      return 'medium'
    }

    return 'high'
  }

  function intervalFor(
    regime:
      | 'low'
      | 'medium'
      | 'high',
  ): number {
    if (regime === 'high') {
      return HIGH_INTERVAL_MS
    }

    if (regime === 'medium') {
      return MEDIUM_INTERVAL_MS
    }

    return LOW_INTERVAL_MS
  }

  function eventTiming(
    event: ReactionEvent,
  ):
    | {
        valid: true
        eligible: boolean
      }
    | {
        valid: false
        eligible: false
      } {
    const acceptedAt =
      Date.parse(
        event.acceptedAt,
      )

    const currentServer =
      estimatedServerNow()

    if (
      !Number.isFinite(
        acceptedAt,
      ) ||
      currentServer === null
    ) {
      return {
        valid: false,
        eligible: false,
      }
    }

    const age =
      currentServer -
      acceptedAt

    if (
      age >= START_TTL_MS ||
      age <
        -FUTURE_TOLERANCE_MS
    ) {
      return {
        valid: false,
        eligible: false,
      }
    }

    return {
      valid: true,
      eligible:
        acceptedAt <=
        currentServer,
    }
  }

  function enqueue(
    event: ReactionEvent,
  ): void {
    if (!canAnimate()) {
      return
    }

    const timing =
      eventTiming(event)

    if (!timing.valid) {
      return
    }

    recordArrival()

    queue.push(event)

    while (
      queue.length >
      QUEUE_LIMIT
    ) {
      queue.shift()
    }
  }

  function pruneInvalidQueue(): void {
    const kept: ReactionEvent[] =
      []

    for (
      let index = 0;
      index < queue.length;
      index += 1
    ) {
      const event =
        queue[index]

      if (
        eventTiming(event).valid
      ) {
        kept.push(event)
      }
    }

    queue = kept
  }

  function takeLowOrMedium():
    | ReactionEvent
    | null {
    if (queue.length === 0) {
      return null
    }

    const first =
      queue[0]

    const timing =
      eventTiming(first)

    if (
      !timing.valid
    ) {
      queue.shift()
      return takeLowOrMedium()
    }

    if (
      !timing.eligible
    ) {
      return null
    }

    return (
      queue.shift() ??
      null
    )
  }

  function takeHigh():
    | ReactionEvent
    | null {
    let selectedIndex = -1

    for (
      let index =
        queue.length - 1;
      index >= 0;
      index -= 1
    ) {
      const timing =
        eventTiming(
          queue[index],
        )

      if (
        timing.valid &&
        timing.eligible
      ) {
        selectedIndex =
          index

        break
      }
    }

    if (
      selectedIndex === -1
    ) {
      pruneInvalidQueue()

      return null
    }

    const selected =
      queue[selectedIndex]

    queue = []

    return selected
  }

  function pruneActive(): void {
    const current =
      now()

    active =
      active.filter(
        item =>
          item.endsAt >
          current,
      )
  }

  function tick(): VisibleReaction[] {
    if (!canAnimate()) {
      return []
    }

    const current =
      now()

    pruneActive()
    pruneInvalidQueue()

    if (
      active.length >=
      ACTIVE_LIMIT ||
      queue.length === 0
    ) {
      return active.map(
        item => ({
          ...item,
          event: {
            ...item.event,
          },
        }),
      )
    }

    const regime =
      currentRegime()

    const interval =
      intervalFor(regime)

    if (
      current -
      lastStartAt <
      interval
    ) {
      return active.map(
        item => ({
          ...item,
          event: {
            ...item.event,
          },
        }),
      )
    }

    const event =
      regime === 'high'
        ? takeHigh()
        : takeLowOrMedium()

    if (event) {
      active.push({
        event,
        rail:
          railFor(
            event.eventId,
          ),
        startedAt:
          current,
        endsAt:
          current +
          ACTIVE_LIFETIME_MS,
      })

      lastStartAt =
        current
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
    pruneActive()

    if (
      clock &&
      !hasFreshClock()
    ) {
      return {
        queued: 0,
        active: 0,
        load: 0,
        regime:
          'low' as const,
      }
    }

    const load =
      currentLoad()

    const regime:
      | 'low'
      | 'medium'
      | 'high' =
      load <= 10
        ? 'low'
        : load <= 40
          ? 'medium'
          : 'high'

    return {
      queued:
        queue.length,
      active:
        active.length,
      load,
      regime,
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