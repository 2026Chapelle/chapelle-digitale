'use client'

import { useEffect, useState } from 'react'

type Resource = { id: string; resourceType: 'video' | 'pdf'; sessionType: 'morning' | 'evening' | null; title: string; scheduledTime: string | null; url: string | null; isPrivate: boolean }
type ResourceSlot = { key: 'morning-video' | 'evening-video' | 'day-pdf'; label: string; resources: Resource[] }

export function buildResourceSlots(resources: Resource[]): ResourceSlot[] {
  const available = resources.filter((resource) => resource.resourceType === 'pdf' ? resource.isPrivate || Boolean(resource.url) : Boolean(resource.url))
  return [
    { key: 'morning-video', label: 'Vidéo du matin', resources: available.filter((resource) => resource.resourceType === 'video' && resource.sessionType === 'morning').slice(0, 1) },
    { key: 'evening-video', label: 'Vidéo du soir', resources: available.filter((resource) => resource.resourceType === 'video' && resource.sessionType === 'evening').slice(0, 1) },
    { key: 'day-pdf', label: 'Carnet PDF', resources: available.filter((resource) => resource.resourceType === 'pdf') },
  ]
}

export default function RetreatDayMemberResources({ dayId }: { dayId: string }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/member/mahanaim/resources?dayId=${encodeURIComponent(dayId)}`, { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => ({ response, json: await response.json() }))
      .then(({ response, json }) => { if (!active) return; if (response.ok && json.ok && Array.isArray(json.data)) { setResources(json.data); setUnavailable(false) } else setUnavailable(true) })
      .catch(() => { if (active) setUnavailable(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dayId])

  if (loading) return <p className="mt-3 text-sm text-slate-400">Chargement des ressources…</p>
  return <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><h3 className="text-sm font-bold uppercase tracking-wider text-amber-200">Ressources multimédias</h3><div className="mt-3 grid gap-3 md:grid-cols-3">{buildResourceSlots(resources).map((slot) => <div key={slot.key} className="rounded-xl border border-white/10 bg-slate-950/60 p-3"><h4 className="text-sm font-semibold">{slot.label}</h4>{slot.resources.length ? slot.resources.map((resource) => <a key={resource.id} href={resource.url ?? `/api/member/mahanaim/resources?dayId=${encodeURIComponent(dayId)}&resourceId=${encodeURIComponent(resource.id)}`} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-amber-100 underline"><span className="mr-1 text-emerald-200 no-underline">Disponible ·</span>{resource.title}</a>) : <p className={`mt-2 text-sm ${unavailable ? 'text-red-200' : 'text-slate-400'}`}>{unavailable ? 'Indisponible' : 'À venir'}</p>}</div>)}</div></section>
}
