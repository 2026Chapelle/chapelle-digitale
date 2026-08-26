'use client'

import React, { useState } from 'react'
import { CalendarEditSheet, type CalendarEditableValues } from './CalendarEditSheet'

export type CalendarWorkspaceItem = { id: string; title: string; status: 'ACCEPTED' | 'SCHEDULED' | 'COMPLETED'; channel: string; date: string; notes?: string | null; batchId?: string | null; parentRecommendationId?: string | null }

type Props = { item: CalendarWorkspaceItem; canWrite?: boolean; onSave?: (values: CalendarEditableValues) => void }

export function CalendarItemCard({ item, canWrite = false, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  return <article className="card-cinematic p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full border border-cinematic-gold/30 px-2 py-0.5 text-cinematic-gold">{item.status}</span><span className="text-pearl/45">channel: {item.channel}</span></div><h3 className="mt-2 font-medium text-pearl/90">{item.title}</h3><div className="mt-1 text-xs text-pearl/50">date: {item.date}</div><div className="mt-1 text-xs text-pearl/50">notes: {item.notes ?? '—'}</div>{(item.batchId || item.parentRecommendationId) && <div className="mt-1 text-[11px] text-pearl/35">Filiation conservée</div>}</div>
      <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-md border border-pearl/10 px-2.5 py-1.5 text-xs text-pearl/65 hover:text-pearl">{editing ? 'Fermer' : 'Modifier'}</button>
    </div>
    {editing && <CalendarEditSheet values={{ date: item.date, channel: item.channel, notes: item.notes ?? '' }} canWrite={canWrite} onSave={onSave} onClose={() => setEditing(false)} />}
  </article>
}
