'use client'

/**
 * CITADELLE INTELLIGENCE HUB — Cockpit (HUB-1)
 * Route : /admin/intelligence (protégée par middleware + admin-auth).
 *
 * VUE GÉNÉRALE : vraies métriques first-party via /api/intelligence/overview.
 * Chaque carte est explicitement Réel / Démo / Indisponible — jamais un nombre
 * fictif présenté comme réel. Les sections "Fondation" (contrat) restent visibles.
 *
 * NON câblé dans la navigation admin globale (zone protégée) : accès URL directe.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  BookOpen,
  Compass,
  Facebook,
  Gauge,
  MessageCircle,
  MousePointerClick,
  Radio,
  RefreshCw,
  Search,
  Youtube,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import SeoTab from '@/components/admin/intelligence/seo/SeoTab'
import SourcesStatus from '@/components/admin/intelligence/SourcesStatus'
import FreshnessLegend from '@/components/admin/intelligence/FreshnessLegend'
import GuideDrawer from '@/components/admin/intelligence/GuideDrawer'
import YouTubeTab from '@/components/admin/intelligence/YouTubeTab'
import MetaTab from '@/components/admin/intelligence/MetaTab'
import WhatsAppTab from '@/components/admin/intelligence/WhatsAppTab'
import ConversionsTab from '@/components/admin/intelligence/ConversionsTab'
import DecisionTab from '@/components/admin/intelligence/decision/DecisionTab'
import { coverageSummary } from '@/lib/intelligence/core/event-contract'
import { DEMO_BADGE_FR } from '@/lib/intelligence/core/demo'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'
import { formatMetric } from '@/lib/intelligence/format'
import type { MetricAvailability, OverviewMetric, OverviewResult } from '@/lib/intelligence/metrics/overview'
import type { AcquisitionResult } from '@/lib/intelligence/metrics/acquisition'
import type { CampaignResult } from '@/lib/intelligence/metrics/campaigns'

const TABS = [
  { id: 'decision', label: 'Décision', icon: Compass },
  { id: 'apercu', label: 'Vue générale', icon: Gauge },
  { id: 'acquisition', label: 'Acquisition', icon: MousePointerClick },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'conversions', label: 'Conversions', icon: BarChart3 },
] as const

/** Réponse de l'API = OverviewResult (métriques + états) + un éventuel flag d'erreur. */
type OverviewResponse = OverviewResult & { error?: string }

const AVAIL_META: Record<MetricAvailability, { label: string; color: string }> = {
  real: { label: 'Réel', color: '#4ade80' },
  demo: { label: 'Démo', color: '#fbbf24' },
  unavailable: { label: 'Indisponible', color: '#9ca3af' },
}
const COV_LABEL = { available: 'Disponible', partial: 'Partiel', gap: 'À instrumenter' } as const
const COV_COLOR = { available: '#4ade80', partial: '#fbbf24', gap: '#f87171' } as const

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  google: 'Google / recherche',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  telegram: 'Telegram',
  email: 'E-mail',
  chapelle: 'Chapelle',
  referral: 'Autre site (referral)',
  direct: 'Direct',
  unknown: 'Inconnu',
  other: 'Autre',
}
const labelSource = (s: string) => SOURCE_LABEL[s] ?? s

