'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Activity,
  Flame,
  Link2,
  Radio,
  Share2,
  UserCheck,
  Users,
} from 'lucide-react'

const LIVE_ADMIN_POLL_INTERVAL_MS =
  15_000

type AvailablePresence = {
  available: true
  activeTotal: number
  activeMembers: number
  activeGuests: number
  joinedTotal: number
}

type AvailableShares = {
  available: true
  totalActions: number
  nativeShare: number
  copyLink: number
}

type AvailableReactions = {
  available: true
  uniqueActors: number
  totalActions: number
  uniqueByType: {
    prayer: number
    fire: number
    heart: number
    praise: number
    kingdom: number
  }
  actionsByType: {
    prayer: number
    fire: number
    heart: number
    praise: number
    kingdom: number
  }
}

type UnavailableAggregate = {
  available: false
}

type SupervisionData = {
  live: boolean
  canonical: {
    status: string
    title: string | null
    youtubeVideoId:
      | string
      | null
  }
  presence:
    | AvailablePresence
    | UnavailableAggregate
    | null
  shares:
    | AvailableShares
    | UnavailableAggregate
    | null
  reactions:
    | AvailableReactions
    | UnavailableAggregate
    | null
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon:
    typeof Users
}) {
  return (
    <div className="rounded-2xl border border-pearl/[0.07] bg-pearl/[0.025] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gold/60" />

        <span className="font-inter text-[11px] text-pearl/40">
          {label}
        </span>
      </div>

      <div className="font-cinzel text-2xl font-black text-pearl">
        {value.toLocaleString()}
      </div>
    </div>
  )
}

