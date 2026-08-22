'use client'

/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Onglet YouTube (client)
 *
 * Récupère /api/intelligence/youtube?period=… et rend cinq sections :
 * VUE D'ENSEMBLE · TOP CONTENUS · AUDIENCE · ACQUISITION · TENDANCES.
 *
 * Honnêteté : SOURCE=YouTube, fraîcheur (Différé SEO), dernière synchro toujours
 * affichés. Un connecteur non autorisé n'affiche JAMAIS un nombre déguisé en réel —
 * on montre un appel à configuration explicite (voir YOUTUBE_SETUP.md). Style aligné
 * cockpit (card-royal / card-cinematic / section-label / text-pearl /
 * text-cinematic-gold). Tables larges enveloppées dans overflow-x-auto.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  KeyRound,
  Minus,
  RefreshCw,
  ShieldAlert,
  Youtube,
} from 'lucide-react'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'
import {
  CHANNEL_STATE_LABEL_FR,
  type ChannelState,
} from '@/lib/intelligence/channels/types'
import type { SeoPeriodKey, SeoTrend } from '@/lib/intelligence/seo/types'
import type { YouTubeData } from '@/lib/intelligence/connectors/youtube'

type Payload = YouTubeData & { error?: string }

const PERIODS: ReadonlyArray<{ key: SeoPeriodKey; label: string }> = [
  { key: '7d', label: '7 j' },
  { key: '28d', label: '28 j' },
  { key: '90d', label: '90 j' },
]

/* --------------------------- Formatage pur --------------------------- */

const nf = new Intl.NumberFormat('fr-FR')

function fmtInt(n: number | null | undefined): string {
  return n == null ? '—' : nf.format(Math.round(n))
}

