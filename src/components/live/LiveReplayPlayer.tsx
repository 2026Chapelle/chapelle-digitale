'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  LIVE_REPLAY_SAMPLE_INTERVAL_MS,
  computeReplayPercent,
  type LiveReplayProgress,
  type LiveReplayProgressWrite,
} from '@/lib/live/live-replay-progress'

import {
  chooseNewestReplayProgress,
  createReplaySessionKey,
  getServerReplayProgress,
  readLocalReplayProgress,
  saveLocalReplayProgress,
  saveServerReplayProgress,
  writeLocalReplayProgress,
} from '@/lib/live/live-replay-progress-client'

import {
  replayStartForChoice,
  resolveReplayOpening,
  shouldPersistReplaySample,
  type ReplayStartChoice,
} from '@/lib/live/live-replay-player'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise:
  | Promise<void>
  | null = null

function loadYouTubeApi():
  Promise<void> {
  if (
    typeof window ===
    'undefined'
  ) {
    return Promise.resolve()
  }

  if (
    window.YT &&
    window.YT.Player
  ) {
    return Promise.resolve()
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise
  }

  youtubeApiPromise =
    new Promise<void>(
      resolve => {
        const previous =
          window
            .onYouTubeIframeAPIReady

        window.onYouTubeIframeAPIReady =
          () => {
            try {
              previous?.()
            } catch {
              // Existing callback failure must
              // not prevent replay playback.
            }

            resolve()
          }

        const existing =
          document.querySelector(
            'script[src="https://www.youtube.com/iframe_api"]',
          )

        if (!existing) {
          const script =
            document.createElement(
              'script',
            )

          script.src =
            'https://www.youtube.com/iframe_api'

          document.head
            .appendChild(
              script,
            )
        }
      },
    )

  return youtubeApiPromise
}

type Props = {
  cmsLiveId: string
  youtubeId?: string | null
  videoUrl?: string | null
  title?: string
  serverSync?: boolean
  className?: string
}

type OpeningState =
  | {
      status: 'loading'
    }
  | {
      status: 'choice'
      progress: LiveReplayProgress
      positionSeconds: number
      positionLabel: string
    }
  | {
      status: 'ready'
      startPositionSeconds: number
    }

function nowPerformance():
  number {
  if (
    typeof performance !==
    'undefined'
  ) {
    return performance.now()
  }

  return Date.now()
}

