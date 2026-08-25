import React from 'react'

export type EditorialEvidence = {
  source?: string | null
  reference?: string | null
  observedSignal?: string | null
  availability?: 'REAL' | 'PARTIAL' | 'UNAVAILABLE' | 'EDITORIAL_RECOMMENDATION'
  timestamp?: string | null
  rationale?: string | null
  priorityReason?: string | null
}

type Props = { evidence?: EditorialEvidence[]; why?: string[] }

export function WhyDrawer({ evidence = [], why = [] }: Props) {
  return (
    <details className="mt-3 rounded-lg border border-pearl/10 bg-black/10">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-cinematic-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-cinematic-gold">
        Pourquoi ?
      </summary>
      <div className="space-y-3 border-t border-pearl/10 px-3 py-3 text-xs text-pearl/65">
        {why.length > 0 && <ul className="list-disc space-y-1 pl-4">{why.map((item) => <li key={item}>{item}</li>)}</ul>}
        {evidence.length > 0 ? evidence.map((item, index) => (
          <div key={`${item.source ?? 'source'}-${index}`} className="space-y-1">
            <div className="flex flex-wrap gap-2">
              <span className="font-medium text-pearl/85">{item.source ?? 'Source non précisée'}</span>
              {item.availability && <span className="rounded-full border border-pearl/15 px-2 py-0.5">{item.availability}</span>}
              <span className="rounded-full border border-cinematic-gold/30 px-2 py-0.5 text-cinematic-gold">EDITORIAL_RECOMMENDATION</span>
            </div>
            {item.reference && <div>Référence&nbsp;: {item.reference}</div>}
            {item.observedSignal && <div>Signal observé&nbsp;: {item.observedSignal}</div>}
            {item.rationale && <div>Raison&nbsp;: {item.rationale}</div>}
            {item.priorityReason && <div>Priorité&nbsp;: {item.priorityReason}</div>}
            {item.timestamp && <time dateTime={item.timestamp}>Observé le {item.timestamp}</time>}
          </div>
        )) : (
          <div className="text-pearl/45">Aucune preuve source disponible pour le moment. Cette recommandation reste éditoriale.</div>
        )}
      </div>
    </details>
  )
}
