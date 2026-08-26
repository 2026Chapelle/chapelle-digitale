'use client'

import React from 'react'

type Props = { filters: string[]; activeFilter?: string; onChange?: (filter: string) => void }

export function OpportunityFilterBar({ filters, activeFilter = 'TOUT', onChange }: Props) {
  return <div className="flex flex-wrap gap-2" aria-label="Filtres d’opportunités"><button type="button" onClick={() => onChange?.('TOUT')} className={(activeFilter === 'TOUT' ? 'bg-cinematic-gold/15 text-cinematic-gold ' : 'text-pearl/55 ') + 'rounded-md px-2.5 py-1.5 text-xs hover:text-pearl'}>TOUT</button>{filters.map((filter) => <button key={filter} type="button" onClick={() => onChange?.(filter)} className={(activeFilter === filter ? 'bg-cinematic-gold/15 text-cinematic-gold ' : 'text-pearl/55 ') + 'rounded-md px-2.5 py-1.5 text-xs hover:text-pearl'}>{filter}</button>)}</div>
}
