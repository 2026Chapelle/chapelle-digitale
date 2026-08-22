'use client'

/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Onglet Facebook / Instagram (client)
 *
 * Deux mondes SÉPARÉS, jamais confondus :
 *  1. MÉTRIQUES PLATEFORME (Meta Graph API) — reach/impressions/interactions/clics/
 *     abonnés. Tant que le propriétaire n'a pas connecté l'app Meta, l'état reste
 *     « Non configuré » (jamais un faux réel). Les DEUX pages Facebook officielles
 *     restent séparées (identité + rôle) ; l'agrégat Meta n'est qu'un 2ᵉ niveau.
 *  2. ATTRIBUTION CITADELLE (first-party) — visites/inscriptions/écoutes/progressions
 *     réellement attribuées à facebook|instagram (jamais « meilleure page » sur les likes).
 *
 * Style cockpit (card-royal / card-cinematic / section-label / text-pearl /
 * text-cinematic-gold). Tables larges : overflow-x-auto.
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  CHANNEL_STATE_COLOR,
  CHANNEL_STATE_LABEL_FR,
  type ChannelState,
} from '@/lib/intelligence/channels/types'
import type { SeoPeriodKey } from '@/lib/intelligence/seo/types'

/* ------------------------------- Types (contrat JSON) ------------------------------- */

interface ChannelStatusLite {
  state: ChannelState
  displayName?: string
  reason?: string
  property?: string
  lastSync?: string | null
}
interface PlatformMetrics {
  reach: number
  impressions: number
  interactions: number
  clicks: number
  followers: number
}
interface TopPost {
  id: string
  title: string
  impressions: number
  interactions: number
}
interface PageIdentity {
  pageId: string | null
  pageName: string
  pageRole: string
  url: string
}
interface IgIdentity {
  igUserId: string | null
  username: string
  role: string
  url: string
}
interface PageData {
  identity: PageIdentity
  status: ChannelStatusLite
  metrics: PlatformMetrics | null
  topPosts: TopPost[]
}
interface IgData {
  identity: IgIdentity
  status: ChannelStatusLite
  metrics: PlatformMetrics | null
  topPosts: TopPost[]
}
interface Counts {
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
}
interface CampaignRow extends Counts {
  campaign: string | null
}
interface SourceAttribution extends Counts {
  source: 'facebook' | 'instagram'
  campaigns: CampaignRow[]
}
interface MetaPayload {
  generatedAt: string
  period: { key: SeoPeriodKey; from: string; to: string }
  platform: {
    facebookStatus: ChannelStatusLite
    instagramStatus: ChannelStatusLite
    facebook: PlatformMetrics | null
    instagram: PlatformMetrics | null
    facebookPages: { citadelle: PageData; chapelle: PageData }
    instagramAccount: IgData
  }
  attribution: {
    demoMode: boolean
    hasData: boolean
    facebook: SourceAttribution
    instagram: SourceAttribution
    facebookPageSplit: { citadelle: Counts; chapelle: Counts; indeterminee: Counts }
    totals: Counts
  }
  attributionError?: string
}

const PERIODS: ReadonlyArray<{ key: SeoPeriodKey; label: string }> = [
  { key: '7d', label: '7 j' },
  { key: '28d', label: '28 j' },
  { key: '90d', label: '90 j' },
]

const ROLE_LABEL: Record<string, string> = {
  digital_acquisition: 'Acquisition numérique',
  institutional: 'Institutionnelle',
  digital_media_acquisition: 'Média / acquisition',
}

const nf = new Intl.NumberFormat('fr-FR')
const fmt = (n: number) => nf.format(n)

/* ------------------------------- Petits composants ------------------------------- */

function StateChip({ status }: { status: ChannelStatusLite }) {
  const color = CHANNEL_STATE_COLOR[status.state]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ borderColor: `${color}55`, color }}
      title={status.reason ?? undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {CHANNEL_STATE_LABEL_FR[status.state]}
    </span>
  )
}

