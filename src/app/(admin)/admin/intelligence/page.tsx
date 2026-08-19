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
import {
  Activity,
  BarChart3,
  Facebook,
  Gauge,
  Layers,
  MessageCircle,
  MousePointerClick,
  Radio,
  RefreshCw,
  Search,
  Youtube,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { coverageSummary, eventsByAvailability } from '@/lib/intelligence/core/event-contract'
import { DEMO_BADGE_FR } from '@/lib/intelligence/core/demo'
import { FRESHNESS_LABELS_FR, FRESHNESS_LEVELS } from '@/lib/intelligence/types/freshness'
import { CONNECTOR_DESCRIPTORS } from '@/lib/intelligence/connectors/registry'
import type { ConnectorId } from '@/lib/intelligence/connectors/types'
import type { MetricAvailability, OverviewMetric, OverviewResult } from '@/lib/intelligence/metrics/overview'

const TABS = [
  { id: 'apercu', label: 'Vue générale', icon: Gauge },
  { id: 'temps-reel', label: 'Temps réel', icon: Activity },
  { id: 'acquisition', label: 'Acquisition', icon: MousePointerClick },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'contenus', label: 'Contenus', icon: Layers },
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
      ) : (
        <div className="font-cinzel text-2xl font-black" style={{ color: m.availability === 'demo' ? '#fbbf24' : '#fff' }}>
          {(m.envelope?.value ?? 0).toLocaleString('fr-FR')}
        </div>
      )}
      {m.envelope && (
        <div className="mt-1 text-[11px] text-pearl/40">{FRESHNESS_LABELS_FR[m.envelope.freshness]}</div>
      )}
    </div>
  )
}

export default function IntelligenceHubPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('apercu')
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const coverage = useMemo(() => coverageSummary(), [])
  const connectorIds = Object.keys(CONNECTOR_DESCRIPTORS) as ConnectorId[]

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

  useEffect(() => {
    void load()
  }, [])

  const isDemo = overview?.demoMode ?? false

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={
            <>
              Intelligence <span className="text-cinematic-gold">&amp; Acquisition</span>
            </>
          }
          description="Cockpit SEO · Audience · Acquisition · Contenu · Conversion. HUB-1 : premières métriques first-party réelles."
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
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-lg bg-pearl/5 px-3 py-2 text-sm text-pearl/70 hover:text-pearl"
              >
                <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> Actualiser
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

        {tab === 'apercu' ? (
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
        ) : (
          <div className="card-royal mb-8 p-6 text-sm text-pearl/50">
            Section <strong className="text-pearl/80">{TABS.find((t) => t.id === tab)?.label}</strong> — en
            construction (HUB-1 se concentre d’abord sur la Vue générale first-party).
          </div>
        )}

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

        <section className="mb-8">
          <div className="section-label mb-3">Niveaux de fraîcheur</div>
          <div className="flex flex-wrap gap-2">
            {FRESHNESS_LEVELS.map((f) => (
              <span key={f} className="rounded-full border border-pearl/15 px-3 py-1 text-xs text-pearl/70">
                {FRESHNESS_LABELS_FR[f]}
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="section-label mb-3">Connecteurs externes (Phase ultérieure — non branchés)</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connectorIds.map((id) => {
              const d = CONNECTOR_DESCRIPTORS[id]
              return (
                <div key={id} className="card-royal p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-pearl">{d.displayName}</span>
                    <span className="rounded-full border border-pearl/20 px-2 py-0.5 text-[11px] text-pearl/50">
                      Non connecté
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-pearl/45">
                    Fraîcheur : {FRESHNESS_LABELS_FR[d.freshness]} · Lecture seule
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
