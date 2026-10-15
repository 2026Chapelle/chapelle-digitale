'use client'

import { useRef, useState } from 'react'
import RetreatDayMemberResources from './RetreatDayMemberResources'

type JourneyDay = {
  id: string
  dayNumber: number
  dayDate: string
  title: string
  scriptureReference: string | null
  isUnlocked: boolean
  imageUrl?: string | null
  content: null | {
    scriptureText: string | null
    objective: string | null
    meditation: string | null
    prayers: string[]
    declarations: string[]
    action: string | null
  }
}

const fallbackVisuals = [
  { icon: '✦', accent: 'amber', className: 'from-amber-300/45 via-orange-800/65 to-slate-950' },
  { icon: '☀', accent: 'rose', className: 'from-rose-300/40 via-fuchsia-800/60 to-slate-950' },
  { icon: '◒', accent: 'violet', className: 'from-violet-300/40 via-indigo-900/70 to-slate-950' },
  { icon: '✺', accent: 'sky', className: 'from-sky-300/40 via-cyan-900/65 to-slate-950' },
  { icon: '❖', accent: 'emerald', className: 'from-emerald-300/35 via-teal-900/70 to-slate-950' },
  { icon: '☁', accent: 'blue', className: 'from-blue-300/40 via-blue-900/70 to-slate-950' },
  { icon: '⌁', accent: 'indigo', className: 'from-indigo-300/40 via-indigo-950/75 to-slate-950' },
  { icon: '✧', accent: 'yellow', className: 'from-yellow-200/40 via-amber-900/70 to-slate-950' },
  { icon: '◈', accent: 'cyan', className: 'from-cyan-200/40 via-cyan-950/75 to-slate-950' },
  { icon: '✣', accent: 'lime', className: 'from-lime-200/35 via-emerald-950/75 to-slate-950' },
]

export function dayFallbackVisual(dayNumber: number) {
  const { icon, accent } = fallbackVisuals[(dayNumber - 1) % fallbackVisuals.length]
  return { icon, accent }
}

function fallbackVisualClass(dayNumber: number) {
  return fallbackVisuals[(dayNumber - 1) % fallbackVisuals.length].className
}

type ReadingPanel = {
  scrollIntoView: (options: ScrollIntoViewOptions) => void
  focus: (options?: FocusOptions) => void
}

export function moveFocusToReadingPanel(panel: ReadingPanel | null) {
  if (!panel) return
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  panel.focus({ preventScroll: true })
}

export function initialMahanaimDayId(days: Array<Pick<JourneyDay, 'id' | 'isUnlocked'>>) {
  return days.find((day) => day.isUnlocked)?.id ?? days[0]?.id ?? ''
}

export default function MahanaimRetreatJourney({ days, showResources = true }: { days: JourneyDay[], showResources?: boolean }) {
  const [selectedId, setSelectedId] = useState(() => initialMahanaimDayId(days))
  const panelRef = useRef<HTMLElement>(null)
  const selected = days.find((day) => day.id === selectedId) ?? days[0]

  if (!selected) return null

  return <section aria-label="Parcours des 10 jours" className="grid items-start gap-6 lg:grid-cols-[minmax(20rem,.82fr)_minmax(0,1.7fr)]">
    <nav aria-label="Choisir une journée" className="relative rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-2.5 shadow-2xl shadow-black/20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2" tabIndex={0}>
      <div className="mb-3 flex items-center justify-between px-2 pt-1"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">Le parcours</p><p className="mt-1 text-sm text-slate-400">10 jours de retraite</p></div><span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-100">{days.filter((day) => day.isUnlocked).length}/{days.length}</span></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{days.map((day) => <DayCard key={day.id} day={day} active={day.id === selected.id} onSelect={() => setSelectedId(day.id)} />)}</div>
      <p className="hidden border-t border-white/10 px-2 pt-2 text-center text-[10px] font-medium uppercase tracking-[.16em] text-slate-500 lg:block">Défilement · 10 journées</p>
      <button type="button" onClick={() => moveFocusToReadingPanel(panelRef.current)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20 focus:outline-none focus:ring-2 focus:ring-amber-300 lg:hidden">Lire la journée <span aria-hidden="true">↓</span></button>
    </nav>
    <article ref={panelRef} tabIndex={-1} className="overflow-hidden rounded-[1.9rem] border border-amber-300/20 bg-slate-950 text-slate-100 shadow-2xl shadow-black/25 focus:outline-none focus:ring-2 focus:ring-amber-300" aria-live="polite">
      <DayBanner day={selected} />
      <div className="p-5 sm:p-8">{!selected.isUnlocked || !selected.content ? <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-slate-300"><p className="font-semibold text-white">Journée verrouillée</p><p className="mt-2">Cette journée sera disponible la veille à 18h00 (heure d’Abidjan). Son contenu spirituel et ses ressources restent protégés jusque-là.</p></div> : <div className="grid gap-7 xl:grid-cols-2"><section className="space-y-6"><Content title="Texte biblique" value={selected.content.scriptureText} quote /><Content title="Méditation" value={selected.content.meditation} /><Content title="Objectif" value={selected.content.objective} /></section><section className="space-y-6"><List title="Prières" values={selected.content.prayers} /><List title="Déclarations prophétiques" values={selected.content.declarations} /><Content title="Action pratique" value={selected.content.action} />{showResources ? <RetreatDayMemberResources dayId={selected.id} /> : <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-slate-300"><p className="font-semibold text-amber-100">Ressources multimédias</p><p className="mt-1">Emplacement de prévisualisation, sans appel réseau.</p></div>}</section></div>}</div>
    </article>
  </section>
}

