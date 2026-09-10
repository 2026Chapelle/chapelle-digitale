'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  REACTION_LABELS,
  REACTION_SYMBOLS,
  REACTION_TYPES,
  type ReactionType,
} from '@/lib/live/live-reactions'

import {
  useLiveReactions,
} from './LiveReactionsProvider'

function monotonicNow(): number {
  return typeof performance !== 'undefined'
    ? performance.now()
    : 0
}

export default function LiveReactionControls() {
  const {
    state,
    send,
  } = useLiveReactions()

  const [
    now,
    setNow,
  ] = useState(
    monotonicNow,
  )

  useEffect(() => {
    if (
      state.send !==
        'rate_limited' ||
      state.retryUntil === null
    ) {
      return
    }

    const timer =
      window.setInterval(
        () => {
          setNow(
            monotonicNow(),
          )
        },
        250,
      )

    return () => {
      window.clearInterval(
        timer,
      )
    }
  }, [
    state.send,
    state.retryUntil,
  ])

  const rateLimited =
    state.send ===
      'rate_limited' &&
    state.retryUntil !== null &&
    now < state.retryUntil

  const retrySeconds =
    rateLimited &&
    state.retryUntil !== null
      ? Math.max(
          1,
          Math.ceil(
            (
              state.retryUntil -
              now
            ) / 1_000,
          ),
        )
      : null

  const disabled =
    state.context !== 'open' ||
    state.send === 'pending' ||
    rateLimited

  const react =
    async (
      reaction: ReactionType,
    ) => {
      if (disabled) return

      await send(reaction)

      setNow(
        monotonicNow(),
      )
    }

  let feedback:
    | string
    | null = null

  if (
    state.context ===
    'unavailable'
  ) {
    feedback =
      'Réactions momentanément indisponibles'
  } else if (
    state.send ===
    'uncertain'
  ) {
    feedback =
      'Réaction non confirmée'
  } else if (
    rateLimited &&
    retrySeconds !== null
  ) {
    feedback =
      `Un instant, tu pourras réagir à nouveau dans ${retrySeconds} s`
  } else if (
    state.send ===
    'pending'
  ) {
    feedback =
      'Confirmation en cours…'
  }

  return (
    <section
      data-live-reaction-controls="true"
      className="rounded-2xl border border-gold/15 bg-gold/[0.025] p-4"
    >
      <div className="mb-3">
        <p className="font-cinzel text-sm font-bold text-pearl">
          Réagir ensemble
        </p>

        <p className="mt-1 font-inter text-[11px] leading-relaxed text-pearl/40">
          Une fois par compte ou identité visiteur, pour chaque réaction
        </p>
      </div>

      {state.uniqueByType ===
      null ? (
        <p className="font-inter text-[11px] text-pearl/35">
          {state.context ===
          'unavailable'
            ? 'Réactions momentanément indisponibles'
            : state.context ===
                'not_live' ||
              state.context ===
                'closed'
              ? 'Les réactions sont disponibles pendant le direct.'
              : 'Chargement des réactions confirmées…'}
        </p>
      ) : (
        <>
          {state.stale && (
            <p className="mb-2 font-inter text-[10px] text-amber-200/70">
              Données confirmées précédemment
            </p>
          )}

          <div
            data-live-reaction-counts="true"
            className="grid grid-cols-5 gap-1.5 sm:gap-2"
          >
            {REACTION_TYPES.map(
              type => {
                const counts = state.uniqueByType

                if (!counts) {
                  return null
                }

                return (
                <button
                  key={type}
                  type="button"
                  aria-label={`Réagir : ${REACTION_LABELS[type]}`}
                  title={REACTION_LABELS[type]}
                  disabled={disabled}
                  onClick={() => {
                    void react(type)
                  }}
                  className="min-h-[44px] rounded-xl border border-pearl/[0.08] bg-pearl/[0.03] px-1 py-2 text-center transition-all hover:border-gold/30 hover:bg-gold/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span
                    aria-hidden="true"
                    className="block text-lg leading-none"
                  >
                    {REACTION_SYMBOLS[type]}
                  </span>

                  <span className="mt-1 block font-inter text-[10px] font-semibold text-pearl/55">
                    {counts[type]}
                  </span>
                </button>
                )
              },
            )}
          </div>
        </>
      )}

      {feedback && (
        <p
          aria-live="polite"
          className="mt-3 font-inter text-[11px] text-gold/70"
        >
          {feedback}
        </p>
      )}
    </section>
  )
}