/** Minutes → « 12 h 34 min » / « 34 min ». */
function fmtMinutes(min: number | null | undefined): string {
  if (min == null) return '—'
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${nf.format(h)} h ${m} min` : `${m} min`
}

/** Secondes → « m:ss ». */
function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—'
  const s = Math.round(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/* --------------------------- Petits composants --------------------------- */

function TrendArrow({ trend, delta }: { trend?: SeoTrend; delta?: number }) {
  if (!trend || trend === 'unknown') return null
  if (trend === 'new')
    return <span className="text-[11px] font-semibold text-emerald-400">Nouveau</span>
  const label =
    typeof delta === 'number' ? `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(0)} %` : ''
  if (trend === 'up')
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-400">
        <ArrowUpRight className="h-3 w-3" /> {label}
      </span>
    )
  if (trend === 'down')
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-red-400">
        <ArrowDownRight className="h-3 w-3" /> {label}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-pearl/40">
      <Minus className="h-3 w-3" /> {label}
    </span>
  )
}

const STATE_META: Record<
  ChannelState,
  { color: string; Icon: typeof CheckCircle2 }
> = {
  CONNECTED: { color: '#4ade80', Icon: CheckCircle2 },
  ACTIVE: { color: '#4ade80', Icon: CheckCircle2 },
  NOT_CONFIGURED: { color: '#9ca3af', Icon: KeyRound },
  AUTH_REQUIRED: { color: '#fbbf24', Icon: KeyRound },
  PERMISSION_REQUIRED: { color: '#fbbf24', Icon: ShieldAlert },
  ERROR: { color: '#f87171', Icon: AlertTriangle },
  UNAVAILABLE: { color: '#9ca3af', Icon: Minus },
}

function StateChip({ state, reason }: { state: ChannelState; reason?: string }) {
  const meta = STATE_META[state]
  const Icon = meta.Icon
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
      style={{ borderColor: `${meta.color}55`, color: meta.color }}
      title={reason ?? undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">YouTube</span>
      <span className="text-pearl/45">·</span>
      <span>{CHANNEL_STATE_LABEL_FR[state]}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  trend,
  delta,
}: {
  label: string
  value: string
  hint?: string
  trend?: SeoTrend
  delta?: number
}) {
  return (
    <div className="card-cinematic p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-pearl/55">{label}</div>
        <span className="text-[10px] text-pearl/35">YouTube</span>
      </div>
      <div className="mt-1 font-cinzel text-2xl font-black text-pearl">{value}</div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-pearl/40">{hint ?? FRESHNESS_LABELS_FR.SEO_DELAYED}</span>
        <TrendArrow trend={trend} delta={delta} />
      </div>
    </div>
  )
}

/* --------------------------- Onglet principal --------------------------- */

export default function YouTubeTab() {
  const [period, setPeriod] = useState<SeoPeriodKey>('28d')
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (key: SeoPeriodKey) => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/intelligence/youtube?period=${key}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as Payload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(period)
  }, [period, load])

  const state = data?.status.state
  const connected = state === 'CONNECTED'
  const needsSetup =
    state === 'AUTH_REQUIRED' ||
    state === 'PERMISSION_REQUIRED' ||
    state === 'NOT_CONFIGURED'

  const totalViews = useMemo(() => data?.totals?.views ?? null, [data])

  return (
    <div className="mb-8">
      {/* Barre de contrôle : période + actualiser + statut */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="section-label flex items-center gap-2">
          <Youtube className="h-4 w-4 text-cinematic-gold" /> YouTube — @ChapelleRoyaleTV
        </div>
        <div className="inline-flex rounded-lg bg-pearl/5 p-0.5 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={
                'rounded-md px-3 py-1 font-medium transition ' +
                (period === p.key
                  ? 'bg-cinematic-gold/15 text-cinematic-gold'
                  : 'text-pearl/55 hover:text-pearl')
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load(period)}
          className="inline-flex items-center gap-2 rounded-lg bg-pearl/5 px-3 py-1.5 text-sm text-pearl/70 hover:text-pearl"
        >
          <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> Actualiser
        </button>
        {data && <StateChip state={data.status.state} reason={data.status.reason} />}
        {data && (
          <span className="text-[11px] text-pearl/35">
            Source YouTube · {FRESHNESS_LABELS_FR[data.status.freshness]}
            {data.period && (
              <>
                {' '}
                · période {data.period.from} → {data.period.to}
              </>
            )}
            {data.status.lastSync ? (
              <> · synchro {new Date(data.status.lastSync).toLocaleString('fr-FR')}</>
            ) : (
              <> · jamais synchronisé</>
            )}
          </span>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      {!data && !err ? (
        <div className="card-royal p-10 text-center text-sm text-pearl/40">Chargement…</div>
      ) : data ? (
        <div className="space-y-8">
          {/* Invite de configuration honnête (OAuth propriétaire non provisionné) */}
          {needsSetup && (
            <div className="card-royal border-l-2 p-4" style={{ borderLeftColor: '#fbbf24' }}>
              <div className="flex items-center gap-2 text-pearl">
                <KeyRound className="h-4 w-4 text-cinematic-gold" />
                <span className="font-medium">
                  {state === 'PERMISSION_REQUIRED'
                    ? 'Compte YouTube autorisé non canonique'
                    : 'Connexion YouTube non autorisée'}
                </span>
              </div>
              <p className="mt-2 text-sm text-pearl/60">
                {data.status.reason ??
                  'Le connecteur YouTube n’est pas encore autorisé par le propriétaire de la chaîne.'}
              </p>
              <p className="mt-2 text-sm text-pearl/60">
                YouTube Analytics (temps de visionnage, abonnés, analytics par vidéo) exige un{' '}
                <strong className="text-pearl/80">consentement OAuth 2.0 du propriétaire</strong> de la
                chaîne <span className="text-cinematic-gold">@ChapelleRoyaleTV</span> — un compte de
                service ne suffit pas. Aucune donnée n’est fabriquée tant que l’autorisation n’est pas
                en place.
              </p>
              <div className="mt-2 text-[11px] text-pearl/40">
                Marche à suivre : <code className="text-pearl/60">docs/intelligence/YOUTUBE_SETUP.md</code>{' '}
                (client OAuth, activation des API YouTube Data v3 + YouTube Analytics, refresh token
                read-only, variables d’environnement serveur). Aucun secret n’est exposé côté client.
              </div>
            </div>
          )}

          {state === 'ERROR' && (
            <div className="card-royal border-l-2 p-4" style={{ borderLeftColor: '#f87171' }}>
              <div className="flex items-center gap-2 text-pearl">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="font-medium">Lecture YouTube indisponible</span>
              </div>
              <p className="mt-2 text-sm text-pearl/60">
                Une erreur technique empêche la lecture des données ({data.status.reason ?? 'inconnue'}).
                Aucune valeur n’est fabriquée.
              </p>
            </div>
          )}

          {connected && (
            <>
              {/* 1. VUE D'ENSEMBLE */}
              <section>
                <div className="section-label mb-3">Vue d’ensemble</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <StatCard
                    label="Vues"
                    value={fmtInt(totalViews)}
                    trend={data.trends?.views.trend}
                    delta={data.trends?.views.delta}
                  />
                  <StatCard
                    label="Temps de visionnage"
                    value={fmtMinutes(data.totals?.watchTimeMinutes)}
                    trend={data.trends?.watchTimeMinutes.trend}
                    delta={data.trends?.watchTimeMinutes.delta}
                  />
                  <StatCard
                    label="Durée moyenne / vue"
                    value={fmtDuration(data.totals?.averageViewDurationSec)}
                    trend={data.trends?.averageViewDurationSec.trend}
                    delta={data.trends?.averageViewDurationSec.delta}
                  />
                  <StatCard
                    label="Abonnés (solde net)"
                    value={
                      data.totals
                        ? `${data.totals.subscribersGained - data.totals.subscribersLost >= 0 ? '+' : ''}${nf.format(
                            data.totals.subscribersGained - data.totals.subscribersLost,
                          )}`
                        : '—'
                    }
                    hint={
                      data.totals
                        ? `+${nf.format(data.totals.subscribersGained)} / −${nf.format(data.totals.subscribersLost)}`
                        : undefined
                    }
                    trend={data.trends?.subscribersNet.trend}
                    delta={data.trends?.subscribersNet.delta}
                  />
                </div>
                <p className="mt-2 text-[11px] text-pearl/35">
                  Stats YouTube = <strong className="text-pearl/55">Différé (SEO)</strong> : jamais
                  affichées comme « temps réel ». Comparaison avec la période précédente de même durée.
                </p>
              </section>

              {/* 2. TOP CONTENUS */}
              <section>
                <div className="section-label mb-3">Top contenus</div>
                <div className="card-royal p-4">
                  {data.topVideos.length === 0 ? (
                    <div className="py-6 text-center text-sm text-pearl/40">
                      Aucune vidéo sur cette période.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="text-left text-xs text-pearl/45">
                            <th className="py-2 pr-4 font-medium">Vidéo</th>
                            <th className="py-2 pr-4 font-medium text-right">Vues</th>
                            <th className="py-2 pr-4 font-medium text-right">Temps de visionnage</th>
                            <th className="py-2 font-medium text-right">Durée moy.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topVideos.map((v) => (
                            <tr key={v.videoId} className="border-t border-pearl/10">
                              <td className="py-2 pr-4 text-pearl/85">
                                <a
                                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-cinematic-gold"
                                >
                                  {v.title}
                                </a>
                              </td>
                              <td className="py-2 pr-4 text-right text-pearl">{fmtInt(v.views)}</td>
                              <td className="py-2 pr-4 text-right text-pearl/80">
                                {fmtMinutes(v.watchTimeMinutes)}
                              </td>
                              <td className="py-2 text-right text-pearl/80">
                                {fmtDuration(v.averageViewDurationSec)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              {/* 3. AUDIENCE */}
              <section>
                <div className="section-label mb-3">Audience</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    label="Abonnés (chaîne)"
                    value={
                      data.channel?.subscribersHidden
                        ? 'Masqué'
                        : fmtInt(data.channel?.subscriberCount)
                    }
                    hint="À vie · public"
                  />
                  <StatCard
                    label="Vues (chaîne)"
                    value={fmtInt(data.channel?.viewCount)}
                    hint="À vie · public"
                  />
                  <StatCard
                    label="Vidéos publiées"
                    value={fmtInt(data.channel?.videoCount)}
                    hint="À vie · public"
                  />
                  <StatCard
                    label="Abonnés gagnés"
                    value={fmtInt(data.totals?.subscribersGained)}
                    hint={`Perdus : ${fmtInt(data.totals?.subscribersLost)}`}
                  />
                </div>
              </section>

              {/* 4. ACQUISITION */}
              <section>
                <div className="section-label mb-3">Acquisition — sources de trafic</div>
                <div className="card-royal p-4">
                  {data.trafficSources.length === 0 ? (
                    <div className="py-6 text-center text-sm text-pearl/40">
                      Aucune source de trafic sur cette période.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px] text-sm">
                        <thead>
                          <tr className="text-left text-xs text-pearl/45">
                            <th className="py-2 pr-4 font-medium">Source</th>
                            <th className="py-2 font-medium text-right">Vues</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.trafficSources.map((s) => (
                            <tr key={s.source} className="border-t border-pearl/10">
                              <td className="py-2 pr-4 text-pearl/85">{s.label}</td>
                              <td className="py-2 text-right text-pearl">{fmtInt(s.views)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              {/* 5. TENDANCES */}
              <section>
                <div className="section-label mb-3">Tendances (vs période précédente)</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ['Vues', data.trends?.views],
                      ['Temps de visionnage', data.trends?.watchTimeMinutes],
                      ['Durée moyenne / vue', data.trends?.averageViewDurationSec],
                      ['Abonnés (net)', data.trends?.subscribersNet],
                    ] as const
                  ).map(([label, t]) => (
                    <div key={label} className="card-cinematic p-4">
                      <div className="text-xs text-pearl/55">{label}</div>
                      <div className="mt-2 flex items-center justify-between">
                        {t ? (
                          <TrendArrow trend={t.trend} delta={t.delta} />
                        ) : (
                          <span className="text-[11px] text-pearl/40">—</span>
                        )}
                        <span className="text-[11px] text-pearl/40">
                          {t && t.previous != null ? `préc. ${nf.format(Math.round(t.previous))}` : 'préc. —'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-pearl/35">
                  Une tendance « Nouveau » signifie une activité apparue sur la période courante (aucune
                  base précédente comparable). Aucune valeur n’est extrapolée.
                </p>
              </section>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
