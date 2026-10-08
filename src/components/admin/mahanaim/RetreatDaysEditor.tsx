'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { getMissingRetreatDayFields, RETREAT_DAY_CONTENT_FIELDS, type RetreatDayContent } from '@/lib/mahanaim/admin-retreat-days-shared'

type EditableField = (typeof RETREAT_DAY_CONTENT_FIELDS)[number]
type DayDraft = Pick<RetreatDayContent, EditableField>
const TEXT_FIELDS: Array<{ key: Exclude<EditableField, 'prayers' | 'declarations'>; label: string; rows: number }> = [
  { key: 'title', label: 'Titre de la journée', rows: 2 },
  { key: 'scripture_reference', label: 'Référence biblique', rows: 1 },
  { key: 'scripture_text', label: 'Texte biblique', rows: 4 },
  { key: 'meditation', label: 'Méditation', rows: 8 },
  { key: 'objective', label: 'Objectif du jour', rows: 3 },
  { key: 'action', label: 'Action pratique', rows: 3 },
]

function asDraft(day: RetreatDayContent): DayDraft {
  return { title: day.title ?? '', scripture_reference: day.scripture_reference ?? '', scripture_text: day.scripture_text ?? '', meditation: day.meditation ?? '', objective: day.objective ?? '', prayers: Array.isArray(day.prayers) ? day.prayers : [], declarations: Array.isArray(day.declarations) ? day.declarations : [], action: day.action ?? '' }
}
function listText(value: string[]) { return value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join('\n') }

