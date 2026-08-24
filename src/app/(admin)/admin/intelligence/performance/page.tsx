'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, RefreshCw, Radio, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'
import { formatMetric } from '@/lib/intelligence/format'
import type { GoalTrajectory } from '@/lib/intelligence/goals'
import type {
  PerformanceAlert,
  PerformanceCommandCard,
  PerformanceMetric,
  PerformanceSurfacePayload,
} from '@/lib/intelligence/performance'

type Payload = PerformanceSurfacePayload & { error?: string; goalTrajectories?: GoalTrajectory[] }

const ALERT_TONE: Record<PerformanceAlert['severity'], string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#fbbf24',
  low: '#94a3b8',
  info: '#38bdf8',
}

const CONFIDENCE_TONE = {
  HIGH: '#4ade80',
  MEDIUM: '#fbbf24',
  LOW: '#94a3b8',
  INSUFFICIENT_DATA: '#94a3b8',
} as const

const GOAL_TONE: Record<GoalTrajectory['state'], string> = {
  NO_GOAL: '#64748b',
  NOT_STARTED: '#94a3b8',
  ON_TRACK: '#4ade80',
  OFF_TRACK: '#f59e0b',
  ACHIEVED: '#22c55e',
  MISSED: '#ef4444',
  INSUFFICIENT_DATA: '#94a3b8',
  UNAVAILABLE: '#94a3b8',
}

function valueText(metric: PerformanceMetric) {
  return metric.current.availability === 'REAL'
    ? formatMetric(metric.current.value, 'real', 'count')
    : '—'
}

function MetricCard({ metric }: { metric: PerformanceMetric }) {
  return (
    <div className="card-cinematic p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-pearl/45">{metric.domain === 'citadelle' ? 'Citadelle' : 'Platforme'}</div>
          <div className="font-medium text-pearl/85">{metric.label}</div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ border: `1px solid ${CONFIDENCE_TONE[metric.confidence]}55`, color: CONFIDENCE_TONE[metric.confidence] }}
        >
          {metric.confidence}
        </span>
      </div>
      <div className="mt-2 font-cinzel text-2xl font-black text-white">{valueText(metric)}</div>
      <div className="mt-1 text-[11px] text-pearl/45">
        {metric.previous
          ? `Précédent: ${metric.previous.availability === 'REAL' ? formatMetric(metric.previous.value, 'real', 'count') : '—'}`
          : 'Précédent: —'}
      </div>
      <div className="mt-1 text-[11px] text-pearl/45">
        {metric.baseline
          ? `Baseline: ${metric.baseline.availability === 'REAL' ? formatMetric(metric.baseline.value, 'real', 'count') : '—'}`
          : 'Baseline: —'}
      </div>
      <div className="mt-2 text-[11px] text-pearl/40">{metric.note ?? FRESHNESS_LABELS_FR[metric.freshness]}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-pearl/45">{metric.destinationLabel}</span>
        <Link href={metric.destination} className="inline-flex items-center gap-1 text-[11px] text-cinematic-gold">
          Ouvrir <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

