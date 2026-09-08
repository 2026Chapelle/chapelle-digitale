'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Users,
} from 'lucide-react'

import {
  LIVE_PRESENCE_COUNT_INTERVAL_MS,
  LIVE_PRESENCE_HEARTBEAT_INTERVAL_MS,
  getOrCreateGuestSessionId,
  hasJoinedLive,
  markLiveJoined,
  requestLiveHeartbeat,
  requestLiveJoin,
  requestLivePresenceCount,
} from '@/lib/live/live-presence-client'

type Props = {
  liveVideoId: string
}

export default function LivePresenceControls({
  liveVideoId,
}: Props) {
  const [
    joined,
    setJoined,
  ] = useState(false)

  const [
    joining,
    setJoining,
  ] = useState(false)

  const [
    activeTotal,
    setActiveTotal,
  ] = useState<number | null>(
    null,
  )

  const guestSessionIdRef =
    useRef<string | null>(null)

  const joinedRef =
    useRef(false)

  useEffect(() => {
    let cancelled = false

    joinedRef.current = false
    setJoined(false)
    setActiveTotal(null)

    let guestSessionId: string

    try {
      guestSessionId =
        guestSessionIdRef.current ||
        getOrCreateGuestSessionId(
          window.localStorage,
          window.crypto,
        )
    } catch {
      return
    }

    guestSessionIdRef.current =
      guestSessionId

    const rememberedJoin =
      hasJoinedLive(
        window.localStorage,
        liveVideoId,
      )

    joinedRef.current = rememberedJoin
    setJoined(rememberedJoin)

    const refreshCount =
      async () => {
        const count =
          await requestLivePresenceCount()

        if (
          cancelled ||
          !count
        ) {
          return
        }

        setActiveTotal(
          count.live
            ? count.activeTotal
            : null,
        )
      }

    const syncHeartbeat =
      async () => {
        if (
          cancelled ||
          !joinedRef.current ||
          document.visibilityState !==
            'visible'
        ) {
          return
        }

        const heartbeat =
          await requestLiveHeartbeat(
            guestSessionId,
          )

        if (
          cancelled ||
          !heartbeat
        ) {
          return
        }

        if (
          heartbeat.active === false &&
          joinedRef.current
        ) {
          const rejoined =
            await requestLiveJoin(
              guestSessionId,
            )

          if (
            cancelled ||
            !rejoined
          ) {
            return
          }

          markLiveJoined(
            window.localStorage,
            liveVideoId,
          )

          joinedRef.current = true
          setJoined(true)

          return
        }

        joinedRef.current = true
        setJoined(true)
      }

    void refreshCount()

    if (
      rememberedJoin &&
      document.visibilityState ===
        'visible'
    ) {
      void syncHeartbeat()
    }

    const countTimer =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void refreshCount()
          }
        },
        LIVE_PRESENCE_COUNT_INTERVAL_MS,
      )

    const heartbeatTimer =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void syncHeartbeat()
          }
        },
        LIVE_PRESENCE_HEARTBEAT_INTERVAL_MS,
      )

    const onVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void refreshCount()

          if (
            joinedRef.current
          ) {
            void syncHeartbeat()
          }
        }
      }

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange,
    )

    return () => {
      cancelled = true

      window.clearInterval(
        countTimer,
      )

      window.clearInterval(
        heartbeatTimer,
      )

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      )
    }
  }, [liveVideoId])

  const join =
    async () => {
      if (
        joining ||
        joinedRef.current
      ) {
        return
      }

      setJoining(true)

      try {
        let guestSessionId =
          guestSessionIdRef.current

        if (!guestSessionId) {
          guestSessionId =
            getOrCreateGuestSessionId(
              window.localStorage,
              window.crypto,
            )

          guestSessionIdRef.current =
            guestSessionId
        }

        const result =
          await requestLiveJoin(
            guestSessionId,
          )

        if (!result) {
          return
        }

        markLiveJoined(
          window.localStorage,
          liveVideoId,
        )

        joinedRef.current = true
        setJoined(true)

        const count =
          await requestLivePresenceCount()

        if (count?.live) {
          setActiveTotal(
            count.activeTotal,
          )
        }
      } catch {
        // La présence ne doit jamais casser le lecteur Live.
      } finally {
        setJoining(false)
      }
    }

  return (
    <div
      data-live-presence-controls="true"
      className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.07] to-gold/[0.025] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-gold" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-cinzel text-sm font-bold text-pearl">
            {joined
              ? 'Tu es avec nous'
              : 'La Famille Royale est réunie'}
          </p>

          <p className="font-inter text-[11px] leading-relaxed text-pearl/40 mt-1">
            {joined
              ? 'Ta présence est prise en compte pendant ce direct.'
              : 'Signale simplement ta présence pour vivre ce culte avec la famille.'}
          </p>

          {activeTotal !== null &&
            activeTotal > 0 && (
              <p
                data-live-active-count="true"
                aria-live="polite"
                className="font-inter text-[11px] text-gold/75 mt-2"
              >
                {activeTotal === 1
                  ? '1 personne présente maintenant'
                  : `${activeTotal} personnes présentes maintenant`}
              </p>
            )}
        </div>
      </div>

      <button
        type="button"
        onClick={join}
        disabled={
          joining ||
          joined
        }
        className="mt-3 w-full px-4 py-2.5 rounded-xl border border-gold/25 bg-gold/10 text-gold hover:bg-gold/15 disabled:cursor-default disabled:opacity-80 transition-colors font-inter text-xs font-semibold"
      >
        {joined
          ? '✓ Tu es avec nous'
          : joining
            ? 'Un instant…'
            : '👋 Je suis là'}
      </button>
    </div>
  )
}