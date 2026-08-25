'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Shield, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatMetric } from '@/lib/intelligence/format'
import { SUPPORTED_GOAL_METRICS, type GoalMetricKey, type GoalStatus } from '@/lib/intelligence/goals'

type AdminGoal = {
  id: string
  organizationId: string
  metricKey: GoalMetricKey
  targetValue: number
  periodStart: string
  periodEnd: string
  status: GoalStatus
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

type Payload = {
  ok?: boolean
  data?: {
    organizationId: string
    supportedMetrics: GoalMetricKey[]
    goals: AdminGoal[]
  }
  error?: string
  message?: string
}

const initialForm = {
  metricKey: 'visits' as GoalMetricKey,
  targetValue: 100,
  periodStart: '',
  periodEnd: '',
}

export default function IntelligenceGoalsPage() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/intelligence/goals', { cache: 'no-store' })
      const json = (await res.json()) as Payload
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? json.message ?? `HTTP ${res.status}`)
      }
      setPayload(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function submit() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/intelligence/goals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = (await res.json()) as Payload
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? json.message ?? `HTTP ${res.status}`)
      }
      setMessage('Objectif enregistré.')
      setForm(initialForm)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur d’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  async function archive(id: string) {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/intelligence/goals', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status: 'ARCHIVED' }),
      })
      const json = (await res.json()) as Payload
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? json.message ?? `HTTP ${res.status}`)
      }
      setMessage('Objectif archivé.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur d’archivage')
    } finally {
      setSaving(false)
    }
  }

  const goals = payload?.data?.goals ?? []

  return (
    <div className="min-h-screen bg-abyss pb-16 pt-24">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={
            <>
              Objectifs{' '}
              <span className="text-cinematic-gold">Intelligence · 5C-2</span>
            </>
          }
          description="Objectifs humains explicites, trajectoires déterministes et archivage sans suppression."
          actions={
            <div className="flex items-center gap-2">
              <Link href="/admin/intelligence/performance" className="inline-flex items-center gap-2 rounded-lg border border-pearl/10 bg-pearl/5 px-3 py-2 text-sm text-pearl/75 hover:text-pearl">
                <ArrowLeft className="h-4 w-4" /> Retour performance
              </Link>
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
        {message && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="card-royal p-5">
            <div className="section-label mb-3">Créer un objectif</div>
            <div className="space-y-3">
              <label className="block text-sm text-pearl/70">
                Metric
                <select
                  value={form.metricKey}
                  onChange={(e) => setForm((curr) => ({ ...curr, metricKey: e.target.value as GoalMetricKey }))}
                  className="mt-1 w-full rounded-lg border border-pearl/10 bg-black/20 px-3 py-2 text-pearl outline-none"
                >
                  {SUPPORTED_GOAL_METRICS.map((metric) => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-pearl/70">
                Target
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.targetValue}
                  onChange={(e) => setForm((curr) => ({ ...curr, targetValue: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-pearl/10 bg-black/20 px-3 py-2 text-pearl outline-none"
                />
              </label>
              <label className="block text-sm text-pearl/70">
                Period start
                <input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm((curr) => ({ ...curr, periodStart: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-pearl/10 bg-black/20 px-3 py-2 text-pearl outline-none"
                />
              </label>
              <label className="block text-sm text-pearl/70">
                Period end
                <input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm((curr) => ({ ...curr, periodEnd: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-pearl/10 bg-black/20 px-3 py-2 text-pearl outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-cinematic-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                <Shield className="h-4 w-4" />
                Enregistrer
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="section-label">Objectifs existants</div>
            {goals.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="card-cinematic p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-pearl/85">{goal.metricKey}</div>
                        <div className="mt-1 text-sm text-pearl/60">
                          {formatMetric(goal.targetValue, 'real', 'count')} du {goal.periodStart} au {goal.periodEnd}
                        </div>
                        <div className="mt-1 text-xs text-pearl/45">
                          {goal.status} | créé {goal.createdAt} | mis à jour {goal.updatedAt}
                        </div>
                      </div>
                      {goal.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          onClick={() => void archive(goal.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-pearl/10 px-3 py-2 text-xs text-pearl/70 hover:text-pearl disabled:opacity-60"
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Archiver
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-pearl/45">
                      {goal.createdBy ? `createdBy=${goal.createdBy}` : 'createdBy=—'} |{' '}
                      {goal.updatedBy ? `updatedBy=${goal.updatedBy}` : 'updatedBy=—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-royal p-6 text-sm text-pearl/45">
                Aucun objectif enregistré pour le moment.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
