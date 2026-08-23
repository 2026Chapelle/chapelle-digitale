'use client'
/**
 * CITADELLE INTELLIGENCE — 5B · Onglet « Décision » (Agent 4 · UX · orchestrateur)
 *
 * Récupère GET /api/intelligence/decision (no-store) et rend la SURFACE DE DÉCISION
 * dans une hiérarchie stricte (focale = « À comprendre aujourd'hui ») :
 *   1. En-tête compact  : maj · période · portée Citadelle · badge Démo.
 *   2. À comprendre aujourd'hui (focal)  — DecisionSummary.
 *   3. Funnel Citadelle                  — FunnelCitadelle.
 *   4. Acquisition / valeur par canal    — ChannelValueTable (+ contexte plateforme).
 *   5. Qualité de mesure                 — DataQualityPanel.
 *   6. Détail technique à la demande      — drill-downs (dans chaque bloc).
 *
 * Rend PUREMENT depuis la réponse API. États loading / erreur / démo / vide gérés
 * proprement. Aucune donnée fabriquée : l'agrégateur (superviseur) fournit le réel.
 */

import { useEffect, useState } from 'react'
import { RefreshCw, Radio, Clock, MapPin } from 'lucide-react'
import { DEMO_BADGE_FR } from '@/lib/intelligence/core/demo'
import DecisionSummary from './DecisionSummary'
import FunnelCitadelle from './FunnelCitadelle'
import ChannelValueTable from './ChannelValueTable'
import DataQualityPanel from './DataQualityPanel'
import { DECISION_SCOPE_LABEL_FR, type DecisionSurfacePayload } from '@/lib/intelligence/decision/contract'

type Payload = DecisionSurfacePayload & { error?: string }

export default function DecisionTab() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/intelligence/decision', { cache: 'no-store' })
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
      {/* 1) En-tête compact : statut / date / portée */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="section-label">Décision — Citadelle</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pearl/40">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden /> {DECISION_SCOPE_LABEL_FR[data?.scope ?? 'citadelle']}
          </span>
          {data?.period?.label && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden /> {data.period.label}
            </span>
          )}
          {data?.generatedAt && (
            <span>maj {new Date(data.generatedAt).toLocaleTimeString('fr-FR')}</span>
          )}
        </div>
        {data?.demoMode && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{ borderColor: '#fbbf24', color: '#fbbf24' }}
          >
            <Radio className="h-3 w-3" aria-hidden /> {DEMO_BADGE_FR}
          </span>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-pearl/5 px-3 py-1.5 text-sm text-pearl/70 hover:text-pearl"
        >
          <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} aria-hidden /> Actualiser
        </button>
      </div>

      {/* Bannières d'état */}
      {err && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      {data?.error && !err && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300">
          Lecture de la surface de décision indisponible : source non joignable. Aucune donnée fabriquée n&rsquo;est affichée.
        </div>
      )}
      {data?.demoMode && !data.error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300">
          Données de démonstration — les valeurs ne sont pas des chiffres de production.
        </div>
      )}

      {!data && !err ? (
        <div className="card-royal p-10 text-center text-sm text-pearl/40">Chargement de la surface de décision…</div>
      ) : data ? (
        <div className="space-y-10">
          {/* 2) FOCALE — À comprendre aujourd'hui */}
          <DecisionSummary payload={data.signals} />

          {/* 3) Funnel Citadelle */}
          <section aria-label="Funnel Citadelle">
            <div className="section-label mb-3">Funnel Citadelle</div>
            <FunnelCitadelle funnel={data.funnel} />
          </section>

          {/* 4-5) Acquisition / valeur par canal (+ contexte plateforme) */}
          <section aria-label="Acquisition et valeur par canal">
            <div className="section-label mb-3">Acquisition / valeur par canal</div>
            <ChannelValueTable channels={data.channels} />
          </section>

          {/* 6) Qualité de mesure */}
          <DataQualityPanel dataQuality={data.dataQuality} />
        </div>
      ) : null}
    </div>
  )
}
