'use client'
/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Onglet Conversions : tunnel + catégories + attribution par source, à partir
 * d'événements PROUVÉS uniquement (/api/intelligence/conversions).
 *
 * Honnêteté : jamais un taux entre cohortes incompatibles (affiché « Indisponible »
 * + raison), jamais un chiffre inventé. « 0 réel » ≠ « indisponible ».
 * Style cockpit (card-royal / card-cinematic / section-label / text-pearl). Tables
 * larges enveloppées dans overflow-x-auto.
 */

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import InfoTip from '@/components/admin/intelligence/InfoTip'
import { formatMetric } from '@/lib/intelligence/format'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'
import type {
  ConversionAvailability,
  ConversionCategory,
  ConversionsPayload,
  Funnel,
  FunnelRate,
  SourceAttributionResult,
} from '@/lib/intelligence/conversions/types'

type Payload = ConversionsPayload & { error?: string }

const nf = new Intl.NumberFormat('fr-FR')

const AVAIL_META: Record<ConversionAvailability, { label: string; color: string }> = {
  REAL: { label: 'Réel', color: '#4ade80' },
  DEMO: { label: 'Démo', color: '#fbbf24' },
  UNAVAILABLE: { label: 'Indisponible', color: '#9ca3af' },
}

function AvailBadge({ availability }: { availability: ConversionAvailability }) {
  const meta = AVAIL_META[availability]
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: meta.color, border: `1px solid ${meta.color}55` }}
    >
      {meta.label}
    </span>
  )
}

function fmtRate(r: number | null): string {
  return r === null ? '—' : `${(r * 100).toFixed(1)} %`
}

/* ------------------------------- Catégories ------------------------------- */

function CategoryCard({ c }: { c: ConversionCategory }) {
  const meta = AVAIL_META[c.availability]
  return (
    <div className="card-cinematic p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center text-xs text-pearl/55">
          <span>{c.label}</span>
          <InfoTip metricKey={c.metricKey} />
        </div>
        <AvailBadge availability={c.availability} />
      </div>
      {c.availability === 'REAL' ? (
        // REAL : formatMetric affiche « 0 » pour un 0 réel, « — » si la valeur manque (jamais un 0 fabriqué).
        <div className="mt-1 font-cinzel text-2xl font-black text-pearl">
          {formatMetric(c.value ?? null, 'real', 'count')}
        </div>
      ) : (
        <div
          className="mt-1 font-cinzel text-lg font-black text-pearl/40"
          title={c.reason ?? undefined}
          style={{ color: c.availability === 'DEMO' ? '#fbbf24' : undefined }}
        >
          {c.availability === 'DEMO' ? 'Démo' : 'Indisponible'}
        </div>
      )}
      <div className="mt-1 text-[11px] text-pearl/40">{FRESHNESS_LABELS_FR[c.freshness]}</div>
      {c.availability === 'UNAVAILABLE' && c.reason && (
        <div className="mt-1 text-[10px] leading-snug text-pearl/40">{c.reason}</div>
      )}
    </div>
  )
}

/* --------------------------------- Tunnel --------------------------------- */