function DayCard({ day, active, onSelect }: { day: JourneyDay, active: boolean, onSelect: () => void }) {
  const visual = dayFallbackVisual(day.dayNumber)
  return <button type="button" onClick={onSelect} aria-pressed={active} className={`group grid min-h-20 grid-cols-[5.75rem_minmax(0,1fr)] overflow-hidden rounded-2xl border text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300 sm:min-h-24 sm:grid-cols-[6.25rem_minmax(0,1fr)] ${active ? 'border-amber-300 bg-amber-300/10 shadow-[0_0_0_1px_rgba(251,191,36,.26)]' : 'border-white/10 bg-slate-900/75 hover:border-amber-300/55 hover:bg-slate-900'} ${day.isUnlocked ? '' : 'opacity-80'}`}>
    <div className={`relative overflow-hidden bg-gradient-to-br ${fallbackVisualClass(day.dayNumber)}`}>{day.imageUrl ? <img src={day.imageUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <><span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,.28),transparent_34%)]" /><span aria-hidden="true" className="absolute bottom-0 right-1 text-4xl font-light text-white/35 sm:text-5xl">{visual.icon}</span></>}<span className="absolute left-1.5 top-1.5 rounded-full bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-100">JOUR {String(day.dayNumber).padStart(2, '0')}</span></div>
    <span className="flex min-w-0 flex-col justify-between p-2.5"><span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{day.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-400">{day.scriptureReference ?? day.dayDate}</span></span><span className="mt-1.5 flex items-center justify-between gap-2 text-[10px]"><span className="inline-flex items-center gap-1 text-slate-400"><span aria-hidden="true">▸</span> Ressources</span><span className={`rounded-full px-1.5 py-0.5 font-semibold ${day.isUnlocked ? 'bg-emerald-300/10 text-emerald-200' : 'bg-slate-950 text-slate-300'}`}>{day.isUnlocked ? 'Disponible' : '🔒 Verrouillé'}</span></span></span>
  </button>
}

function DayBanner({ day }: { day: JourneyDay }) {
  const visual = dayFallbackVisual(day.dayNumber)
  return <header className={`relative min-h-52 overflow-hidden bg-gradient-to-br ${fallbackVisualClass(day.dayNumber)} p-6 sm:min-h-64 sm:p-8`}>{day.imageUrl ? <img src={day.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <><span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(255,255,255,.42),transparent_18%),radial-gradient(circle_at_16%_80%,rgba(251,191,36,.24),transparent_27%),linear-gradient(120deg,rgba(2,6,23,.08),rgba(2,6,23,.68))]" /><span aria-hidden="true" className="absolute -bottom-12 right-7 text-[12rem] leading-none text-white/20">{visual.icon}</span></>}<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" /><div className="relative flex h-full min-h-40 flex-col justify-end"><div className="flex flex-wrap items-center justify-between gap-3"><p className="rounded-full border border-amber-200/25 bg-slate-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[.22em] text-amber-100 backdrop-blur">Jour {String(day.dayNumber).padStart(2, '0')}</p><span className="rounded-full border border-white/20 bg-slate-950/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{day.isUnlocked ? 'Disponible maintenant' : '🔒 Verrouillé'}</span></div><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">{day.title}</h2>{day.scriptureReference ? <p className="mt-2 font-medium text-amber-100">{day.scriptureReference}</p> : null}</div></header>
}

function Content({ title, value, quote = false }: { title: string, value: string | null, quote?: boolean }) {
  if (!value) return null
  return <section><h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">{title}</h3><p className={`mt-2 whitespace-pre-line leading-relaxed text-slate-200 ${quote ? 'border-l-2 border-amber-300 pl-4' : ''}`}>{value}</p></section>
}

function List({ title, values }: { title: string, values: string[] }) {
  if (!values.length) return null
  return <section><h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-200">{values.map((value, index) => <li key={`${title}-${index}`}>{value}</li>)}</ul></section>
}