function MetricGrid({ m }: { m: PlatformMetrics }) {
  const cells: ReadonlyArray<[string, number]> = [
    ['Portée', m.reach],
    ['Impressions / vues', m.impressions],
    ['Interactions', m.interactions],
    ['Clics', m.clicks],
    ['Abonnés', m.followers],
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {cells.map(([label, v]) => (
        <div key={label} className="card-cinematic p-3">
          <div className="text-[11px] text-pearl/55">{label}</div>
          <div className="mt-0.5 font-cinzel text-xl font-black text-pearl">{fmt(v)}</div>
        </div>
      ))}
    </div>
  )
}

function PlatformBlock({
  title,
  identity,
  status,
  metrics,
  topPosts,
}: {
  title: string
  identity: { role: string; url: string; publicId: string | null }
  status: ChannelStatusLite
  metrics: PlatformMetrics | null
  topPosts: TopPost[]
}) {
  return (
    <div className="card-royal p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-cinzel text-base font-black text-pearl">{title}</div>
          <div className="text-[11px] text-pearl/45">
            {ROLE_LABEL[identity.role] ?? identity.role}
            {identity.publicId ? <> · id {identity.publicId}</> : null}
            {' · '}
            <a href={identity.url} target="_blank" rel="noreferrer" className="text-cinematic-gold/80 hover:underline">
              page
            </a>
          </div>
        </div>
        <StateChip status={status} />
      </div>
      {metrics ? (
        <>
          <MetricGrid m={metrics} />
          {topPosts.length > 0 && (
            <div className="mt-3">
              <div className="section-label mb-1">Meilleurs contenus</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-pearl/45">
                    <tr>
                      <th className="py-1 pr-4 text-left font-medium">Contenu</th>
                      <th className="py-1 pr-4 text-right font-medium">Impressions</th>
                      <th className="py-1 text-right font-medium">Interactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map((p) => (
                      <tr key={p.id} className="border-t border-pearl/5">
                        <td className="py-1 pr-4 text-pearl/80">{p.title}</td>
                        <td className="py-1 pr-4 text-right text-pearl/70">{fmt(p.impressions)}</td>
                        <td className="py-1 text-right text-pearl/70">{fmt(p.interactions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-pearl/10 bg-pearl/5 px-3 py-4 text-sm text-pearl/50">
          {status.reason ?? 'Données de plateforme indisponibles tant que le connecteur n’est pas configuré.'}
        </div>
      )}
    </div>
  )
}

function AttributionTable({ rows, title }: { rows: ReadonlyArray<CampaignRow>; title: string }) {
  if (rows.length === 0) return null
  return (
    <div className="mt-2">
      <div className="section-label mb-1">{title}</div>
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
            {rows.map((r) => (
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
  )
}

function SplitCard({ label, c }: { label: string; c: Counts }) {
  return (
    <div className="card-cinematic p-3">
      <div className="text-[11px] text-pearl/55">{label}</div>
      <div className="mt-0.5 font-cinzel text-xl font-black text-pearl">{fmt(c.visits)}</div>
      <div className="text-[11px] text-pearl/45">
        {fmt(c.signups)} insc. · {fmt(c.parcoursCompletions)} prog.
      </div>
    </div>
  )
}

/* --------------------------------- Onglet --------------------------------- */

export default function MetaTab() {
  const [period, setPeriod] = useState<SeoPeriodKey>('28d')
  const [data, setData] = useState<MetaPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (key: SeoPeriodKey) => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/intelligence/meta?period=${key}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as MetaPayload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(period)
  }, [period, load])

  const p = data?.platform
  const attr = data?.attribution

  return (
    <div className="mb-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="section-label">Facebook / Instagram — Meta</div>
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

      {p && (
        <>
          {/* MONDE 1 — Métriques plateforme (Meta) */}
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-pearl/40">
            Métriques plateforme (Meta) — read-only
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <PlatformBlock
              title="Facebook — CITADELLE"
              identity={{
                role: p.facebookPages.citadelle.identity.pageRole,
                url: p.facebookPages.citadelle.identity.url,
                publicId: p.facebookPages.citadelle.identity.pageId,
              }}
              status={p.facebookPages.citadelle.status}
              metrics={p.facebookPages.citadelle.metrics}
              topPosts={p.facebookPages.citadelle.topPosts}
            />
            <PlatformBlock
              title="Facebook — CHAPELLE"
              identity={{
                role: p.facebookPages.chapelle.identity.pageRole,
                url: p.facebookPages.chapelle.identity.url,
                publicId: p.facebookPages.chapelle.identity.pageId,
              }}
              status={p.facebookPages.chapelle.status}
              metrics={p.facebookPages.chapelle.metrics}
              topPosts={p.facebookPages.chapelle.topPosts}
            />
          </div>
          <div className="mt-3">
            <PlatformBlock
              title={`Instagram — @${p.instagramAccount.identity.username}`}
              identity={{
                role: p.instagramAccount.identity.role,
                url: p.instagramAccount.identity.url,
                publicId: p.instagramAccount.identity.igUserId,
              }}
              status={p.instagramAccount.status}
              metrics={p.instagramAccount.metrics}
              topPosts={p.instagramAccount.topPosts}
            />
          </div>

          {/* MONDE 2 — Attribution Citadelle (first-party) */}
          <div className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-pearl/40">
            Attribution Citadelle (first-party) — visites & conversions réelles
          </div>
          {attr?.demoMode ? (
            <div className="card-royal p-4 text-sm text-pearl/50">
              Données de démonstration — aucune attribution Meta disponible.
              {data.attributionError ? ' (lecture indisponible)' : ''}
            </div>
          ) : attr && !attr.hasData ? (
            <div className="card-royal p-4 text-sm text-pearl/50">
              Aucune visite attribuée à Facebook/Instagram sur la période.
            </div>
          ) : attr ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="card-royal p-4">
                  <div className="font-cinzel text-base font-black text-pearl">Facebook → Citadelle</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Visites</div>
                      <div className="font-cinzel text-xl font-black text-cinematic-gold">{fmt(attr.facebook.visits)}</div>
                    </div>
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Inscriptions</div>
                      <div className="font-cinzel text-xl font-black text-pearl">{fmt(attr.facebook.signups)}</div>
                    </div>
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Écoutes</div>
                      <div className="font-cinzel text-xl font-black text-pearl">{fmt(attr.facebook.podcastStarts)}</div>
                    </div>
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Progressions</div>
                      <div className="font-cinzel text-xl font-black text-pearl">{fmt(attr.facebook.parcoursCompletions)}</div>
                    </div>
                  </div>
                  <AttributionTable rows={attr.facebook.campaigns} title="Par campagne" />
                </div>

                <div className="card-royal p-4">
                  <div className="font-cinzel text-base font-black text-pearl">Instagram → Citadelle</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Visites</div>
                      <div className="font-cinzel text-xl font-black text-cinematic-gold">{fmt(attr.instagram.visits)}</div>
                    </div>
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Inscriptions</div>
                      <div className="font-cinzel text-xl font-black text-pearl">{fmt(attr.instagram.signups)}</div>
                    </div>
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Écoutes</div>
                      <div className="font-cinzel text-xl font-black text-pearl">{fmt(attr.instagram.podcastStarts)}</div>
                    </div>
                    <div className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">Progressions</div>
                      <div className="font-cinzel text-xl font-black text-pearl">{fmt(attr.instagram.parcoursCompletions)}</div>
                    </div>
                  </div>
                  <AttributionTable rows={attr.instagram.campaigns} title="Par campagne" />
                </div>
              </div>

              {/* Répartition FB Citadelle vs Chapelle (quand l'UTM le permet) */}
              <div className="card-royal p-4">
                <div className="section-label mb-2">Facebook — répartition par page (via UTM)</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <SplitCard label="Page CITADELLE" c={attr.facebookPageSplit.citadelle} />
                  <SplitCard label="Page CHAPELLE" c={attr.facebookPageSplit.chapelle} />
                  <SplitCard label="Page indéterminée" c={attr.facebookPageSplit.indeterminee} />
                </div>
                <p className="mt-2 text-[11px] text-pearl/40">
                  La page d’origine n’est distinguée que lorsque l’UTM (campagne/contenu) porte un marqueur explicite ;
                  sinon la visite reste « indéterminée » — jamais devinée.
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
