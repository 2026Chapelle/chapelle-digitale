'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  LIVE_REPLAY_REACTIONS,
  applyOptimisticReaction,
  emptyLiveReplayReactionCounts,
  type LiveReplayReaction,
  type LiveReplayReactionSnapshot,
} from '@/lib/live/live-replay-reactions'
import {
  LIVE_REPLAY_REACTION_POLL_MS,
  createReplayReactionIntentQueue,
  fetchReplayReactionSnapshot,
  sendReplayReactionIntent,
  type ReplayReactionIntentQueue,
} from '@/lib/live/live-replay-reactions-client'

type Props = {
  cmsLiveId: string
}

const INITIAL: LiveReplayReactionSnapshot = {
  enabled: true,
  selectedReaction: null,
  counts: emptyLiveReplayReactionCounts(),
}

export default function LiveReplayReactions({
  cmsLiveId,
}: Props) {
  const [snapshot, setSnapshot] = useState<LiveReplayReactionSnapshot>(INITIAL)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const confirmedRef = useRef<LiveReplayReactionSnapshot>(INITIAL)
  const queueRef = useRef<ReplayReactionIntentQueue<LiveReplayReactionSnapshot> | null>(null)

  useEffect(() => {
    let disposed = false

    const confirm = (next: LiveReplayReactionSnapshot) => {
      if (disposed) return
      confirmedRef.current = next
      setSnapshot(next)
      setLoaded(true)
      setFailed(false)
    }

    const rollback = () => {
      if (disposed) return
      setSnapshot(confirmedRef.current)
      setFailed(true)
    }

    const queue = createReplayReactionIntentQueue(
      (reaction) => sendReplayReactionIntent(cmsLiveId, reaction),
      confirm,
      rollback,
    )

    queueRef.current = queue

    const refresh = async () => {
      if (disposed) return
      if (document.visibilityState !== 'visible') return
      if (queueRef.current?.isBusy()) return

      try {
        const next = await fetchReplayReactionSnapshot(cmsLiveId)

        if (disposed || queueRef.current?.isBusy()) return

        confirmedRef.current = next
        setSnapshot(next)
        setLoaded(true)
        setFailed(false)
      } catch {
        if (!disposed) {
          setFailed(true)
        }
      }
    }

    void refresh()

    const timer = window.setInterval(
      () => {
        void refresh()
      },
      LIVE_REPLAY_REACTION_POLL_MS,
    )

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      disposed = true
      queueRef.current?.dispose()
      queueRef.current = null
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [cmsLiveId])

  if (loaded && snapshot.enabled === false) {
    return null
  }

  const react = (reaction: LiveReplayReaction) => {
    const nextReaction = snapshot.selectedReaction === reaction ? null : reaction
    const optimistic = applyOptimisticReaction(
      snapshot.counts,
      snapshot.selectedReaction,
      nextReaction,
    )

    setSnapshot(current => ({
      ...current,
      ...optimistic,
    }))
    setFailed(false)
    queueRef.current?.push(nextReaction)
  }

  return (
    <section
      data-live-replay-reactions="true"
      className="rounded-2xl border border-gold/15 bg-gold/[0.025] p-4"
    >
      <p className="font-cinzel text-sm font-bold text-pearl">
        Ce message t’a touché ? Réagis avec la communauté.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {LIVE_REPLAY_REACTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={snapshot.selectedReaction === key}
            onClick={() => react(key)}
            className="min-h-[64px] rounded-xl border border-pearl/[0.08] bg-pearl/[0.03] px-3 py-2 text-center transition-all hover:border-gold/30 hover:bg-gold/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 aria-pressed:border-gold/45 aria-pressed:bg-gold/[0.10]"
          >
            <span className="block font-inter text-xs font-semibold text-pearl/80">
              {label}
            </span>
            <span className="mt-1 block font-inter text-sm font-bold text-gold">
              {snapshot.counts[key]}
            </span>
          </button>
        ))}
      </div>

      {!loaded && !failed && (
        <p className="mt-3 font-inter text-[11px] text-pearl/40">
          Chargement des réactions…
        </p>
      )}

      {failed && (
        <p
          aria-live="polite"
          className="mt-3 font-inter text-[11px] text-amber-200/80"
        >
          Ta réaction n’a pas pu être enregistrée. Réessaie.
        </p>
      )}
    </section>
  )
}
