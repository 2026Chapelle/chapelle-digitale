'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  REACTION_LABELS,
  REACTION_SYMBOLS,
  REACTION_TYPES,
} from '@/lib/live/live-reactions'

import {
  requestReplayReactionSnapshot,
} from '@/lib/live/live-reaction-replay-client'

import type {
  ReplayReactionSnapshot,
} from '@/lib/live/live-reaction-replay'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Props = {
  cmsLiveId: string
}

export default function LiveReplayReactionCounts({
  cmsLiveId,
}: Props) {
  const rootRef =
    useRef<HTMLElement | null>(
      null,
    )

  const generationRef =
    useRef(0)

  const [
    inView,
    setInView,
  ] = useState(false)

  const [
    attempt,
    setAttempt,
  ] = useState(0)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    result,
    setResult,
  ] =
    useState<
      ReplayReactionSnapshot | null
    >(null)

  const validCmsId =
    UUID_RE.test(
      cmsLiveId,
    )

  useEffect(() => {
    setResult(null)
    setLoading(false)
    setInView(false)

    if (!validCmsId) {
      return
    }

    const element =
      rootRef.current

    if (!element) {
      return
    }

    if (
      typeof IntersectionObserver ===
      'undefined'
    ) {
      setInView(true)
      return
    }

    const observer =
      new IntersectionObserver(
        entries => {
          if (
            entries[0]?.isIntersecting
          ) {
            setInView(true)
            observer.disconnect()
          }
        },
        {
          threshold: 0.05,
        },
      )

    observer.observe(
      element,
    )

    return () => {
      observer.disconnect()
    }
  }, [
    cmsLiveId,
    validCmsId,
  ])

  useEffect(() => {
    if (
      !validCmsId ||
      !inView
    ) {
      return
    }

    generationRef.current += 1

    const generation =
      generationRef.current

    const controller =
      new AbortController()

    setLoading(true)

    void requestReplayReactionSnapshot(
      cmsLiveId,
      fetch,
      controller.signal,
    ).then(
      value => {
        if (
          controller.signal.aborted ||
          generation !==
            generationRef.current
        ) {
          return
        }

        setResult(
          value,
        )

        setLoading(false)
      },
    )

    return () => {
      generationRef.current += 1
      controller.abort()
    }
  }, [
    attempt,
    cmsLiveId,
    inView,
    validCmsId,
  ])

  if (!validCmsId) {
    return null
  }

  let message:
    | string
    | null = null

  let retry = false

  if (
    result &&
    !result.ok
  ) {
    if (
      result.reason ===
      'not_recorded'
    ) {
      message =
        'Réactions non enregistrées pour ce culte'
    } else if (
      result.reason ===
      'not_final'
    ) {
      message =
        'Statistiques non finalisées'
    } else {
      message =
        'Statistiques de réactions momentanément indisponibles'

      retry = true
    }
  }

  return (
    <section
      ref={rootRef}
      data-live-replay-reactions="true"
      data-cms-live-id={cmsLiveId}
      className="rounded-xl border border-pearl/[0.07] bg-black/10 px-3 py-3"
    >
      <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.12em] text-pearl/35">
        Réactions du culte
      </p>

      {!inView ? (
        <p className="mt-2 font-inter text-[11px] text-pearl/30">
          Les réactions confirmées apparaîtront ici.
        </p>
      ) : loading ? (
        <p className="mt-2 font-inter text-[11px] text-pearl/35">
          Chargement des réactions confirmées…
        </p>
      ) : result?.ok ? (
        <div
          data-live-replay-reaction-counts="true"
          className="mt-2 grid grid-cols-5 gap-1.5"
        >
          {REACTION_TYPES.map(
            type => (
              <div
                key={type}
                title={
                  REACTION_LABELS[type]
                }
                className="rounded-lg border border-pearl/[0.06] bg-pearl/[0.025] px-1 py-2 text-center"
              >
                <span
                  aria-hidden="true"
                  className="block text-base leading-none"
                >
                  {REACTION_SYMBOLS[type]}
                </span>

                <span className="mt-1 block font-inter text-[10px] font-semibold text-pearl/55">
                  {result.uniqueByType[type]}
                </span>

                <span className="sr-only">
                  {REACTION_LABELS[type]}
                </span>
              </div>
            ),
          )}
        </div>
      ) : message ? (
        <div className="mt-2">
          <p className="font-inter text-[11px] leading-relaxed text-pearl/40">
            {message}
          </p>

          {retry && (
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setAttempt(
                  value =>
                    value + 1,
                )
              }}
              className="mt-2 rounded-lg border border-gold/20 bg-gold/[0.04] px-2.5 py-1.5 font-inter text-[10px] font-semibold text-gold/80 hover:bg-gold/[0.08]"
            >
              Réessayer
            </button>
          )}
        </div>
      ) : null}
    </section>
  )
}