export function LiveReplayPlayer({
  cmsLiveId,
  youtubeId,
  videoUrl,
  title = 'Replay Citadelle',
  serverSync = false,
  className = '',
}: Props) {
  const hostRef =
    useRef<HTMLDivElement>(
      null,
    )

  const videoRef =
    useRef<HTMLVideoElement>(
      null,
    )

  const playerRef =
    useRef<any>(null)

  const sampleIntervalRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null)

  const lastSavedAtRef =
    useRef(0)

  const durationRef =
    useRef(0)

  const positionRef =
    useRef(0)

  const sessionKeyRef =
    useRef<string>('')

  const sessionStartPendingRef =
    useRef(true)

  const hasPlaybackStartedRef =
    useRef(false)

  if (!sessionKeyRef.current) {
    sessionKeyRef.current =
      createReplaySessionKey()
  }

  const [opening, setOpening] =
    useState<OpeningState>({
      status: 'loading',
    })

  const stopSampling =
    useCallback(() => {
      if (
        sampleIntervalRef.current
      ) {
        clearInterval(
          sampleIntervalRef.current,
        )

        sampleIntervalRef.current =
          null
      }
    }, [])

  const persist =
    useCallback(
      (
        positionSeconds: number,
        durationSeconds: number,
        options: {
          force?: boolean
          sessionStart?: boolean
          ended?: boolean
        } = {},
      ) => {
        const force =
          options.force === true

        const now =
          nowPerformance()

        if (
          !shouldPersistReplaySample(
            lastSavedAtRef.current,
            now,
            force,
          )
        ) {
          return
        }

        lastSavedAtRef.current =
          now

        const duration =
          Math.max(
            0,
            Number(
              durationSeconds,
            ) || 0,
          )

        const position =
          Math.max(
            0,
            Math.min(
              Number(
                positionSeconds,
              ) || 0,
              duration > 0
                ? duration
                : Number(
                    positionSeconds,
                  ) || 0,
            ),
          )

        positionRef.current =
          position

        if (duration > 0) {
          durationRef.current =
            duration
        }

        const input:
          LiveReplayProgressWrite = {
            cmsLiveId,
            positionSeconds:
              position,
            durationSeconds:
              duration,
            sessionKey:
              sessionKeyRef.current,
            ...(
              options.sessionStart
                ? {
                    sessionStart: true,
                  }
                : {}
            ),
            ...(
              options.ended
                ? {
                    ended: true,
                  }
                : {}
            ),
          }

        const local =
          saveLocalReplayProgress(
            input,
          )

        if (!serverSync) {
          return
        }

        void saveServerReplayProgress(
          input,
        ).then(
          result => {
            if (
              !result.ok ||
              !result.progress
            ) {
              return
            }

            const newest =
              chooseNewestReplayProgress(
                readLocalReplayProgress(
                  cmsLiveId,
                ) ?? local,
                result.progress,
              )

            if (newest) {
              writeLocalReplayProgress(
                newest,
              )
            }
          },
        )
      },
      [
        cmsLiveId,
        serverSync,
      ],
    )

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      sessionStartPendingRef.current =
        true

      hasPlaybackStartedRef.current =
        false

      lastSavedAtRef.current =
        0

      const local =
        readLocalReplayProgress(
          cmsLiveId,
        )

      let chosen =
        local

      if (serverSync) {
        const result =
          await getServerReplayProgress(
            cmsLiveId,
          )

        if (
          !cancelled &&
          result.ok
        ) {
          chosen =
            chooseNewestReplayProgress(
              local,
              result.progress,
            )

          if (chosen) {
            writeLocalReplayProgress(
              chosen,
            )
          }
        }
      }

      if (cancelled) {
        return
      }

      const resolved =
        resolveReplayOpening(
          chosen,
        )

      if (
        resolved.showReturnChoice &&
        chosen &&
        resolved.savedPositionLabel
      ) {
        setOpening({
          status: 'choice',
          progress: chosen,
          positionSeconds:
            resolved.savedPositionSeconds,
          positionLabel:
            resolved.savedPositionLabel,
        })

        return
      }

      setOpening({
        status: 'ready',
        startPositionSeconds: 0,
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [
    cmsLiveId,
    serverSync,
  ])

  const chooseStart =
    useCallback(
      (
        choice:
          ReplayStartChoice,
        savedPosition:
          number,
      ) => {
        setOpening({
          status: 'ready',
          startPositionSeconds:
            replayStartForChoice(
              choice,
              savedPosition,
            ),
        })
      },
      [],
    )

  useEffect(() => {
    if (
      opening.status !==
        'ready' ||
      !youtubeId ||
      !hostRef.current
    ) {
      return
    }

    let destroyed = false

    stopSampling()

    void loadYouTubeApi()
      .then(() => {
        if (
          destroyed ||
          !hostRef.current ||
          !window.YT
        ) {
          return
        }

        playerRef.current =
          new window.YT.Player(
            hostRef.current,
            {
              videoId:
                youtubeId,
              host:
                'https://www.youtube-nocookie.com',
              playerVars: {
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                iv_load_policy: 3,
                autoplay: 1,
              },
              events: {
                onReady:
                  (event: any) => {
                    const duration =
                      Number(
                        event.target
                          .getDuration?.(),
                      ) || 0

                    durationRef.current =
                      duration

                    if (
                      opening
                        .startPositionSeconds >
                      0
                    ) {
                      try {
                        event.target
                          .seekTo(
                            opening
                              .startPositionSeconds,
                            true,
                          )

                        positionRef.current =
                          opening
                            .startPositionSeconds
                      } catch {
                        // Player can still start
                        // from zero.
                      }
                    }
                  },

                onStateChange:
                  (event: any) => {
                    stopSampling()

                    if (
                      event.data === 1
                    ) {
                      hasPlaybackStartedRef.current =
                        true

                      if (
                        sessionStartPendingRef.current
                      ) {
                        sessionStartPendingRef.current =
                          false

                        const current =
                          Number(
                            playerRef
                              .current
                              ?.getCurrentTime?.(),
                          ) || 0

                        const duration =
                          Number(
                            playerRef
                              .current
                              ?.getDuration?.(),
                          ) || 0

                        persist(
                          current,
                          duration,
                          {
                            force: true,
                            sessionStart: true,
                          },
                        )
                      }

                      sampleIntervalRef.current =
                        setInterval(
                          () => {
                            try {
                              const current =
                                Number(
                                  playerRef
                                    .current
                                    ?.getCurrentTime?.(),
                                ) || 0

                              const duration =
                                Number(
                                  playerRef
                                    .current
                                    ?.getDuration?.(),
                                ) || 0

                              positionRef.current =
                                current

                              durationRef.current =
                                duration

                              persist(
                                current,
                                duration,
                              )
                            } catch {
                              // Playback continues even
                              // if progress sampling fails.
                            }
                          },
                          LIVE_REPLAY_SAMPLE_INTERVAL_MS,
                        )

                      return
                    }

                    if (
                      !hasPlaybackStartedRef.current
                    ) {
                      return
                    }

                    try {
                      const current =
                        Number(
                          playerRef
                            .current
                            ?.getCurrentTime?.(),
                        ) || 0

                      const duration =
                        Number(
                          playerRef
                            .current
                            ?.getDuration?.(),
                        ) || 0

                      positionRef.current =
                        current

                      durationRef.current =
                        duration

                      if (
                        event.data === 0
                      ) {
                        persist(
                          duration ||
                            current,
                          duration,
                          {
                            force: true,
                            ended: true,
                          },
                        )
                      }
                      else {
                        persist(
                          current,
                          duration,
                          {
                            force: true,
                          },
                        )
                      }
                    } catch {
                      // Best effort.
                    }
                  },
              },
            },
          )
      })

    return () => {
      destroyed = true

      stopSampling()

      try {
        const current =
          Number(
            playerRef.current
              ?.getCurrentTime?.(),
          ) ||
          positionRef.current

        const duration =
          Number(
            playerRef.current
              ?.getDuration?.(),
          ) ||
          durationRef.current

        if (
          hasPlaybackStartedRef.current &&
          (
            current > 0 ||
            duration > 0
          )
        ) {
          persist(
            current,
            duration,
            {
              force: true,
            },
          )
        }
      } catch {
        // Best effort.
      }

      try {
        playerRef.current
          ?.destroy?.()
      } catch {
        // Best effort.
      }

      playerRef.current =
        null
    }
  }, [
    opening,
    persist,
    stopSampling,
    youtubeId,
  ])

  useEffect(() => {
    return () => {
      stopSampling()

      if (
        videoRef.current
      ) {
        const current =
          videoRef.current
            .currentTime || 0

        const duration =
          videoRef.current
            .duration || 0

        if (
          hasPlaybackStartedRef.current &&
          (
            current > 0 ||
            duration > 0
          )
        ) {
          persist(
            current,
            duration,
            {
              force: true,
            },
          )
        }
      }
    }
  }, [
    persist,
    stopSampling,
  ])

  if (
    !youtubeId &&
    !videoUrl
  ) {
    return null
  }

  if (
    opening.status ===
    'loading'
  ) {
    return (
      <div
        className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/90 ${className}`}
        style={{ aspectRatio: '16/9' }}
        aria-label={title}
      >
        <p className="text-sm text-white/70">
          Préparation du replay…
        </p>
      </div>
    )
  }

  if (
    opening.status ===
    'choice'
  ) {
    return (
      <div
        className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/95 p-6 ${className}`}
        style={{ aspectRatio: '16/9' }}
        aria-label={title}
      >
        <div className="max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
            Bon retour
          </p>

          <h3 className="mt-3 text-xl font-semibold text-white md:text-2xl">
            Tu t&apos;étais arrêté à{' '}
            {opening.positionLabel}
          </h3>

          <p className="mt-2 text-sm text-white/65">
            Tu peux reprendre exactement là où tu t&apos;étais arrêté ou recommencer ce replay depuis le début.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                chooseStart(
                  'resume',
                  opening.positionSeconds,
                )
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Reprendre à{' '}
              {opening.positionLabel}
            </button>

            <button
              type="button"
              onClick={() =>
                chooseStart(
                  'restart',
                  opening.positionSeconds,
                )
              }
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Recommencer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (youtubeId) {
    return (
      <div
        className={`relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black ${className}`}
        style={{ aspectRatio: '16/9' }}
        aria-label={title}
      >
        <div
          ref={hostRef}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      src={videoUrl ?? undefined}
      aria-label={title}
      className={`w-full rounded-2xl border border-white/10 bg-black ${className}`}
      onLoadedMetadata={event => {
        const video =
          event.currentTarget

        const duration =
          Number(video.duration) || 0

        durationRef.current =
          duration

        if (
          opening.startPositionSeconds >
          0
        ) {
          try {
            video.currentTime =
              opening.startPositionSeconds

            positionRef.current =
              opening.startPositionSeconds
          } catch {
            // Playback can continue from zero.
          }
        }
      }}
      onPlay={event => {
        hasPlaybackStartedRef.current =
          true

        if (
          sessionStartPendingRef.current
        ) {
          sessionStartPendingRef.current =
            false

          persist(
            event.currentTarget.currentTime,
            event.currentTarget.duration || 0,
            {
              force: true,
              sessionStart: true,
            },
          )
        }
      }}
      onTimeUpdate={event => {
        if (
          !hasPlaybackStartedRef.current
        ) {
          return
        }

        const video =
          event.currentTarget

        positionRef.current =
          video.currentTime

        durationRef.current =
          video.duration || 0

        persist(
          video.currentTime,
          video.duration || 0,
        )
      }}
      onPause={event => {
        if (
          !hasPlaybackStartedRef.current
        ) {
          return
        }

        persist(
          event.currentTarget.currentTime,
          event.currentTarget.duration || 0,
          {
            force: true,
          },
        )
      }}
      onEnded={event => {
        const video =
          event.currentTarget

        persist(
          video.duration ||
            video.currentTime,
          video.duration || 0,
          {
            force: true,
            ended: true,
          },
        )
      }}
    />
  )
}

export function replayProgressPercent(
  positionSeconds: number,
  durationSeconds: number,
): number {
  return computeReplayPercent(
    positionSeconds,
    durationSeconds,
  )
}