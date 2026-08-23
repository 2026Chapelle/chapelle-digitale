'use client'
/**
 * CITADELLE INTELLIGENCE — 5B · Funnel Citadelle vertical (Agent 4 · UX)
 *
 * Tunnel de décision (haut → bas). Règles de vérité :
 *   - Une étape non instrumentée (UNAVAILABLE) affiche « Indisponible » + raison,
 *     JAMAIS 0. Un 0 réel (status REAL, value 0) reste affiché « 0 ».
 *   - Le taux inter-étapes n'apparaît que lorsqu'il est REAL ; sinon « — » + raison
 *     (jamais « 0 % »). Aligné sur stages[i] → stages[i+1].
 *   - L'étape de chute principale (primaryDropOffKey) est mise en évidence sobrement.
 *   - Détail (définition/source/période/cohorte) à la demande via drill-down.
 *
 * Responsive : pile verticale compacte, lisible dès 390 px (pas de cartes géantes).
 */

import { ArrowDown, TrendingDown } from 'lucide-react'
import { formatMetric } from '@/lib/intelligence/format'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'
import DecisionDrillDown, { DecisionAvailBadge } from './DecisionDrillDown'
import {
  DECISION_NO_VALUE,
  DECISION_SCOPE_LABEL_FR,
  type CohortUnit,
  type DecisionFunnelPayload,
  type DecisionFunnelRate,
  type DecisionFunnelStage,
} from '@/lib/intelligence/decision/contract'

const COHORT_LABEL_FR: Record<CohortUnit, string> = {
  pageviews: 'Pages vues (événements)',
  new_persons: 'Personnes nouvellement inscrites',
  plays: 'Écoutes (lectures)',
  module_completions: 'Complétions de module',
  composite: 'Agrégat hétérogène (non sommable)',
  unavailable: 'Aucune cohorte fiable',
}

function StageRow({ stage, isDropOff }: { stage: DecisionFunnelStage; isDropOff: boolean }) {
  const isReal = stage.status === 'REAL'
  return (
    <div
      className={
        'card-royal flex items-center justify-between gap-3 p-3.5 sm:p-4 ' +
        (isDropOff ? 'border-l-2 border-l-amber-400/70' : '')
      }
    >
      <div className="min-w-0">
        <div className="flex items-center text-sm text-pearl/85">
          <span className="truncate">{stage.label}</span>
          {isDropOff && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300/90">
              <TrendingDown className="h-3 w-3" aria-hidden /> Chute principale
            </span>
          )}
          <DecisionDrillDown
            title={stage.label}
            fields={[
              { label: 'Définition', value: stage.definition },
              { label: 'Source', value: stage.source },
              { label: 'Cohorte', value: COHORT_LABEL_FR[stage.cohort] },
              { label: 'Fraîcheur', value: FRESHNESS_LABELS_FR[stage.freshness] },
              { label: 'Raison', value: stage.reason ?? '' },
            ]}
          />
        </div>
        <div className="mt-0.5 text-[10px] text-pearl/35">{FRESHNESS_LABELS_FR[stage.freshness]}</div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2.5">
        {isReal ? (
          <span className="font-cinzel text-lg font-black text-white sm:text-xl">
            {formatMetric(stage.value, 'real', 'count')}
          </span>
        ) : (
          <span
            className="text-sm font-semibold text-pearl/40"
            title={stage.reason ?? undefined}
          >
            {stage.status === 'UNAVAILABLE' ? 'Indisponible' : DECISION_NO_VALUE}
          </span>
        )}
        <DecisionAvailBadge availability={stage.status} />
      </div>
    </div>
  )
}

function RateConnector({ rate }: { rate: DecisionFunnelRate | undefined }) {
  if (rate && rate.availability === 'REAL' && rate.rate !== null) {
    return (
      <div className="flex items-center justify-center gap-1 py-1 text-[11px] font-semibold text-emerald-400">
        <ArrowDown className="h-3 w-3" aria-hidden /> {(rate.rate * 100).toFixed(1)} %
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center gap-1 py-1 text-[11px] text-pearl/35"
      title={rate?.reason ?? 'Taux non calculable (cohortes non comparables ou étape indisponible).'}
    >
      <ArrowDown className="h-3 w-3" aria-hidden /> Taux {DECISION_NO_VALUE}
    </div>
  )
}

export default function FunnelCitadelle({ funnel }: { funnel: DecisionFunnelPayload }) {
  // Index des taux par transition consécutive fromKey→toKey.
  const rateByTransition = new Map<string, DecisionFunnelRate>()
  for (const r of funnel.rates) rateByTransition.set(`${r.fromKey}→${r.toKey}`, r)

  if (funnel.error) {
    return (
      <div className="card-royal p-4 text-sm text-amber-300/90">
        Funnel indisponible : {funnel.error}. Aucune valeur fabriquée n&rsquo;est affichée.
      </div>
    )
  }

  return (
    <div className="card-royal p-4">
      <div className="mx-auto max-w-xl">
        {funnel.stages.map((s, i) => {
          const next = funnel.stages[i + 1]
          const rate = next ? rateByTransition.get(`${s.key}→${next.key}`) : undefined
          return (
            <div key={s.key}>
              <StageRow stage={s} isDropOff={funnel.primaryDropOffKey === s.key} />
              {next && <RateConnector rate={rate} />}
            </div>
          )
        })}
        <p className="mt-3 text-[11px] leading-relaxed text-pearl/40">
          Portée : {DECISION_SCOPE_LABEL_FR[funnel.scope]} · {funnel.period.label}. Un taux n&rsquo;est affiché
          que si les deux étapes mesurent des cohortes comparables ; sinon il est marqué «&nbsp;{DECISION_NO_VALUE}&nbsp;»
          plutôt que faussé. Une étape non instrumentée reste «&nbsp;Indisponible&nbsp;», jamais 0.
        </p>
      </div>
    </div>
  )
}