function EvidenceBlock({ metric }: { metric: PerformanceMetric }) {
  return (
    <details className="rounded-xl border border-pearl/10 bg-white/[0.02] p-3">
      <summary className="cursor-pointer list-none text-sm text-pearl/80">
        Preuve et fraîcheur
      </summary>
      <div className="mt-3 space-y-2 text-[12px] text-pearl/50">
        {metric.evidence.map((e, i) => (
            <div key={`${metric.key}:${i}`} className="rounded-lg border border-pearl/10 p-2">
            <div className="flex items-center justify-between gap-3">
              <span>{e.metric}</span>
              <span>{e.source}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3">
              <span>Courant: {e.current.availability === 'REAL' ? formatMetric(e.current.value, 'real', 'count') : '—'}</span>
              {e.previous && (
                <span>Précédent: {e.previous.availability === 'REAL' ? formatMetric(e.previous.value, 'real', 'count') : '—'}</span>
              )}
              {e.baseline && (
                <span>Baseline: {e.baseline.availability === 'REAL' ? formatMetric(e.baseline.value, 'real', 'count') : '—'}</span>
              )}
              <span>{FRESHNESS_LABELS_FR[e.freshness]}</span>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

function AlertCard({ alert }: { alert: PerformanceAlert }) {
  return (
    <div className="card-cinematic p-4" style={{ borderLeft: `2px solid ${ALERT_TONE[alert.severity]}` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-pearl/85">
          <AlertTriangle className="h-4 w-4" style={{ color: ALERT_TONE[alert.severity] }} />
          {alert.title}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-pearl/35">{alert.confidence}</span>
      </div>
      <p className="mt-2 text-sm text-pearl/70">{alert.fact}</p>
      <p className="mt-1 text-xs text-pearl/45">{alert.whyItMatters}</p>
      {alert.action && <p className="mt-2 text-sm text-cinematic-gold">→ {alert.action}</p>}
      <div className="mt-3 flex items-center justify-between text-[11px] text-pearl/45">
        <span>{alert.destinationLabel}</span>
        <Link href={alert.destination} className="inline-flex items-center gap-1 text-cinematic-gold">
          Ouvrir <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

function CommandCard({ card }: { card: PerformanceCommandCard }) {
  return (
    <div className="card-cinematic p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-cinematic-gold/10 px-2.5 py-1 text-[10px] font-semibold text-cinematic-gold">
          <Sparkles className="h-3 w-3" /> Commande #{card.rank}
        </div>
        <span className="text-[10px] text-pearl/35">{card.confidence}</span>
      </div>
      <div className="mt-2 font-semibold text-pearl/85">{card.title}</div>
      <p className="mt-1 text-sm text-pearl/65">{card.summary}</p>
      <p className="mt-1 text-xs text-pearl/45">{card.action}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-pearl/45">
        <span>{card.destinationLabel}</span>
        <Link href={card.destination} className="inline-flex items-center gap-1 text-cinematic-gold">
          Ouvrir <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

function GoalCard({ trajectory }: { trajectory: GoalTrajectory }) {
  const sourceValue =
    trajectory.observedAvailability === 'REAL' && trajectory.observedValue !== null
      ? formatMetric(trajectory.observedValue, 'real', 'count')
      : '—'
  const targetValue = trajectory.targetValue !== null ? formatMetric(trajectory.targetValue, 'real', 'count') : '—'
  const remainingGap = trajectory.remainingGap !== null ? formatMetric(trajectory.remainingGap, 'real', 'count') : '—'
  const elapsedPct = trajectory.elapsedRatio !== null ? `${(trajectory.elapsedRatio * 100).toFixed(1)} %` : '—'
  const progressPct = trajectory.progressRatio !== null ? `${(trajectory.progressRatio * 100).toFixed(1)} %` : '—'
  const pace = trajectory.paceRequired !== null ? `${trajectory.paceRequired.toFixed(2)} / jour UTC` : '—'

  return (
    <div className="card-cinematic p-4" style={{ borderLeft: `2px solid ${GOAL_TONE[trajectory.state]}` }}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-pearl/45">{trajectory.metricKey}</div>
          <div className="font-medium text-pearl/85">
            {trajectory.goalStatus ?? 'Aucun objectif'}
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ border: `1px solid ${GOAL_TONE[trajectory.state]}55`, color: GOAL_TONE[trajectory.state] }}
        >
          {trajectory.state}
        </span>
      </div>
      <div className="mt-2 text-sm text-pearl/70">
        Cible: {targetValue} | Observé: {sourceValue}
      </div>
      <div className="mt-1 text-xs text-pearl/45">
        Période: {trajectory.periodStart ?? '—'} → {trajectory.periodEnd ?? '—'}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-pearl/55 sm:grid-cols-3">
        <div>Gap: {remainingGap}</div>
        <div>Elapsed: {elapsedPct}</div>
        <div>Progression: {progressPct}</div>
        <div>Pace requise: {pace}</div>
        <div>Source: {trajectory.source}</div>
        <div>Fraîcheur: {FRESHNESS_LABELS_FR[trajectory.freshness]}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-pearl/45">
        <span>{trajectory.availability}</span>
        <span>{trajectory.goalId ?? 'NO_GOAL'}</span>
      </div>
    </div>
  )
}

export default function PerformanceIntelligencePage() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/intelligence/performance', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPayload((await res.json()) as Payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const citadelle = payload?.citadelle ?? []
  const platform = payload?.platform ?? []
  const alerts = payload?.alerts ?? []
  const commandCards = payload?.commandCards ?? []

  return (
    <div className="min-h-screen bg-abyss pb-16 pt-24">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={
            <>
              Performance{' '}
              <span className="text-cinematic-gold">Intelligence · 5C</span>
            </>
          }
          description="Évolution déterministe, baselines mobiles, alertes conservatrices et cartes de commande actionnables."
          actions={
            <div className="flex items-center gap-2">
              <Link href="/admin/intelligence/goals" className="inline-flex items-center gap-2 rounded-lg border border-pearl/10 bg-pearl/5 px-3 py-2 text-sm text-pearl/75 hover:text-pearl">
                Objectifs
              </Link>
              {payload?.demoMode && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-300">
                  <Radio className="h-3.5 w-3.5" /> Démo
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

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {payload?.error && !error && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300">
            {payload.error}
          </div>
        )}

        {!payload && !error ? (
          <div className="card-royal p-10 text-center text-sm text-pearl/40">Chargement de la performance…</div>
        ) : (
          <div className="space-y-10">
            <section>
              <div className="section-label mb-3">Objectifs & trajectoires</div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {(payload?.goalTrajectories?.length ?? 0) > 0 ? (
                  payload!.goalTrajectories!.map((trajectory) => (
                    <GoalCard key={trajectory.goalId ?? trajectory.metricKey} trajectory={trajectory} />
                  ))
                ) : (
                  <div className="card-royal p-6 text-sm text-pearl/45">
                    Aucun objectif déclaré. Le lien ci-dessus ouvre l&apos;éditeur d&apos;objectifs.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="section-label mb-3">Citadelle</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {citadelle.map((m) => (
                  <MetricCard key={m.key} metric={m} />
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {citadelle.map((m) => (
                  <EvidenceBlock key={`evidence:${m.key}`} metric={m} />
                ))}
              </div>
            </section>

            <section id="platform">
              <div className="section-label mb-3">Plateforme</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {platform.map((m) => (
                  <MetricCard key={m.key} metric={m} />
                ))}
              </div>
              <p className="mt-3 text-xs text-pearl/40">
                Les métriques plateforme restent séparées des résultats Citadelle. Elles servent de contexte, pas de résultat.
              </p>
            </section>

            <section>
              <div className="section-label mb-3">Alertes actionnables</div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {alerts.length > 0 ? alerts.map((a) => <AlertCard key={a.id} alert={a} />) : (
                  <div className="card-royal p-6 text-sm text-pearl/45">Aucune anomalie conservatrice déterminée.</div>
                )}
              </div>
            </section>

            <section>
              <div className="section-label mb-3">Cartes de commande</div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {commandCards.length > 0 ? commandCards.map((c) => <CommandCard key={c.id} card={c} />) : (
                  <div className="card-royal p-6 text-sm text-pearl/45">
                    Aucune carte prioritaire avec assez de preuves.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
