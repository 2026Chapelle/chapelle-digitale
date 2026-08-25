'use client'

import React, { useState } from 'react'
import { EditorialErrorState } from './EditorialErrorState'
import { OpportunityFilterBar } from './OpportunityFilterBar'

type Opportunity = { id: string; title: string; family: string; status?: string; tags?: string[]; evidenceState?: 'REAL' | 'PARTIAL' | 'UNAVAILABLE' }
type ConnectorState = { key: string; truthState: 'REAL' | 'PARTIAL' | 'UNAVAILABLE' }
type Props = { filters: string[]; opportunities: Opportunity[]; connectorStates: ConnectorState[]; canWrite?: boolean }

export function OpportunitiesView({ filters, opportunities, connectorStates }: Props) {
  const [activeFilter, setActiveFilter] = useState('TOUT')
  const visible = opportunities.filter((item) => activeFilter === 'TOUT' || item.family === activeFilter || item.tags?.includes(activeFilter))
  return <section aria-label="Opportunités éditoriales" className="space-y-4"><div><div className="section-label">Bibliothèque secondaire</div><h2 className="mt-1 font-cinzel text-xl font-bold text-pearl">Opportunités</h2></div><OpportunityFilterBar filters={filters} activeFilter={activeFilter} onChange={setActiveFilter} />{connectorStates.some((item) => item.truthState !== 'REAL') && <div className="grid gap-2 sm:grid-cols-2">{connectorStates.filter((item) => item.truthState !== 'REAL').map((item) => <EditorialErrorState key={item.key} kind={item.truthState === 'PARTIAL' ? 'partial-source' : 'connector-unavailable'} detail={`${item.key}: ${item.truthState}. La page reste exploitable.`} compact />)}</div>}{visible.length === 0 ? <EditorialErrorState kind="no-recommendation" /> : <div className="grid gap-3 lg:grid-cols-2">{visible.map((item) => <article key={item.id} className="card-cinematic p-4"><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full border border-cinematic-gold/30 px-2 py-0.5 text-cinematic-gold">{item.family}</span>{item.status && <span className="text-pearl/45">{item.status}</span>}{item.evidenceState && <span className="text-pearl/45">{item.evidenceState}</span>}</div><h3 className="mt-2 font-medium text-pearl/90">{item.title}</h3></article>)}</div>}</section>
}