function AcquisitionTable({ acq }: { acq: AcquisitionResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-pearl/45">
            <th className="py-2 pr-4 font-medium">Source</th>
            <th className="py-2 pr-4 font-medium text-right">Visites</th>
            <th className="py-2 pr-4 font-medium text-right">Inscriptions</th>
            <th className="py-2 pr-4 font-medium text-right">Écoutes podcast</th>
            <th className="py-2 font-medium text-right">Progressions</th>
          </tr>
        </thead>
        <tbody>
          {acq.rows.map((r) => (
            <tr key={r.source} className="border-t border-pearl/10">
              <td className="py-2 pr-4 text-pearl/85">{labelSource(r.source)}</td>
              <td className="py-2 pr-4 text-right text-pearl">{r.visits.toLocaleString('fr-FR')}</td>
              <td className="py-2 pr-4 text-right text-pearl/80">{r.signups.toLocaleString('fr-FR')}</td>
              <td className="py-2 pr-4 text-right text-pearl/80">{r.podcastStarts.toLocaleString('fr-FR')}</td>
              <td className="py-2 text-right text-pearl/80">{r.parcoursCompletions.toLocaleString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[11px] text-pearl/40">
        Visites = <strong className="text-pearl/60">réel</strong> (source first-touch de la session).
        Inscriptions / écoutes / progressions = <strong className="text-pearl/60">partiel</strong> :
        non attribué aujourd’hui — inscriptions {acq.unattributed.signups}, écoutes {acq.unattributed.podcastStarts},
        progressions {acq.unattributed.parcoursCompletions}. Nav interne exclue : {acq.internalVisitsExcluded} visite(s).
      </div>
    </div>
  )
}

function CampaignTable({ camp }: { camp: CampaignResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-xs text-pearl/45">
            <th className="py-2 pr-4 font-medium">Campagne</th>
            <th className="py-2 pr-4 font-medium">Source</th>
            <th className="py-2 pr-4 font-medium text-right">Visites</th>
            <th className="py-2 pr-4 font-medium text-right">Inscriptions</th>
            <th className="py-2 pr-4 font-medium text-right">Écoutes podcast</th>
            <th className="py-2 font-medium text-right">Progressions</th>
          </tr>
        </thead>
        <tbody>
          {camp.rows.map((r) => (
            <tr key={`${r.source}:${r.campaign ?? ''}`} className="border-t border-pearl/10 align-top">
              <td className="py-2 pr-4">
                <div className={r.campaign ? 'text-pearl/85' : 'italic text-pearl/45'}>
                  {r.campaign ?? '— (sans campagne)'}
                </div>
                {r.medium && <div className="text-[11px] text-pearl/40">{r.medium}</div>}
                {r.contents.length > 1 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] text-pearl/40">{r.contents.length} contenus</summary>
                    <div className="mt-1 space-y-0.5">
                      {r.contents.map((c) => (
                        <div key={c.content ?? '∅'} className="flex justify-between gap-4 text-[11px] text-pearl/45">
                          <span>{c.content ?? '(sans contenu)'}</span>
                          <span>{c.visits} v · {c.signups} insc.</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </td>
              <td className="py-2 pr-4 text-pearl/70">{labelSource(r.source)}</td>
              <td className="py-2 pr-4 text-right text-pearl">{r.visits.toLocaleString('fr-FR')}</td>
              <td className="py-2 pr-4 text-right text-pearl/80">{r.signups.toLocaleString('fr-FR')}</td>
              <td className="py-2 pr-4 text-right text-pearl/80">{r.podcastStarts.toLocaleString('fr-FR')}</td>
              <td className="py-2 text-right text-pearl/80">{r.parcoursCompletions.toLocaleString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[11px] text-pearl/40">
        Visites = <strong className="text-pearl/60">réel</strong> (source+campagne first-touch). Conversions =
        <strong className="text-pearl/60"> partiel</strong> : non attribué — inscriptions {camp.unattributed.signups},
        écoutes {camp.unattributed.podcastStarts}, progressions {camp.unattributed.parcoursCompletions}. Nav interne
        exclue : {camp.internalVisitsExcluded}. Pas de taux (cohortes différentes).
      </div>
    </div>
  )
}

function MetricCard({ m }: { m: OverviewMetric }) {
  const meta = AVAIL_META[m.availability]
  return (
    <div className="card-cinematic p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-pearl/55">{m.label}</div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: meta.color, border: `1px solid ${meta.color}55` }}
        >
          {meta.label}
        </span>
      </div>
      {m.availability === 'unavailable' ? (
        <div className="mt-1 font-cinzel text-lg font-black text-pearl/40" title={m.reason}>
          Indisponible
        </div>
      ) : m.availability === 'demo' ? (
        // Démo : valeur d'exemple explicitement badgée (jamais confondue avec du réel).
        <div className="font-cinzel text-2xl font-black" style={{ color: '#fbbf24' }}>
          {(m.envelope?.value ?? 0).toLocaleString('fr-FR')}
        </div>
      ) : (
        // Réel : formatMetric garantit « 0 » pour un 0 réel et « — » si la valeur manque
        // (jamais un 0 fabriqué à partir d'une valeur absente).
        <div className="font-cinzel text-2xl font-black text-white">
          {formatMetric(m.envelope?.value ?? null, 'real', 'count')}
        </div>
      )}
      {m.envelope && (
        <div className="mt-1 text-[11px] text-pearl/40">{FRESHNESS_LABELS_FR[m.envelope.freshness]}</div>
      )}
    </div>
  )
}

export default function IntelligenceHubPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('decision')
  const [guideOpen, setGuideOpen] = useState(false)
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [acq, setAcq] = useState<(AcquisitionResult & { error?: string }) | null>(null)
  const [acqLoading, setAcqLoading] = useState(false)
  const [acqErr, setAcqErr] = useState<string | null>(null)
  const [acqView, setAcqView] = useState<'source' | 'campaign'>('source')
  const [camp, setCamp] = useState<(CampaignResult & { error?: string }) | null>(null)
  const [campLoading, setCampLoading] = useState(false)
  const [campErr, setCampErr] = useState<string | null>(null)
  const coverage = useMemo(() => coverageSummary(), [])

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/intelligence/overview', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOverview((await res.json()) as OverviewResponse)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  async function loadAcq() {
    setAcqLoading(true)
    setAcqErr(null)
    try {
      const res = await fetch('/api/intelligence/acquisition', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAcq((await res.json()) as AcquisitionResult & { error?: string })
    } catch (e) {
      setAcqErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setAcqLoading(false)
    }
  }

  async function loadCampaigns() {
    setCampLoading(true)
    setCampErr(null)
    try {
      const res = await fetch('/api/intelligence/campaigns', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCamp((await res.json()) as CampaignResult & { error?: string })
    } catch (e) {
      setCampErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setCampLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // Chargement paresseux de l'acquisition à l'ouverture de l'onglet.
  useEffect(() => {
    if (tab === 'acquisition' && !acq && !acqLoading) void loadAcq()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Chargement paresseux des campagnes à l'ouverture de la sous-vue.
  useEffect(() => {
    if (tab === 'acquisition' && acqView === 'campaign' && !camp && !campLoading) void loadCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, acqView])

  function refresh() {
    if (tab === 'acquisition') {
      if (acqView === 'campaign') void loadCampaigns()
      else void loadAcq()
    } else void load()
  }

  const acqDemo = acqView === 'campaign' ? camp?.demoMode : acq?.demoMode
  const isDemo = (tab === 'acquisition' ? acqDemo : overview?.demoMode) ?? false
  const busy = tab === 'acquisition' ? (acqView === 'campaign' ? campLoading : acqLoading) : loading

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={
            <>
              Cockpit{' '}
              <span className="text-cinematic-gold">
                SEO · Audience · Acquisition · Contenu · Conversion
              </span>
            </>
          }
          description="Comprendre d'où vient l'audience, ce qu'elle fait et ce qui la conduit à progresser dans Citadelle."
          actions={
            <div className="flex items-center gap-2">
              {isDemo && (
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                  style={{ borderColor: '#fbbf24', color: '#fbbf24' }}
                >
                  <Radio className="h-3.5 w-3.5" /> {DEMO_BADGE_FR}
                </span>
              )}
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-pearl/5 px-3 py-2 text-sm text-pearl/70 hover:text-pearl"
              >
                <BookOpen className="h-4 w-4" /> Comprendre ces données
              </button>
              <Link
                href="/admin/intelligence/editorial"
                className="inline-flex items-center gap-2 rounded-lg bg-cinematic-gold px-3 py-2 text-sm font-semibold text-black hover:bg-cinematic-gold/90"
              >
                Copilote éditorial
              </Link>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-lg bg-pearl/5 px-3 py-2 text-sm text-pearl/70 hover:text-pearl"
              >
                <RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} /> Actualiser
              </button>
            </div>
          }
        />

        {/* Onglets */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ' +
                  (active ? 'bg-cinematic-gold/15 text-cinematic-gold' : 'text-pearl/55 hover:text-pearl hover:bg-pearl/5')
                }
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'decision' ? (
          <DecisionTab />
        ) : tab === 'apercu' ? (
          <>
            <section className="mb-4">
              <div className="section-label mb-3">
                Vue générale — aujourd’hui
                {overview?.generatedAt && (
                  <span className="ml-2 text-[11px] font-normal text-pearl/35">
                    maj {new Date(overview.generatedAt).toLocaleTimeString('fr-FR')}
                  </span>
                )}
              </div>
              {err && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
                  {err}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {(overview?.metrics ?? []).map((m) => (
                  <MetricCard key={m.key} m={m} />
                ))}
                {!overview && !err && (
                  <div className="col-span-full py-8 text-center text-sm text-pearl/40">Chargement…</div>
                )}
              </div>
            </section>

            <div className="card-royal mb-8 border-l-2 p-3 text-xs text-pearl/55" style={{ borderLeftColor: '#fbbf24' }}>
              <strong className="text-pearl/80">FIRST-PARTY TRUTH.</strong> Seules les métriques
              réellement prouvées sont affichées. « Connexions » et « Lectures vidéo » sont marquées{' '}
              <em>Indisponible</em> (pas de source fiable), jamais estimées.
            </div>
          </>
        ) : tab === 'acquisition' ? (
          <section className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="section-label">Acquisition — aujourd’hui</div>
              <div className="inline-flex rounded-lg bg-pearl/5 p-0.5 text-xs">
                {(['source', 'campaign'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAcqView(v)}
                    className={
                      'rounded-md px-3 py-1 font-medium transition ' +
                      (acqView === v ? 'bg-cinematic-gold/15 text-cinematic-gold' : 'text-pearl/55 hover:text-pearl')
                    }
                  >
                    {v === 'source' ? 'Par source' : 'Par campagne'}
                  </button>
                ))}
              </div>
            </div>

            {acqView === 'source' ? (
              <div className="card-royal p-4">
                {acqErr && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">{acqErr}</div>}
                {!acq && !acqErr ? (
                  <div className="py-8 text-center text-sm text-pearl/40">Chargement…</div>
                ) : acq?.demoMode ? (
                  <div className="py-8 text-center text-sm text-pearl/50">Données de démonstration — aucune donnée d’acquisition attribuée.</div>
                ) : acq && !acq.hasData ? (
                  <div className="py-8 text-center text-sm text-pearl/50">Aucune donnée attribuée aujourd’hui.</div>
                ) : acq ? (
                  <AcquisitionTable acq={acq} />
                ) : null}
              </div>
            ) : (
              <div className="card-royal p-4">
                {campErr && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">{campErr}</div>}
                {!camp && !campErr ? (
                  <div className="py-8 text-center text-sm text-pearl/40">Chargement…</div>
                ) : camp?.demoMode ? (
                  <div className="py-8 text-center text-sm text-pearl/50">Données de démonstration — aucune campagne attribuée.</div>
                ) : camp && !camp.hasData ? (
                  <div className="py-8 text-center text-sm text-pearl/50">Aucune donnée de campagne disponible.</div>
                ) : camp ? (
                  <CampaignTable camp={camp} />
                ) : null}
              </div>
            )}
          </section>
        ) : tab === 'seo' ? (
          <SeoTab />
        ) : tab === 'youtube' ? (
          <YouTubeTab />
        ) : tab === 'facebook' ? (
          <MetaTab />
        ) : tab === 'whatsapp' ? (
          <WhatsAppTab />
        ) : tab === 'conversions' ? (
          <ConversionsTab />
        ) : null}

        {/* ---- État de la fondation (contrat Phase 0) ---- */}
        <section className="mb-8">
          <div className="section-label mb-3">Fondation — couverture des événements first-party</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['available', 'partial', 'gap'] as const).map((k) => (
              <div key={k} className="card-cinematic p-4">
                <div className="text-xs text-pearl/55">{COV_LABEL[k]}</div>
                <div className="font-cinzel text-2xl font-black" style={{ color: COV_COLOR[k] }}>
                  {coverage[k]}
                </div>
              </div>
            ))}
            <div className="card-cinematic p-4">
              <div className="text-xs text-pearl/55">Total canonique</div>
              <div className="font-cinzel text-2xl font-black text-pearl">{coverage.total}</div>
            </div>
          </div>
        </section>

        {/* ---- Sources de données & connexions (état réel dynamique) ---- */}
        <section className="mb-8">
          <div className="section-label mb-3">Sources de données &amp; connexions</div>
          <SourcesStatus />
        </section>

        {/* ---- Fraîcheur des données ---- */}
        <section>
          <div className="section-label mb-3">Fraîcheur des données</div>
          <FreshnessLegend />
        </section>
      </div>

      <GuideDrawer open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
