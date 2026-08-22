'use client'
/** HUB-4 — STUB (chantier 4 remplit). Aide contextuelle ⓘ sur une métrique :
 *  hover/click = définition courte ; renvoie au guide complet. */
export default function InfoTip({ metricKey }: { metricKey: string }) {
  return (
    <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-pearl/30 text-[9px] text-pearl/40" title={metricKey} aria-label={`Aide : ${metricKey}`}>
      i
    </span>
  )
}
