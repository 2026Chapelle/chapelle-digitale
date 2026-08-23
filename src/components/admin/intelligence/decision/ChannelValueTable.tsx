'use client'
/**
 * CITADELLE INTELLIGENCE — 5B · Acquisition / valeur par canal (Agent 4 · UX)
 *
 * Sépare VISUELLEMENT « IMPACT CITADELLE » (colonnes first-party) du « CONTEXTE
 * PLATEFORME » (portée d'audience) — jamais fusionnés dans un score composite.
 * Règles de vérité :
 *   - Nombres seulement si REAL (sinon « — » + raison) ; taux jamais « 0 % ».
 *   - Contexte plateforme honnête : Meta indisponible affiché « connexion en attente »,
 *     jamais masqué ni transformé en résultat Citadelle.
 *   - Un classement available===false montre sa raison, jamais un faux classement.
 *
 * Responsive : la table large défile dans overflow-x-auto (jamais de casse du body).
 */

import { Layers, Globe2 } from 'lucide-react'
import DecisionDrillDown, { DecisionAvailBadge, MeasuredValueView, MeasuredRateView } from './DecisionDrillDown'
import {
  DECISION_NO_VALUE,
  type ChannelCitadelleValue,
  type ChannelPlatformContext,
  type ChannelRanking,
  type ConfidenceState,
  type DecisionChannelsPayload,
} from '@/lib/intelligence/decision/contract'

const nf = new Intl.NumberFormat('fr-FR')

const CONFIDENCE_SHORT_FR: Record<ConfidenceState, string> = {
  HIGH: 'Élevée',
  MEDIUM: 'Moyenne',
  LOW: 'Faible',
  INSUFFICIENT_DATA: 'Insuffisant',
}
const isWeak = (c: ConfidenceState) => c === 'LOW' || c === 'INSUFFICIENT_DATA'

/* ─────────────────────── IMPACT CITADELLE (first-party) ─────────────────────── */

function CitadelleTable({
  rows,
  unattributed,
  internalVisitsExcluded,
}: {
  rows: ChannelCitadelleValue[]
  unattributed: DecisionChannelsPayload['unattributed']
  internalVisitsExcluded: number
}) {
  if (rows.length === 0) {
    return <div className="py-6 text-center text-sm text-pearl/45">Aucun canal attribué sur la période.</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-xs text-pearl/45">
            <th className="py-2 pr-4 font-medium">Canal</th>
            <th className="py-2 pr-4 text-right font-medium">Visites</th>
            <th className="py-2 pr-4 text-right font-medium">Inscriptions</th>
            <th className="py-2 pr-4 text-right font-medium">Visite → inscr.</th>
            <th className="py-2 pr-4 text-right font-medium">Engagement</th>
            <th className="py-2 pr-4 text-right font-medium">Parcours</th>
            <th className="py-2 pr-4 text-right font-medium">Conversions</th>
            <th className="py-2 text-right font-medium">Fiabilité</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.source} className="border-t border-pearl/10">
              <td className="py-2 pr-4 text-pearl/85">{r.label}</td>
              <td className="py-2 pr-4 text-right font-cinzel font-black text-pearl">
                <MeasuredValueView measured={r.citadelleVisits} />
              </td>
              <td className="py-2 pr-4 text-right text-pearl/80">
                <MeasuredValueView measured={r.attributedSignups} />
              </td>
              <td className="py-2 pr-4 text-right text-pearl/80">
                <MeasuredRateView rate={r.visitToSignupRate} />
              </td>
              <td className="py-2 pr-4 text-right text-pearl/80">
                <MeasuredValueView measured={r.engagement} />
              </td>
              <td className="py-2 pr-4 text-right text-pearl/80">
                <MeasuredValueView measured={r.parcours} />
              </td>
              <td className="py-2 pr-4 text-right text-pearl/80">
                <MeasuredValueView measured={r.conversions} />
              </td>
              <td className="py-2 text-right">
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                    (isWeak(r.confidence) ? 'bg-pearl/5 text-pearl/45' : 'bg-emerald-400/10 text-emerald-300/80')
                  }
                >
                  {CONFIDENCE_SHORT_FR[r.confidence]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[11px] leading-relaxed text-pearl/40">
        Visites = <strong className="text-pearl/60">réel</strong> (source first-touch de la session). Les colonnes
        vides affichent «&nbsp;{DECISION_NO_VALUE}&nbsp;» (mesure indisponible ou partielle), jamais un 0 fabriqué.
        Non attribué sur la période — inscriptions {nf.format(unattributed.signups)}, progressions{' '}
        {nf.format(unattributed.progressions)}. Navigation interne exclue&nbsp;: {nf.format(internalVisitsExcluded)}.
      </div>
    </div>
  )
}

