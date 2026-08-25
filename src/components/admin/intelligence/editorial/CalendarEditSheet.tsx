'use client'

import React, { useState } from 'react'

export type CalendarEditableValues = { date: string; channel: string; notes: string }

type Props = { values: CalendarEditableValues; canWrite?: boolean; onSave?: (values: CalendarEditableValues) => void; onClose?: () => void }

export function CalendarEditSheet({ values, canWrite = false, onSave, onClose }: Props) {
  const [form, setForm] = useState(values)
  return (
    <form className="mt-3 grid gap-3 rounded-lg border border-pearl/10 bg-black/10 p-3 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); onSave?.(form) }}>
      <label className="text-xs text-pearl/60">date<input aria-label="date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded-md border border-pearl/10 bg-black/20 px-2 py-1.5 text-sm text-pearl" disabled={!canWrite} /></label>
      <label className="text-xs text-pearl/60">channel<input aria-label="channel" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} className="mt-1 w-full rounded-md border border-pearl/10 bg-black/20 px-2 py-1.5 text-sm text-pearl" disabled={!canWrite} /></label>
      <label className="text-xs text-pearl/60 sm:col-span-1">notes<textarea aria-label="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 min-h-9 w-full rounded-md border border-pearl/10 bg-black/20 px-2 py-1.5 text-sm text-pearl" disabled={!canWrite} /></label>
      <div className="flex items-end gap-2 sm:col-span-3"><button type="submit" disabled={!canWrite} className="rounded-md bg-cinematic-gold px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40">Enregistrer</button><button type="button" onClick={onClose} className="rounded-md border border-pearl/10 px-3 py-1.5 text-xs text-pearl/65">Fermer</button></div>
    </form>
  )
}
