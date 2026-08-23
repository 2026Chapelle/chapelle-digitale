'use client'
/**
 * CITADELLE INTELLIGENCE — 5B · Couche Décision (Agent 4 · UX)
 *
 * Primitives PARTAGÉES de la surface de décision + révélation « détail à la demande ».
 * Regroupées ici pour garantir un rendu de vérité UNIQUE (jamais un 0 fabriqué) :
 *   - DecisionAvailBadge   : badge de disponibilité (charte cockpit).
 *   - MeasuredValueView    : rend un nombre SEULEMENT si availability==='REAL'.
 *   - MeasuredRateView     : rend un taux SEULEMENT si REAL + rate!==null.
 *   - DecisionDrillDown    : popover accessible (définition/source/période/…).
 *
 * Aucune donnée n'est inventée ici : tout provient des payloads gelés (contract.ts).
 */

import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import { formatMetric } from '@/lib/intelligence/format'
import {
  DECISION_AVAILABILITY_COLOR,
  DECISION_AVAILABILITY_LABEL_FR,
  DECISION_NO_VALUE,
  decisionRendersNumber,
  type DecisionAvailability,
  type MeasuredRate,
  type MeasuredValue,
} from '@/lib/intelligence/decision/contract'

/* ────────────────────────── Badge de disponibilité ────────────────────────── */

export function DecisionAvailBadge({
  availability,
  className = '',
}: {
  availability: DecisionAvailability
  className?: string
}) {
  const color = DECISION_AVAILABILITY_COLOR[availability]
  return (
    <span
      className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + className}
      style={{ color, border: `1px solid ${color}55` }}
    >
      {DECISION_AVAILABILITY_LABEL_FR[availability]}
    </span>
  )
}

/* ─────────────────────────── Rendu d'une valeur ─────────────────────────── */

/**
 * Rend un nombre réel (0 inclus) UNIQUEMENT si availability==='REAL'.
 * Toute autre disponibilité ⇒ « — » + raison en infobulle (jamais un 0 trompeur).
 */
export function MeasuredValueView({
  measured,
  className = '',
}: {
  measured: MeasuredValue
  className?: string
}) {
  if (decisionRendersNumber(measured.availability) && measured.value !== null) {
    return <span className={className}>{formatMetric(measured.value, 'real', 'count')}</span>
  }
  return (
    <span
      className={'text-pearl/40 ' + className}
      title={measured.reason ?? DECISION_AVAILABILITY_LABEL_FR[measured.availability]}
    >
      {DECISION_NO_VALUE}
    </span>
  )
}

/**
 * Rend un taux 0..1 en pourcentage UNIQUEMENT si REAL + rate!==null.
 * Sinon « — » (jamais « 0 % ») + raison en infobulle.
 */
export function MeasuredRateView({
  rate,
  className = '',
}: {
  rate: MeasuredRate
  className?: string
}) {
  if (rate.availability === 'REAL' && rate.rate !== null) {
    return <span className={className}>{`${(rate.rate * 100).toFixed(1)} %`}</span>
  }
  return (
    <span
      className={'text-pearl/40 ' + className}
      title={rate.reason ?? DECISION_AVAILABILITY_LABEL_FR[rate.availability]}
    >
      {DECISION_NO_VALUE}
    </span>
  )
}

/* ───────────────────────── Détail « à la demande » ───────────────────────── */

export interface DrillDownField {
  label: string
  value: string
}

/**
 * Bouton ⓘ révélant un détail technique (définition, source, période, disponibilité,
 * règle d'attribution, limites). Accessible (focus clavier, Échap, aria).
 * Le détail n'apparaît QUE sur demande — hiérarchie : jamais dominant.
 */
export default function DecisionDrillDown({
  title,
  fields,
  note,
  align = 'left',
}: {
  title: string
  fields: DrillDownField[]
  note?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  const visible = fields.filter((f) => f.value && f.value.trim().length > 0)
  if (visible.length === 0 && !note) return null

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Détail : ${title}`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-pearl/30 text-pearl/50 transition hover:border-cinematic-gold/60 hover:text-cinematic-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-cinematic-gold"
      >
        <Info className="h-3 w-3" aria-hidden />
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={
            'absolute top-6 z-40 w-72 max-w-[80vw] rounded-lg border border-pearl/15 bg-abyss/95 p-3 text-left text-[11px] leading-relaxed text-pearl/75 shadow-xl backdrop-blur ' +
            (align === 'right' ? 'right-0' : 'left-0')
          }
        >
          <span className="mb-1.5 block font-semibold text-pearl/90">{title}</span>
          <span className="block space-y-1">
            {visible.map((f) => (
              <span key={f.label} className="flex flex-col">
                <span className="text-pearl/40">{f.label}</span>
                <span className="text-pearl/80">{f.value}</span>
              </span>
            ))}
          </span>
          {note && <span className="mt-2 block border-t border-pearl/10 pt-2 text-pearl/50">{note}</span>}
        </span>
      )}
    </span>
  )
}
