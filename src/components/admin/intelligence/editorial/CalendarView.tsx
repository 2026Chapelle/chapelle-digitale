'use client'

import React from 'react'
import { CalendarItemCard, type CalendarWorkspaceItem } from './CalendarItemCard'

type CalendarWindow = { start: string; end: string }
type Props = { window: CalendarWindow; items: Array<CalendarWorkspaceItem | { id: string; title: string; status: string; channel: string; date: string; notes?: string | null }>; canWrite?: boolean; onSave?: (id: string, values: { date: string; channel: string; notes: string }) => void }

export function CalendarView({ window, items, canWrite = false, onSave }: Props) {
  const visible = items.filter((item): item is CalendarWorkspaceItem => (item.status === 'ACCEPTED' || item.status === 'SCHEDULED' || item.status === 'COMPLETED') && item.date >= window.start && item.date <= window.end)
  return <section aria-label="Calendrier éditorial" className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="section-label">30 jours glissants</div><h2 className="mt-1 font-cinzel text-xl font-bold text-pearl">Calendrier éditorial</h2></div><div className="text-xs text-pearl/45">{window.start} → {window.end}</div></div>{visible.length === 0 ? <div className="card-royal p-5 text-sm text-pearl/50">Aucune recommandation acceptée ou planifiée sur cette fenêtre.</div> : <div className="space-y-3">{visible.map((item) => <CalendarItemCard key={item.id} item={item} canWrite={canWrite} onSave={(values) => onSave?.(item.id, values)} />)}</div>}</section>
}
