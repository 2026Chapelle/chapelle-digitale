'use client'

import { useEffect, useState } from 'react'
import { Download, FileText, MoonStar, Sunrise, ExternalLink } from 'lucide-react'

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
    setLoading(true)
    setUnavailable(false)
    setResources([])
    fetch(`/api/member/mahanaim/resources?dayId=${encodeURIComponent(dayId)}`, { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => ({ response, json: await response.json() }))
      .then(({ response, json }) => { if (!active) return; if (response.ok && json.ok && Array.isArray(json.data)) { setResources(json.data); setUnavailable(false) } else setUnavailable(true) })
      .catch(() => { if (active) setUnavailable(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dayId])

  const slots = buildResourceSlots(resources)
  const videoSlots = slots.filter((slot) => slot.key !== 'day-pdf')

  return (
    <section aria-label="Vos ressources du jour" className="rounded-2xl border border-amber-300/25 bg-[#080e23] p-4 sm:p-5 text-slate-100">
      <h3 className="text-base font-semibold text-amber-200">Vos ressources du jour</h3>
      <p className="mt-1 text-xs text-slate-400">Vidéos et carnet spirituel de la journée</p>
      <div className="mt-4 divide-y divide-white/10">
        {videoSlots.map((slot) => {
          const morning = slot.key === 'morning-video'
          const Icon = morning ? Sunrise : MoonStar
          return (
            <div key={slot.key} className="flex min-w-0 items-center gap-3 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-amber-200"><Icon className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{slot.label}</p>
                <p className="text-xs text-slate-400">{morning ? 'Méditation matinale' : 'Enseignement et prière'}</p>
              </div>
              {loading ? <span className="shrink-0 text-xs text-slate-400">Chargement…</span> : slot.resources.length ? (
                <div className="max-w-[45%] text-right">
                  {slot.resources.map((resource) => <a key={resource.id} href={resource.url ?? `/api/member/mahanaim/resources?dayId=${encodeURIComponent(dayId)}&resourceId=${encodeURIComponent(resource.id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-end gap-1 rounded-lg border border-amber-300/40 px-2.5 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/10"><span className="truncate">Regarder</span><ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></a>)}
                </div>
              ) : <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">{unavailable ? 'Indisponible' : 'À venir'}</span>}
            </div>
          )
        })}
        <div className="flex min-w-0 flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200"><FileText className="h-5 w-5" aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-100">Mon carnet spirituel</p>
            <p className="text-xs text-slate-400">PDF généré pour cette journée</p>
          </div>
          <a href={`/api/member/mahanaim/carnet?dayId=${encodeURIComponent(dayId)}`} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 sm:w-auto"><Download className="h-4 w-4" aria-hidden="true" />Télécharger le PDF</a>
        </div>
      </div>
    </section>
  )
}