export default function LiveAdminSupervision() {
  const [
    data,
    setData,
  ] =
    useState<SupervisionData | null>(
      null,
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    unavailable,
    setUnavailable,
  ] =
    useState(false)

  const refresh =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              '/api/admin/live/supervision',
              {
                method: 'GET',
                cache: 'no-store',
                credentials:
                  'same-origin',
              },
            )

          if (!response.ok) {
            setUnavailable(true)
            return
          }

          const payload =
            await response
              .json()
              .catch(() => null)

          if (
            !payload?.ok ||
            !payload.data
          ) {
            setUnavailable(true)
            return
          }

          setData(
            payload.data as
              SupervisionData,
          )

          setUnavailable(false)
        } catch {
          setUnavailable(true)
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void refresh()

    const timer =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void refresh()
          }
        },
        LIVE_ADMIN_POLL_INTERVAL_MS,
      )

    const onVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void refresh()
        }
      }

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange,
    )

    return () => {
      window.clearInterval(
        timer,
      )

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      )
    }
  }, [refresh])

  if (
    loading &&
    !data
  ) {
    return (
      <div className="card-royal py-12 text-center">
        <Activity className="w-7 h-7 text-gold/40 mx-auto mb-3 animate-pulse" />

        <p className="font-inter text-sm text-pearl/40">
          Chargement de la supervision…
        </p>
      </div>
    )
  }

  if (
    unavailable &&
    !data
  ) {
    return (
      <div className="card-royal py-12 text-center">
        <Activity className="w-7 h-7 text-gold/40 mx-auto mb-3" />

        <p className="font-cinzel text-sm font-bold text-pearl/70">
          Supervision momentanément indisponible
        </p>

        <p className="font-inter text-xs text-pearl/30 mt-2">
          Le direct continue normalement. Les données reviendront automatiquement.
        </p>
      </div>
    )
  }

  if (
    !data ||
    !data.live
  ) {
    return (
      <div className="card-royal py-14 text-center">
        <Radio className="w-8 h-8 text-gold/35 mx-auto mb-4" />

        <p className="font-cinzel text-lg font-bold text-pearl/70">
          Aucun direct en cours
        </p>

        <p className="font-inter text-xs leading-relaxed text-pearl/30 mt-2 max-w-lg mx-auto">
          La supervision s’activera automatiquement au prochain Live détecté par Citadelle.
        </p>
      </div>
    )
  }

  const presence =
    data.presence

  const shares =
    data.shares

  const reactions =
    data.reactions

  return (
    <div className="space-y-5">
      <div
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
        style={{
          background:
            'linear-gradient(135deg, #0a0018 0%, #1a0033 100%)',
          border:
            '1px solid rgba(239,68,68,0.28)',
        }}
      >
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

              <span className="font-inter text-[10px] uppercase tracking-[0.18em] font-bold text-red-400">
                En direct
              </span>
            </div>

            <h2 className="font-cinzel text-base sm:text-lg font-bold text-pearl">
              {data.canonical.title ||
                'Direct Citadelle'}
            </h2>

            <p className="font-inter text-[11px] text-pearl/30 mt-1">
              État canonical : {data.canonical.status}
            </p>
          </div>
        </div>
      </div>

      <section className="card-royal">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-gold" />
          </div>

          <div>
            <h3 className="font-cinzel text-sm font-bold text-pearl">
              Assemblée maintenant
            </h3>

            <p className="font-inter text-[11px] text-pearl/30 mt-0.5">
              Présences actives dans le culte numérique
            </p>
          </div>
        </div>

        {!presence ||
        !presence.available ? (
          <div className="rounded-2xl border border-pearl/[0.06] bg-pearl/[0.02] py-8 px-4 text-center">
            <Activity className="w-5 h-5 text-pearl/25 mx-auto mb-2" />

            <p className="font-inter text-xs text-pearl/40">
              Présence momentanément indisponible
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="font-cinzel text-4xl font-black text-gold">
                {presence.activeTotal.toLocaleString()}
              </div>

              <p className="font-inter text-xs text-pearl/45 mt-1">
                présents maintenant
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Metric
                label="Membres actifs"
                value={
                  presence.activeMembers
                }
                icon={UserCheck}
              />

              <Metric
                label="Visiteurs actifs"
                value={
                  presence.activeGuests
                }
                icon={Users}
              />

              <Metric
                label="Ont rejoint depuis le début"
                value={
                  presence.joinedTotal
                }
                icon={Activity}
              />
            </div>
          </>
        )}
      </section>

      <section className="card-royal">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-gold" />
          </div>

          <div>
            <h3 className="font-cinzel text-sm font-bold text-pearl">
              Partage du direct
            </h3>

            <p className="font-inter text-[11px] text-pearl/30 mt-0.5">
              Actions réussies depuis le début du Live
            </p>
          </div>
        </div>

        {!shares ||
        !shares.available ? (
          <div className="rounded-2xl border border-pearl/[0.06] bg-pearl/[0.02] py-8 px-4 text-center">
            <Share2 className="w-5 h-5 text-pearl/25 mx-auto mb-2" />

            <p className="font-inter text-xs text-pearl/40">
              Partage momentanément indisponible
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="font-cinzel text-4xl font-black text-gold">
                {shares.totalActions.toLocaleString()}
              </div>

              <p className="font-inter text-xs text-pearl/45 mt-1">
                actions réussies
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Metric
                label="Partages natifs"
                value={
                  shares.nativeShare
                }
                icon={Share2}
              />

              <Metric
                label="Liens copiés"
                value={
                  shares.copyLink
                }
                icon={Link2}
              />
            </div>

            <p className="font-inter text-[10px] leading-relaxed text-pearl/25 mt-4">
              Ces nombres représentent des actions de partage réussies, pas des destinataires ni des ouvertures du lien.
            </p>
          </>
        )}
      </section>

      <div className="card-royal p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Flame className="w-4 h-4 text-gold" />

          <div>
            <h3 className="font-cinzel text-sm font-bold text-pearl">
              Réactions
            </h3>

            <p className="font-inter text-[11px] text-pearl/35 mt-1">
              Activité agrégée et anonyme du direct
            </p>
          </div>
        </div>

        {!reactions ||
        !reactions.available ? (
          <div className="py-7 text-center">
            <Flame className="w-5 h-5 text-pearl/25 mx-auto mb-2" />

            <p className="font-inter text-xs text-pearl/35">
              Agrégats de réactions indisponibles
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="Participants uniques"
                value={reactions.uniqueActors}
                icon={Users}
              />

              <Metric
                label="Actions totales"
                value={reactions.totalActions}
                icon={Flame}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Metric
                label="Prière"
                value={reactions.uniqueByType.prayer}
                icon={Activity}
              />

              <Metric
                label="Feu"
                value={reactions.uniqueByType.fire}
                icon={Flame}
              />

              <Metric
                label="Amour"
                value={reactions.uniqueByType.heart}
                icon={UserCheck}
              />

              <Metric
                label="Louange"
                value={reactions.uniqueByType.praise}
                icon={Activity}
              />

              <Metric
                label="Royaume"
                value={reactions.uniqueByType.kingdom}
                icon={Radio}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}