/* ─────────────────────────── CONTEXTE PLATEFORME ─────────────────────────── */

function PlatformCard({ ctx }: { ctx: ChannelPlatformContext }) {
  const unavailable = ctx.availability === 'UNAVAILABLE'
  return (
    <div className="card-cinematic p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-pearl/85">{ctx.label}</span>
        <DecisionAvailBadge availability={ctx.availability} />
      </div>
      {/* Fenêtre réelle de la plateforme (ex. 28 j) : jamais lue comme « aujourd'hui ». */}
      {ctx.periodLabel && (
        <div className="mb-2 inline-flex rounded bg-pearl/5 px-1.5 py-0.5 text-[10px] font-medium text-pearl/45">
          {ctx.periodLabel}
        </div>
      )}
      {unavailable ? (
        <div className="text-[12px] text-pearl/45">{ctx.reason ?? 'Connexion en attente — portée non mesurable.'}</div>
      ) : ctx.metrics.length === 0 ? (
        <div className="text-[12px] text-pearl/45">Aucune métrique de portée sur la période.</div>
      ) : (
        <div className="space-y-1.5">
          {ctx.metrics.map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-pearl/50">{m.label}</span>
              <span className="font-cinzel font-black text-pearl/85">
                <MeasuredValueView measured={m.value} />
                {m.unit && m.value.availability === 'REAL' && m.value.value !== null && (
                  <span className="ml-1 text-[10px] font-normal text-pearl/40">{m.unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────── Classements ──────────────────────────────── */

function RankingCard({ ranking }: { ranking: ChannelRanking }) {
  return (
    <div className="card-cinematic p-4">
      <div className="mb-1 flex items-center text-sm font-medium text-pearl/85">
        {ranking.label}
        <DecisionDrillDown
          title={ranking.label}
          align="right"
          fields={[
            { label: 'Métrique', value: ranking.metricLabel },
            { label: 'Période', value: ranking.period.label },
          ]}
        />
      </div>
      {!ranking.available ? (
        <div className="text-[12px] text-pearl/45">
          Classement indisponible&nbsp;: {ranking.reason ?? 'données non comparables.'}
        </div>
      ) : ranking.rows.length === 0 ? (
        <div className="text-[12px] text-pearl/45">Aucun canal classable sur la période.</div>
      ) : (
        <ol className="space-y-1">
          {ranking.rows.map((row, i) => (
            <li key={row.source} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-pearl/70">
                <span className="mr-1.5 text-pearl/35">{i + 1}.</span>
                {row.label}
              </span>
              <span className="font-cinzel font-black text-pearl/85">
                {row.value === null ? DECISION_NO_VALUE : nf.format(row.value)}
                {row.sampleSize != null && (
                  <span className="ml-1 text-[10px] font-normal text-pearl/35">(n={nf.format(row.sampleSize)})</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ─────────────────────────────────── Section ─────────────────────────────────── */

export default function ChannelValueTable({ channels }: { channels: DecisionChannelsPayload }) {
  if (channels.error) {
    return (
      <div className="card-royal p-4 text-sm text-amber-300/90">
        Valeur par canal indisponible : {channels.error}. Aucune donnée fabriquée n&rsquo;est affichée.
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {/* IMPACT CITADELLE */}
      <div className="card-royal p-4">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-cinematic-gold" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wide text-cinematic-gold">Impact Citadelle</span>
          <span className="text-[10px] text-pearl/35">résultats first-party · {channels.period.label}</span>
        </div>
        <CitadelleTable
          rows={channels.citadelle}
          unattributed={channels.unattributed}
          internalVisitsExcluded={channels.internalVisitsExcluded}
        />
      </div>

      {/* CONTEXTE PLATEFORME — visuellement distinct */}
      {channels.platformContext.length > 0 && (
        <div className="rounded-xl border border-dashed border-pearl/15 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-pearl/50" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wide text-pearl/55">Contexte plateforme</span>
            <span className="text-[10px] text-pearl/35">portée d&rsquo;audience — n&rsquo;est PAS un résultat Citadelle</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {channels.platformContext.map((ctx) => (
              <PlatformCard key={ctx.channel} ctx={ctx} />
            ))}
          </div>
        </div>
      )}

      {/* Classements nommés */}
      {channels.rankings.length > 0 && (
        <div>
          <div className="section-label mb-3">Classements (nommés, jamais un « meilleur canal » global)</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {channels.rankings.map((r) => (
              <RankingCard key={r.key} ranking={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
