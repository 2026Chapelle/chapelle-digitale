'use client'
/**
 * CITADELLE INTELLIGENCE — 5B · Qualité de mesure (Agent 4 · UX)
 *
 * Trois listes FACTUELLES : mesure fiable / partielle / à instrumenter. AUCUN
 * pourcentage synthétique, AUCUNE note A/B/C — seulement des faits et des comptes
 * de couverture (available / partial / gap / total) affichés tels quels.
 */

import { CheckCircle2, AlertCircle, CircleDashed } from 'lucide-react'
import type { DataQualityContext, DataQualityItem } from '@/lib/intelligence/decision/contract'

function QualityList({
  title,
  items,
  color,
  Icon,
  emptyText,
}: {
  title: string
  items: DataQualityItem[]
  color: string
  Icon: typeof CheckCircle2
  emptyText: string
}) {
  return (
    <div className="card-cinematic p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color }} aria-hidden />
        <span className="text-sm font-semibold text-pearl/85">{title}</span>
        <span className="ml-auto font-cinzel text-sm font-black" style={{ color }}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-pearl/40">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={`${it.label}:${i}`} className="border-t border-pearl/10 pt-2 first:border-t-0 first:pt-0">
              <div className="text-[13px] text-pearl/80">{it.label}</div>
              <div className="text-[11px] leading-snug text-pearl/45">{it.detail}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DataQualityPanel({ dataQuality }: { dataQuality: DataQualityContext }) {
  const { reliable, partial, toInstrument, coverage } = dataQuality
  return (
    <section aria-label="Qualité de mesure">
      <div className="section-label mb-3">Qualité de mesure</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <QualityList
          title="Mesure fiable"
          items={reliable}
          color="#4ade80"
          Icon={CheckCircle2}
          emptyText="Aucune source pleinement fiable déclarée."
        />
        <QualityList
          title="Mesure partielle"
          items={partial}
          color="#fbbf24"
          Icon={AlertCircle}
          emptyText="Aucune mesure partielle."
        />
        <QualityList
          title="À instrumenter"
          items={toInstrument}
          color="#f87171"
          Icon={CircleDashed}
          emptyText="Aucune lacune d'instrumentation identifiée."
        />
      </div>
      {/* Comptes de couverture FACTUELS — jamais un pourcentage ni une note. */}
      <p className="mt-3 text-[11px] text-pearl/40">
        Couverture (comptes factuels, sans pourcentage)&nbsp;: {coverage.available} fiable(s) ·{' '}
        {coverage.partial} partielle(s) · {coverage.gap} à instrumenter · sur {coverage.total} au total.
      </p>
    </section>
  )
}
