'use client'

/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Onglet WhatsApp (client)
 *
 * Attribution FIRST-PARTY (UTM / referrer du CANAL WhatsApp / session) — pas d'API
 * externe requise. WHATSAPP_ATTRIBUTION = ACTIVE dès qu'elle fonctionne : jamais
 * « Non connecté » à tort. Empty ≠ Indisponible : sans donnée, on l'affiche
 * explicitement (0 réel), l'attribution restant ACTIVE.
 *
 * Le lien du canal est un CANAL de diffusion (whatsapp.com/channel/…), pas un wa.me.
 * WhatsApp Cloud API (WABA) = OPTIONNEL, non bloquant.
 *
 * Style cockpit ; tables larges en overflow-x-auto.
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ExternalLink } from 'lucide-react'
import {
  CHANNEL_STATE_COLOR,
  CHANNEL_STATE_LABEL_FR,
  type ChannelState,
} from '@/lib/intelligence/channels/types'
import type { SeoPeriodKey } from '@/lib/intelligence/seo/types'

interface Counts {
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
}
interface CampaignRow extends Counts {
  campaign: string | null
}
interface WhatsAppPayload {
  generatedAt: string
  period: { key: SeoPeriodKey; from: string; to: string }
  status: { state: ChannelState; reason?: string }
  cloud: { state: 'NOT_CONFIGURED' | 'OPTIONAL'; reason: string }
  attribution: {
    active: boolean
    demoMode: boolean
    hasData: boolean
    totals: Counts
    campaigns: CampaignRow[]
    channelUrl: string
  }
  attributionError?: string
}

const PERIODS: ReadonlyArray<{ key: SeoPeriodKey; label: string }> = [
  { key: '7d', label: '7 j' },
  { key: '28d', label: '28 j' },
  { key: '90d', label: '90 j' },
]

const nf = new Intl.NumberFormat('fr-FR')
const fmt = (n: number) => nf.format(n)

function StateChip({ state, reason }: { state: ChannelState; reason?: string }) {
  const color = CHANNEL_STATE_COLOR[state]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ borderColor: `${color}55`, color }}
      title={reason}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {CHANNEL_STATE_LABEL_FR[state]}
    </span>
  )
}

export default function WhatsAppTab() {
  const [period, setPeriod] = useState<SeoPeriodKey>('28d')
  const [data, setData] = useState<WhatsAppPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (key: SeoPeriodKey) => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/intelligence/whatsapp?period=${key}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as WhatsAppPayload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(period)
  }, [period, load])

  const attr = data?.attribution
  const t = attr?.totals

  return (
    <div className="mb-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="section-label">WhatsApp — attribution first-party</div>
        {data && <StateChip state={data.status.state} reason={data.status.reason} />}
        <div className="inline-flex rounded-lg bg-pearl/5 p-0.5 text-xs">
          {PERIODS.map((pd) => (
            <button
              key={pd.key}
              type="button"
              onClick={() => setPeriod(pd.key)}
              className={
                'rounded-md px-3 py-1 font-medium transition ' +
                (period === pd.key ? 'bg-cinematic-gold/15 text-cinematic-gold' : 'text-pearl/55 hover:text-pearl')
              }
            >
              {pd.label}
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
        {data?.period && (
          <span className="text-[11px] text-pearl/35">
            Période {data.period.from} → {data.period.to}
          </span>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">{err}</div>
      )}
      {!data && !err && <div className="py-10 text-center text-sm text-pearl/40">Chargement…</div>}

      {data && attr && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-pearl/45">
            <span>Canal de diffusion :</span>
            <a
              href={attr.channelUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cinematic-gold/80 hover:underline"
            >
              whatsapp.com/channel <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-pearl/30">·</span>
            <span title={data.cloud.reason}>
              Cloud API : {data.cloud.state === 'OPTIONAL' ? 'optionnelle (non requise)' : 'non configurée'}
            </span>
          </div>

          {attr.demoMode ? (
            <div className="card-royal p-4 text-sm text-pearl/50">
              Données de démonstration — attribution WhatsApp indisponible.
              {data.attributionError ? ' (lecture indisponible)' : ''}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="card-cinematic p-4">
                  <div className="text-xs text-pearl/55">Visites attribuées</div>
                  <div className="mt-0.5 font-cinzel text-2xl font-black text-cinematic-gold">{fmt(t!.visits)}</div>
                </div>
                <div className="card-cinematic p-4">
                  <div className="text-xs text-pearl/55">Inscriptions</div>
                  <div className="mt-0.5 font-cinzel text-2xl font-black text-pearl">{fmt(t!.signups)}</div>
                </div>
                <div className="card-cinematic p-4">
                  <div className="text-xs text-pearl/55">Écoutes</div>
                  <div className="mt-0.5 font-cinzel text-2xl font-black text-pearl">{fmt(t!.podcastStarts)}</div>
                </div>
                <div className="card-cinematic p-4">
                  <div className="text-xs text-pearl/55">Progressions</div>
                  <div className="mt-0.5 font-cinzel text-2xl font-black text-pearl">{fmt(t!.parcoursCompletions)}</div>
                </div>
              </div>

              {!attr.hasData ? (
                <div className="mt-3 card-royal p-4 text-sm text-pearl/50">
                  Aucune visite attribuée à WhatsApp sur la période (0 réel — l’attribution reste active).
                </div>
              ) : (
                <div className="mt-3 card-royal p-4">
                  <div className="section-label mb-2">Par campagne (UTM)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="text-pearl/45">
                        <tr>
                          <th className="py-1 pr-4 text-left font-medium">Campagne</th>
                          <th className="py-1 pr-4 text-right font-medium">Visites</th>
                          <th className="py-1 pr-4 text-right font-medium">Inscriptions</th>
                          <th className="py-1 pr-4 text-right font-medium">Écoutes</th>
                          <th className="py-1 text-right font-medium">Progressions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attr.campaigns.map((r) => (
                          <tr key={r.campaign ?? '(sans campagne)'} className="border-t border-pearl/5">
                            <td className="py-1 pr-4 text-pearl/80">{r.campaign ?? 'Sans campagne (UTM absent)'}</td>
                            <td className="py-1 pr-4 text-right text-pearl/70">{fmt(r.visits)}</td>
                            <td className="py-1 pr-4 text-right text-pearl/70">{fmt(r.signups)}</td>
                            <td className="py-1 pr-4 text-right text-pearl/70">{fmt(r.podcastStarts)}</td>
                            <td className="py-1 text-right text-pearl/70">{fmt(r.parcoursCompletions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
