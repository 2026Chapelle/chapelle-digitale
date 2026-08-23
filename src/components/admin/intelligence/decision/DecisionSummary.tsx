'use client'
/**
 * CITADELLE INTELLIGENCE — 5B · « À comprendre aujourd'hui » (Agent 4 · UX)
 *
 * POINT FOCAL de la surface de décision : ≤5 cartes de signaux PROUVÉS + l'UNIQUE
 * ACTION PRIORITAIRE. Règles de vérité appliquées ici :
 *   - LOW / INSUFFICIENT_DATA ⇒ carte visuellement dégradée (« échantillon
 *     insuffisant »), JAMAIS présentée comme une recommandation confiante.
 *   - L'ACTION PRIORITAIRE apparaît au plus une fois ; si hasActionPriority===false,
 *     on rend EXACTEMENT le texte d'état de succès imposé par le contrat.
 *   - Chaque signal porte sa preuve (evidence), sa source, sa période, sa portée.
 */

import { Sparkles, TrendingUp, TrendingDown, Target, AlertTriangle, Radio, Search, FileText, Gauge, PlugZap } from 'lucide-react'
import DecisionDrillDown, { MeasuredValueView, MeasuredRateView } from './DecisionDrillDown'
import {
  DECISION_SCOPE_LABEL_FR,
  type ConfidenceState,
  type DecisionSignal,
  type DecisionSignalCategory,
  type DecisionSignalsPayload,
  type MeasuredRate,
  type MeasuredValue,
} from '@/lib/intelligence/decision/contract'

/** Texte d'état de succès EXACT imposé par le contrat gelé. */
const NO_ACTION_PRIORITY_FR = 'Aucune action prioritaire déterminée avec suffisamment de données.'

const CATEGORY_ICON: Record<DecisionSignalCategory, typeof Sparkles> = {
  GROWTH: TrendingUp,
  DECLINE: TrendingDown,
  CONVERSION: Target,
  DROP_OFF: AlertTriangle,
  CHANNEL_OPPORTUNITY: Radio,
  SEO_OPPORTUNITY: Search,
  CONTENT_SIGNAL: FileText,
  DATA_QUALITY: Gauge,
  CONNECTOR_STATUS: PlugZap,
}

const CONFIDENCE_LABEL_FR: Record<ConfidenceState, string> = {
  HIGH: 'Confiance élevée',
  MEDIUM: 'Confiance moyenne',
  LOW: 'Confiance faible',
  INSUFFICIENT_DATA: 'Échantillon insuffisant',
}

/** Une confiance LOW/INSUFFICIENT ne peut jamais être présentée comme une reco sûre. */
function isWeak(c: ConfidenceState): boolean {
  return c === 'LOW' || c === 'INSUFFICIENT_DATA'
}

function isRate(m: MeasuredValue | MeasuredRate): m is MeasuredRate {
  return 'rate' in m
}

function EvidenceRow({ metric, measured, source }: DecisionSignal['evidence'][number]) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-pearl/10 py-1.5 text-[11px]">
      <span className="text-pearl/55">
        {metric}
        <span className="ml-1.5 text-pearl/30">· {source}</span>
      </span>
      <span className="font-cinzel font-black text-pearl/85">
        {isRate(measured) ? <MeasuredRateView rate={measured} /> : <MeasuredValueView measured={measured} />}
      </span>
    </div>
  )
}

/* ─────────────────────── ACTION PRIORITAIRE (focale) ─────────────────────── */