function RateConnector({ rate }: { rate: FunnelRate }) {
  if (rate.availability === 'REAL') {
    return (
      <div className="flex items-center justify-center py-1 text-[11px] font-semibold text-emerald-400">
        ↓ {fmtRate(rate.rate)}
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center gap-1 py-1 text-[11px] text-pearl/40"
      title={rate.reason ?? undefined}
    >
      ↓ Taux indisponible
      <InfoTip metricKey="conversion_rate" />
    </div>
  )
}

function FunnelView({ funnel }: { funnel: Funnel }) {
  return (
    <div className="mx-auto max-w-xl">
      {funnel.stages.map((s, i) => {
        const meta = AVAIL_META[s.availability]
        return (
          <div key={s.key}>
            <div className="card-royal flex items-center justify-between gap-3 p-4">
              <div className="flex items-center text-sm text-pearl/80">
                <span>{s.label}</span>
                <InfoTip metricKey={s.metricKey} />
              </div>
              <div className="flex items-center gap-3">
                {s.availability === 'REAL' ? (
                  <span className="font-cinzel text-xl font-black text-pearl">
                    {formatMetric(s.value ?? null, 'real', 'count')}
                  </span>
                ) : (
                  <span
                    className="text-sm font-semibold"
                    style={{ color: meta.color }}
                    title={s.reason ?? undefined}
                  >
                    {s.availability === 'DEMO' ? 'Démo' : 'Indisponible'}
                  </span>
                )}
                <AvailBadge availability={s.availability} />
              </div>
            </div>
            {i < funnel.rates.length && <RateConnector rate={funnel.rates[i]} />}
          </div>
        )
      })}
      <p className="mt-3 text-[11px] leading-relaxed text-pearl/40">
        Les taux entre étapes ne sont affichés que lorsque les deux étapes mesurent la même population.
        Ici les cohortes diffèrent (pages vues, personnes, écoutes, complétions) : les taux sont donc
        marqués « indisponibles » plutôt que faussés.
      </p>
    </div>
  )
}

/* --------------------------- Attribution par source --------------------------- */

function SourceTable({ attr }: { attr: SourceAttributionResult }) {
  if (attr.availability === 'DEMO') {
    return (
      <div className="py-8 text-center text-sm text-pearl/50">
        Données de démonstration — aucune attribution réelle.
      </div>
    )
  }
  if (attr.rows.length === 0) {
    return <div className="py-8 text-center text-sm text-pearl/50">Aucune donnée attribuée aujourd’hui.</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-pearl/45">
            <th className="py-2 pr-4 font-medium">
              <span className="inline-flex items-center">Source<InfoTip metricKey="source_attribution" /></span>
            </th>
            <th className="py-2 pr-4 font-medium text-right">Visites</th>
            <th className="py-2 pr-4 font-medium text-right">Inscriptions</th>
            <th className="py-2 pr-4 font-medium text-right">Progressions</th>
            <th className="py-2 font-medium text-right">
              <span className="inline-flex items-center">Conversion<InfoTip metricKey="conversion_rate" /></span>
            </th>
          </tr>
        </thead>
        <tbody>
          {attr.rows.map((r) => (
            <tr key={r.source} className="border-t border-pearl/10">
              <td className="py-2 pr-4 text-pearl/85">{r.label}</td>
              <td className="py-2 pr-4 text-right text-pearl">{nf.format(r.visits)}</td>
              <td className="py-2 pr-4 text-right text-pearl/80">{nf.format(r.signups)}</td>
              <td className="py-2 pr-4 text-right text-pearl/80">{nf.format(r.progressions)}</td>
              <td
                className="py-2 text-right text-pearl/35"
                title={r.conversionReason ?? undefined}
              >
                Indisponible
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[11px] leading-relaxed text-pearl/40">
        Visites / Inscriptions / Progressions = <strong className="text-pearl/60">réel</strong> (source
        first-touch). Colonne « Conversion » = <strong className="text-pearl/60">indisponible</strong> :
        une conversion first-touch peut pointer une session hors fenêtre (cohortes non comparables). Non
        attribué aujourd’hui — inscriptions {attr.unattributed.signups}, progressions{' '}
        {attr.unattributed.progressions}. Nav interne exclue : {attr.internalVisitsExcluded}.
      </div>
    </div>
  )
}

/* --------------------------------- Onglet --------------------------------- */

export default function ConversionsTab() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/intelligence/conversions', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as Payload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mb-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="section-label">Conversions — {data?.period ?? "aujourd'hui"}</div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg bg-pearl/5 px-3 py-1.5 text-sm text-pearl/70 hover:text-pearl"
        >
          <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> Actualiser
        </button>
        {data?.generatedAt && (
          <span className="text-[11px] text-pearl/35">
            maj {new Date(data.generatedAt).toLocaleTimeString('fr-FR')}
          </span>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      {data?.error && !err && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300">
          Lecture des conversions indisponible : source non joignable. Aucune donnée fabriquée n’est affichée.
        </div>
      )}
      {data?.demoMode && !data.error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300">
          Données de démonstration — les valeurs ne sont pas des chiffres de production.
        </div>
      )}

      {!data && !err ? (
        <div className="card-royal p-10 text-center text-sm text-pearl/40">Chargement…</div>
      ) : data ? (
        <div className="space-y-8">
          {/* Catégories */}
          <section>
            <div className="section-label mb-3">Catégories de conversion</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.categories.map((c) => (
                <CategoryCard key={c.key} c={c} />
              ))}
            </div>
          </section>

          {/* Tunnel */}
          <section>
            <div className="section-label mb-3">Tunnel de conversion</div>
            <div className="card-royal p-4">
              <FunnelView funnel={data.funnel} />
            </div>
          </section>

          {/* Attribution par source */}
          <section>
            <div className="section-label mb-3">Attribution par source</div>
            <div className="card-royal p-4">
              <SourceTable attr={data.sourceAttribution} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
