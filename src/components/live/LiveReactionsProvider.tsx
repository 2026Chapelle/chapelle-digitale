'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  createReactionAnimationScheduler,
  type VisibleReaction,
} from '@/lib/live/live-reaction-animation'

import {
  createReactionController,
  createReactionGuestIdentity,
  type ReactionClientState,
  type ReactionController,
} from '@/lib/live/live-reactions-client'

import {
  subscribeLiveReactionEvents,
} from '@/lib/live/live-reactions-realtime'

import type {
  ReactionType,
} from '@/lib/live/live-reactions'

import {
  getBrowserClient,
} from '@/lib/supabase-browser'

type Props = {
  videoId: string | null
  enabled: boolean
  children: ReactNode
}

type LiveReactionsValue = {
  state: ReactionClientState
  animations: VisibleReaction[]
  send: (
    reaction: ReactionType,
  ) => Promise<void>
}

const INITIAL_STATE: ReactionClientState = {
  context: 'loading',
  liveKey: null,
  uniqueByType: null,
  stale: false,
  send: 'idle',
  retryUntil: null,
  transport: 'connecting',
}

const LiveReactionsContext =
  createContext<LiveReactionsValue | null>(
    null,
  )

export function useLiveReactions(): LiveReactionsValue {
  const value =
    useContext(LiveReactionsContext)

  if (!value) {
    throw new Error(
      'Live reactions provider is missing',
    )
  }

  return value
}

export default function LiveReactionsProvider({
  videoId,
  enabled,
  children,
}: Props) {
  const [
    state,
    setState,
  ] = useState<ReactionClientState>(
    INITIAL_STATE,
  )

  const [
    animations,
    setAnimations,
  ] = useState<VisibleReaction[]>(
    [],
  )

  const controllerRef =
    useRef<ReactionController | null>(
      null,
    )

  const send = useCallback(
    async (
      reaction: ReactionType,
    ) => {
      await controllerRef.current?.send(
        reaction,
      )
    },
    [],
  )

  useEffect(() => {
    let disposed = false

    let visible =
      document.visibilityState ===
        'visible'

    let realtimeCleanup:
      | (() => void)
      | null = null

    let realtimeLiveKey:
      | string
      | null = null

    let animationTimer:
      | number
      | null = null

    const media =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      )

    let reducedMotion =
      media.matches

    const scheduler =
      createReactionAnimationScheduler(
        () => performance.now(),
      )

    const identity =
      createReactionGuestIdentity({
        getStorage:
          () => window.localStorage,
        cryptoApi:
          window.crypto,
      })

    let controller:
      | ReactionController
      | null = null

    const stopRealtime =
      () => {
        realtimeCleanup?.()
        realtimeCleanup = null
        realtimeLiveKey = null
      }

    const applyAnimationMode =
      () => {
        scheduler.setMode({
          visible,
          enabled:
            enabled &&
            Boolean(videoId),
          reducedMotion,
        })

        if (
          !visible ||
          !enabled ||
          !videoId ||
          reducedMotion
        ) {
          setAnimations([])
        }
      }

    const ensureRealtime =
      (
        liveKey: string,
      ) => {
        if (
          disposed ||
          !visible ||
          !enabled ||
          !videoId ||
          realtimeLiveKey ===
            liveKey
        ) {
          return
        }

        stopRealtime()

        const browserClient =
          getBrowserClient()

        if (!browserClient) {
          realtimeLiveKey =
            liveKey

          controller?.transport(
            'degraded',
          )

          return
        }

        realtimeLiveKey =
          liveKey

        realtimeCleanup =
          subscribeLiveReactionEvents(
            browserClient,
            liveKey,
            event => {
              controller?.receive(
                event,
              )
            },
            status => {
              controller?.transport(
                status,
              )
            },
          )
      }

    controller =
      createReactionController({
        now:
          () => performance.now(),

        wallNow:
          () => Date.now(),

        guestId:
          () => identity.get(),

        onState:
          nextState => {
            if (disposed) return

            setState(nextState)

            if (
              nextState.context ===
                'open' &&
              nextState.liveKey &&
              nextState.liveKey ===
                `youtube:${videoId}` &&
              visible &&
              enabled
            ) {
              ensureRealtime(
                nextState.liveKey,
              )

              return
            }

            if (
              nextState.context !==
              'open'
            ) {
              stopRealtime()
            }
          },

        onEvent:
          event => {
            if (disposed) return

            scheduler.enqueue(event)
          },

        onClock:
          sample => {
            if (disposed) return

            scheduler.sampleClock(
              sample,
            )
          },

        onReset:
          () => {
            scheduler.clear()

            if (!disposed) {
              setAnimations([])
            }
          },
      })

    controllerRef.current =
      controller

    applyAnimationMode()

    controller.setContext(
      videoId,
      enabled && visible,
    )

    animationTimer =
      window.setInterval(
        () => {
          if (disposed) return

          setAnimations(
            scheduler.tick(),
          )
        },
        100,
      )

    const onStorage =
      (
        event: StorageEvent,
      ) => {
        identity.adopt({
          key: event.key,
          newValue: event.newValue,
        })
      }

    const onVisibilityChange =
      () => {
        visible =
          document.visibilityState ===
            'visible'

        applyAnimationMode()

        if (!visible) {
          stopRealtime()

          controller?.setContext(
            videoId,
            false,
          )

          return
        }

        controller?.setContext(
          videoId,
          enabled,
        )
      }

    const onMotionChange =
      (
        event: MediaQueryListEvent,
      ) => {
        reducedMotion =
          event.matches

        applyAnimationMode()
      }

    window.addEventListener(
      'storage',
      onStorage,
    )

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange,
    )

    media.addEventListener(
      'change',
      onMotionChange,
    )

    return () => {
      disposed = true

      stopRealtime()

      controllerRef.current =
        null

      controller?.dispose()

      scheduler.clear()

      if (
        animationTimer !== null
      ) {
        window.clearInterval(
          animationTimer,
        )
      }

      window.removeEventListener(
        'storage',
        onStorage,
      )

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      )

      media.removeEventListener(
        'change',
        onMotionChange,
      )
    }
  }, [
    videoId,
    enabled,
  ])

  const value =
    useMemo<LiveReactionsValue>(
      () => ({
        state,
        animations,
        send,
      }),
      [
        state,
        animations,
        send,
      ],
    )

  return (
    <LiveReactionsContext.Provider
      value={value}
    >
      {children}
    </LiveReactionsContext.Provider>
  )
}