export default function RetreatDaysEditor() {
  const [days, setDays] = useState<RetreatDayContent[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<DayDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const selected = days.find((day) => day.id === selectedId) ?? null
  const missingFields = useMemo(() => selected ? getMissingRetreatDayFields(draft ?? selected) : [], [draft, selected])
  const changedFields = useMemo(() => {
    if (!selected || !draft) return []
    const original = asDraft(selected)
    return RETREAT_DAY_CONTENT_FIELDS.filter((field) => JSON.stringify(draft[field]) !== JSON.stringify(original[field]))
  }, [draft, selected])

  const loadDays = useCallback(async (preferredId?: string) => {
    setLoading(true); setError(null)
    try {
      const response = await fetch('/api/admin/mahanaim/retreat-days', { credentials: 'same-origin', cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json.ok || !Array.isArray(json.data)) throw new Error(json.message || 'Impossible de charger les journées.')
      const loaded = json.data as RetreatDayContent[]
      setDays(loaded)
      const nextId = loaded.some((day) => day.id === preferredId) ? preferredId! : loaded[0]?.id ?? ''
      setSelectedId(nextId)
      const next = loaded.find((day) => day.id === nextId)
      setDraft(next ? asDraft(next) : null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de chargement des journées.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadDays() }, [loadDays])

  function selectDay(id: string) {
    if (saving) return
    if (changedFields.length > 0 && !window.confirm('Cette journée contient des changements non enregistrés. Les abandonner ?')) return
    const next = days.find((day) => day.id === id)
    setSelectedId(id); setDraft(next ? asDraft(next) : null); setError(null); setNotice(null)
  }
  function updateText<K extends keyof DayDraft>(key: K, value: DayDraft[K]) {
    if (saving) return
    setDraft((current) => current ? { ...current, [key]: value } : current); setError(null); setNotice(null)
  }
  async function saveDraft() {
    if (!selected || !draft || changedFields.length === 0) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const patch: Record<string, unknown> = { id: selected.id }
      for (const field of changedFields) patch[field] = draft[field]
      const response = await fetch('/api/admin/mahanaim/retreat-days', { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
      const json = await response.json()
      if (!response.ok || !json.ok || !json.data) throw new Error(json.message || 'La sauvegarde a échoué. Réessayez.')
      const persisted = json.data as RetreatDayContent
      setDays((current) => current.map((day) => day.id === persisted.id ? persisted : day))
      setDraft(asDraft(persisted))
      setNotice('Brouillon enregistré en base. Il sera retrouvé au prochain chargement de cette page.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La sauvegarde a échoué. Vos modifications restent affichées.')
    } finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-abyss px-4 pb-16 pt-24 sm:px-8"><div className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Administration · Mahanaïm" title={<>Revêtus de Puissance <span className="text-cinematic-gold">— Chambre Haute 2026</span></>} description="Renseignez indépendamment les dix journées. Chaque sauvegarde conserve le statut, la date et les données de participation." />
    {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-4 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div>}
    {loading ? <div className="flex items-center gap-2 py-12 text-sm text-pearl/60"><Loader2 className="h-4 w-4 animate-spin" />Chargement des journées…</div> : days.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-pearl/70">Aucune journée existante n’a été trouvée pour cette retraite. Aucune journée n’a été créée.</div> :
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2" aria-label="Sélection de la journée">{days.map((day) => { const missing = getMissingRetreatDayFields(day).length; return <button key={day.id} type="button" onClick={() => selectDay(day.id)} disabled={saving} aria-current={day.id === selectedId ? 'true' : undefined} className={`w-full rounded-xl border p-3 text-left transition ${day.id === selectedId ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
          <span className="block text-sm font-semibold text-pearl">Jour {day.day_number} · {day.day_date}</span><span className="mt-1 block truncate text-xs text-pearl/55">{day.title || 'Titre à renseigner'}</span><span className="mt-2 block text-[11px] text-amber-200/80">{missing ? `${missing} champ${missing > 1 ? 's' : ''} à renseigner` : 'Contenu renseigné'}</span>
        </button> })}</aside>
        {selected && draft && <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6" aria-label={`Contenu du jour ${selected.day_number}`}>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4"><div><h2 className="font-cinzel text-xl font-bold text-pearl">Jour {selected.day_number}</h2><p className="mt-1 text-sm text-pearl/55">{selected.day_date} · Statut existant : <span className="text-pearl/80">{selected.status}</span></p></div><span className="rounded-full border border-amber-300/20 px-3 py-1 text-xs text-amber-100/80">{missingFields.length} champ{missingFields.length === 1 ? '' : 's'} manquant{missingFields.length === 1 ? '' : 's'}</span></div>
          {missingFields.length > 0 && <p className="mb-5 text-sm text-amber-100/80">À renseigner : {missingFields.join(' · ')}</p>}
          <div className="grid gap-4 md:grid-cols-2">{TEXT_FIELDS.map(({ key, label, rows }) => <label key={key} className={`block ${key === 'meditation' ? 'md:col-span-2' : ''}`}><span className="mb-1.5 block text-sm font-medium text-pearl/85">{label}</span><textarea rows={rows} value={draft[key] ?? ''} disabled={saving} onChange={(event) => updateText(key, event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm leading-relaxed text-pearl outline-none focus:border-gold/60" /></label>)}
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-pearl/85">Prières <span className="text-pearl/40">(une par ligne)</span></span><textarea rows={6} value={listText(draft.prayers)} disabled={saving} onChange={(event) => updateText('prayers', event.target.value.split('\n'))} className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm leading-relaxed text-pearl outline-none focus:border-gold/60" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-pearl/85">Déclarations prophétiques <span className="text-pearl/40">(une par ligne)</span></span><textarea rows={6} value={listText(draft.declarations)} disabled={saving} onChange={(event) => updateText('declarations', event.target.value.split('\n'))} className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm leading-relaxed text-pearl outline-none focus:border-gold/60" /></label>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><p className="text-xs text-pearl/45">Brouillon · {changedFields.length} champ{changedFields.length === 1 ? '' : 's'} modifié{changedFields.length === 1 ? '' : 's'}</p><button type="button" onClick={saveDraft} disabled={saving || changedFields.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-abyss transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Enregistrement…' : 'Enregistrer ce brouillon'}</button></div>
        </section>}
      </div>}
  </div></div>
}