function ActionPriorityCard({ signal }: { signal: DecisionSignal }) {
  const Icon = CATEGORY_ICON[signal.category]
  return (
    <div
      className="card-cinematic border-l-2 p-5"
      style={{ borderLeftColor: '#f0c674' }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cinematic-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cinematic-gold">
          <Sparkles className="h-3 w-3" aria-hidden /> Action prioritaire
        </span>
        <span className="text-[10px] text-pearl/35">{DECISION_SCOPE_LABEL_FR[signal.scope]} · {signal.period.label}</span>
      </div>
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 flex-shrink-0 text-cinematic-gold" aria-hidden />
        <div className="min-w-0">
          <div className="flex items-center font-cinzel text-lg font-black text-white">
            {signal.title}
            <DecisionDrillDown
              title={signal.title}
              fields={[
                { label: 'Fait observé', value: signal.fact },
                { label: 'Pourquoi', value: signal.whyItMatters },
                { label: 'Source', value: signal.source },
                { label: 'Période', value: signal.period.label },
                { label: 'Portée', value: DECISION_SCOPE_LABEL_FR[signal.scope] },
                { label: 'Comparaison', value: signal.comparison ?? '' },
                { label: 'Confiance', value: CONFIDENCE_LABEL_FR[signal.confidence] },
              ]}
            />
          </div>
          <p className="mt-1 text-sm text-pearl/75">{signal.fact}</p>
          {signal.action && (
            <p className="mt-2 rounded-lg bg-pearl/5 px-3 py-2 text-sm text-cinematic-gold/90">
              → {signal.action}
            </p>
          )}
          <div className="mt-2">
            {signal.evidence.map((e, i) => (
              <EvidenceRow key={`${e.metric}:${i}`} {...e} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Carte de signal ─────────────────────────── */

function SignalCard({ signal }: { signal: DecisionSignal }) {
  const Icon = CATEGORY_ICON[signal.category]
  const weak = isWeak(signal.confidence)
  return (
    <div
      className={
        'card-cinematic flex flex-col p-4 ' +
        (weak ? 'opacity-70 border border-dashed border-pearl/15' : '')
      }
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-pearl/90">
          <Icon className={'h-4 w-4 flex-shrink-0 ' + (weak ? 'text-pearl/40' : 'text-cinematic-gold/80')} aria-hidden />
          <span>{signal.title}</span>
        </div>
        <span
          className={
            'flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ' +
            (weak ? 'bg-pearl/5 text-pearl/45' : 'bg-emerald-400/10 text-emerald-300/80')
          }
        >
          {weak ? 'Échantillon insuffisant' : CONFIDENCE_LABEL_FR[signal.confidence]}
        </span>
      </div>
      <p className={'text-[13px] leading-snug ' + (weak ? 'text-pearl/50' : 'text-pearl/70')}>{signal.fact}</p>
      <div className="mt-auto flex items-center justify-between pt-2 text-[10px] text-pearl/35">
        <span className="truncate">{signal.source} · {signal.period.label}</span>
        <DecisionDrillDown
          title={signal.title}
          align="right"
          fields={[
            { label: 'Fait observé', value: signal.fact },
            { label: 'Pourquoi', value: signal.whyItMatters },
            { label: 'Source', value: signal.source },
            { label: 'Période', value: signal.period.label },
            { label: 'Portée', value: DECISION_SCOPE_LABEL_FR[signal.scope] },
            { label: 'Comparaison', value: signal.comparison ?? '' },
            { label: 'Confiance', value: CONFIDENCE_LABEL_FR[signal.confidence] },
          ]}
          note={weak ? "Signal à confiance faible : présenté à titre indicatif, jamais comme une recommandation." : undefined}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────── Section ─────────────────────────────── */

export default function DecisionSummary({ payload }: { payload: DecisionSignalsPayload }) {
  const priorityId = payload.actionPriority.hasActionPriority ? payload.actionPriority.signalId : null
  const priority =
    priorityId != null
      ? payload.signals.find((s) => s.id === priorityId) ?? payload.signals.find((s) => s.isActionPriority) ?? null
      : null
  // Les autres signaux (jamais le prioritaire deux fois), plafonnés à 5 par le contrat.
  const rest = payload.signals.filter((s) => s.id !== priority?.id).slice(0, 5)

  return (
    <section aria-label="À comprendre aujourd'hui">
      <div className="section-label mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cinematic-gold" aria-hidden />
        À comprendre aujourd&rsquo;hui
      </div>

      {/* Action prioritaire OU état de succès exact */}
      {priority ? (
        <ActionPriorityCard signal={priority} />
      ) : (
        <div className="card-royal border-l-2 border-l-pearl/20 p-4 text-sm text-pearl/60">
          {NO_ACTION_PRIORITY_FR}
        </div>
      )}

      {/* Autres signaux */}
      {rest.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      ) : (
        !priority && (
          <p className="mt-4 text-sm text-pearl/45">
            Aucun signal déterministe sur la période — les sources sont connectées mais rien ne se démarque
            avec assez de preuves.
          </p>
        )
      )}
    </section>
  )
}
