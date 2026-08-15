'use client'
/**
 * Admin guidé minimal — page CMS `chapelle-home` (6 sections).
 * Réutilise /api/admin/cms/* (auth cookie admin, service role côté API uniquement).
 * Pas de page builder, pas de CSS libre, pas de nouvel upload system.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Check, Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Database,
  Plus, Trash2, ArrowUp, ArrowDown,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  chapelleHomePageSeed,
  chapelleHomeSectionSeeds,
  CHAPELLE_HOME_PAGE_SLUG,
  CHAPELLE_SECTION_KEYS,
  CHAPELLE_WP_ROUTES_TEMP,
  isSafeAdminHref,
  type ChapelleSectionSeed,
} from '@/lib/chapelle-home-seed'

type Row = Record<string, any>

const SECTION_LABELS: Record<string, string> = {
  header: 'Header / Navigation',
  hero: 'Hero',
  vision: 'Vision',
  journey: 'Parcours',
  contact: 'Contact',
  footer: 'Footer',
}

async function api(resource: string, method: string, body?: Row) {
  const r = await fetch(`/api/admin/cms/${resource}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return r.json()
}

function asData(row: Row | undefined): Record<string, unknown> {
  if (!row?.data || typeof row.data !== 'object' || Array.isArray(row.data)) return {}
  return row.data as Record<string, unknown>
}

const SCHED_INPUT =
  'w-full rounded-lg px-3 py-2 font-inter text-sm text-pearl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-cinematic-gold/50'

/**
 * Programme (contact.data.schedule) : le CMS conserve le modèle { name, detail }.
 * L'éditeur scinde `detail` en jour(s) + heure pour l'UI, puis les recompose
 * en `detail = "jours · heure"` — aucun changement de schéma.
 */
function splitDetail(detail: string): { jours: string; heure: string } {
  const parts = String(detail || '').split('·').map((s) => s.trim()).filter(Boolean)
  const timeIdx = parts.findIndex((p) => /^\d{1,2}\s*h\s*\d{0,2}$/i.test(p))
  if (timeIdx === -1) return { jours: parts.join(' · '), heure: '' }
  const heure = parts[timeIdx]
  const jours = parts.filter((_, i) => i !== timeIdx).join(' · ')
  return { jours, heure }
}

function joinDetail(jours: string, heure: string): string {
  return [jours.trim(), heure.trim()].filter(Boolean).join(' · ')
}

function Field({
  label, value, onChange, type = 'text', rows, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'textarea' | 'url'
  rows?: number
  hint?: string
}) {
  const base =
    'w-full rounded-lg px-3 py-2 font-inter text-sm text-pearl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-cinematic-gold/50'
  return (
    <label className="block space-y-1">
      <span className="font-inter text-[11px] font-semibold uppercase tracking-wider text-pearl/45">
        {label}
      </span>
      {type === 'textarea' ? (
        <textarea className={base} rows={rows ?? 3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={base} type={type === 'url' ? 'url' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <span className="block font-inter text-[11px] text-pearl/30">{hint}</span>}
    </label>
  )
}

function hrefError(value: string): string | null {
  if (!value.trim()) return null
  if (!isSafeAdminHref(value)) {
    return 'URL non autorisée (https, ancre #, mailto, tel, chemin / uniquement).'
  }
  return null
}

export function ChapelleHomeManager() {
  const [page, setPage] = useState<Row | null>(null)
  const [sections, setSections] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({
    header: true, hero: false, vision: false, journey: false, contact: false, footer: false, seo: true,
  })
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({})
  const [seoDraft, setSeoDraft] = useState({
    title: '', seo_title: '', seo_description: '', og_image: '', description: '', status: 'published',
  })

  const byKey = useMemo(() => {
    const m = new Map<string, Row>()
    for (const s of sections) if (s.key) m.set(s.key, s)
    return m
  }, [sections])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pagesRes, sectionsRes] = await Promise.all([
        api('pages', 'GET'),
        api('sections', 'GET'),
      ])
      if (pagesRes.demo || sectionsRes.demo) {
        setDemo(true)
        setPage(null)
        setSections([])
        setLoading(false)
        return
      }
      if (!pagesRes.ok) throw new Error(pagesRes.message || 'Erreur pages')
      if (!sectionsRes.ok) throw new Error(sectionsRes.message || 'Erreur sections')
      const pages = (pagesRes.data || []) as Row[]
      const allSections = (sectionsRes.data || []) as Row[]
      const p = pages.find((x) => x.slug === CHAPELLE_HOME_PAGE_SLUG) || null
      const own = allSections.filter((x) => x.page_slug === CHAPELLE_HOME_PAGE_SLUG)
      setPage(p)
      setSections(own)
      if (p) {
        setSeoDraft({
          title: p.title || '',
          seo_title: p.seo_title || '',
          seo_description: p.seo_description || '',
          og_image: p.og_image || '',
          description: p.description || '',
          status: p.status || 'draft',
        })
      }
      const next: Record<string, Record<string, unknown>> = {}
      for (const key of CHAPELLE_SECTION_KEYS) {
        const row = own.find((s) => s.key === key)
        const seed = chapelleHomeSectionSeeds.find((s) => s.key === key)
        next[key] = { ...(seed?.data || {}), ...asData(row) }
      }
      setDrafts(next)
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function seedAll() {
    setSavingKey('seed')
    setError(null)
    setMessage(null)
    try {
      if (!page) {
        const created = await api('pages', 'POST', { ...chapelleHomePageSeed })
        if (!created.ok) throw new Error(created.message || 'Création page échouée')
      }
      for (const seed of chapelleHomeSectionSeeds) {
        const existing = sections.find((s) => s.key === seed.key)
        if (existing) {
          const patched = await api('sections', 'PATCH', {
            id: existing.id,
            ...seed,
          })
          if (!patched.ok) throw new Error(patched.message || `Section ${seed.key}`)
        } else {
          const created = await api('sections', 'POST', { ...seed })
          if (!created.ok) throw new Error(created.message || `Section ${seed.key}`)
        }
      }
      setMessage('Page chapelle-home et 6 sections initialisées (publiées).')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Échec initialisation')
    }
    setSavingKey(null)
  }

  async function saveSeo() {
    if (!page?.id) {
      setError('Créez d’abord la page via « Initialiser ».')
      return
    }
    setSavingKey('seo')
    setError(null)
    setMessage(null)
    try {
      const r = await api('pages', 'PATCH', {
        id: page.id,
        title: seoDraft.title,
        description: seoDraft.description,
        seo_title: seoDraft.seo_title,
        seo_description: seoDraft.seo_description,
        og_image: seoDraft.og_image || null,
        status: seoDraft.status,
      })
      if (!r.ok) throw new Error(r.message || 'SEO non enregistré')
      setMessage('SEO enregistré.')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Erreur SEO')
    }
    setSavingKey(null)
  }

  function setDraftField(key: string, field: string, value: unknown) {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value },
    }))
  }

  async function saveSection(key: string) {
    const row = byKey.get(key)
    const data = drafts[key] || {}
    // Validation hrefs simples (champs plats connus)
    const hrefFields = [
      'ctaLiveHref', 'ctaJoinHref', 'ctaPrimaryHref', 'ctaSecondaryHref',
      'mapsUrl', 'legalMentionsHref', 'legalPrivacyHref',
    ]
    for (const f of hrefFields) {
      const v = data[f]
      if (typeof v === 'string' && v && !isSafeAdminHref(v)) {
        setError(`Section ${key} : champ ${f} invalide.`)
        return
      }
    }
    setSavingKey(key)
    setError(null)
    setMessage(null)
    try {
      const seed = chapelleHomeSectionSeeds.find((s) => s.key === key) as ChapelleSectionSeed
      const imageUrl =
        (typeof data.logoUrl === 'string' && data.logoUrl) ||
        (typeof data.imageUrl === 'string' && data.imageUrl) ||
        (typeof data.portraitUrl === 'string' && data.portraitUrl) ||
        seed?.image_url ||
        null
      const payload: Row = {
        page_slug: CHAPELLE_HOME_PAGE_SLUG,
        key,
        type: seed?.type || key,
        title: (data.titleLine1 as string) || (data.title as string) || (data.brandName as string) || key,
        subtitle: (data.kicker as string) || null,
        body: (data.subtitle as string) || (data.body as string) || (data.intro as string) || (data.tagline as string) || null,
        image_url: imageUrl,
        cta_label: (data.ctaPrimaryLabel as string) || (data.ctaJoinLabel as string) || (data.ctaLiveLabel as string) || null,
        cta_href: (data.ctaPrimaryHref as string) || (data.ctaJoinHref as string) || null,
        data,
        sort_order: seed?.sort_order ?? 0,
        is_active: row?.is_active !== false,
        status: row?.status || 'published',
      }
      if (row?.id) {
        const r = await api('sections', 'PATCH', { id: row.id, ...payload })
        if (!r.ok) throw new Error(r.message || 'Échec enregistrement')
      } else {
        const r = await api('sections', 'POST', payload)
        if (!r.ok) throw new Error(r.message || 'Échec création')
      }
      setMessage(`Section « ${SECTION_LABELS[key] || key} » enregistrée.`)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Erreur enregistrement')
    }
    setSavingKey(null)
  }

  async function toggleSection(key: string, field: 'is_active' | 'status') {
    const row = byKey.get(key)
    if (!row?.id) {
      setError('Initialisez d’abord la section.')
      return
    }
    setSavingKey(key)
    try {
      const patch =
        field === 'is_active'
          ? { id: row.id, is_active: !row.is_active }
          : { id: row.id, status: row.status === 'published' ? 'draft' : 'published' }
      const r = await api('sections', 'PATCH', patch)
      if (!r.ok) throw new Error(r.message || 'Échec')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Erreur')
    }
    setSavingKey(null)
  }

  function renderTextFields(key: string, fields: { name: string; label: string; type?: 'text' | 'textarea' | 'url'; hint?: string }[]) {
    const d = drafts[key] || {}
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const val = d[f.name]
          const str = val == null ? '' : String(val)
          const err = f.type === 'url' || f.name.toLowerCase().includes('href') || f.name.toLowerCase().includes('url')
            ? hrefError(str)
            : null
          return (
            <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : undefined}>
              <Field
                label={f.label}
                value={str}
                type={f.type}
                hint={err || f.hint}
                onChange={(v) => setDraftField(key, f.name, v)}
              />
              {err && <p className="mt-1 font-inter text-[11px] text-rose-400">{err}</p>}
            </div>
          )
        })}
      </div>
    )
  }

  function getSchedule(): Array<{ name?: string; detail?: string }> {
    const s = drafts.contact?.schedule
    return Array.isArray(s) ? (s as Array<{ name?: string; detail?: string }>) : []
  }

  function commitSchedule(next: Array<{ name?: string; detail?: string }>) {
    setDraftField('contact', 'schedule', next)
  }

  function addScheduleRow() {
    commitSchedule([...getSchedule(), { name: '', detail: '' }])
  }

  function removeScheduleRow(i: number) {
    const next = getSchedule().slice()
    next.splice(i, 1)
    commitSchedule(next)
  }

  function moveScheduleRow(i: number, dir: -1 | 1) {
    const next = getSchedule().slice()
    const j = i + dir
    if (j < 0 || j >= next.length) return
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    commitSchedule(next)
  }

  function updateScheduleRow(i: number, patch: { name?: string; jours?: string; heure?: string }) {
    const next = getSchedule().slice()
    const existing = next[i] || { name: '', detail: '' }
    const parsed = splitDetail(existing.detail || '')
    const name = patch.name !== undefined ? patch.name : (existing.name || '')
    const jours = patch.jours !== undefined ? patch.jours : parsed.jours
    const heure = patch.heure !== undefined ? patch.heure : parsed.heure
    next[i] = { name, detail: joinDetail(jours, heure) }
    commitSchedule(next)
  }

  function renderScheduleEditor() {
    const sched = getSchedule()
    return (
      <div className="space-y-3 rounded-lg border border-white/[0.06] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-inter text-[11px] font-semibold uppercase tracking-wider text-pearl/45">
            Programme (horaires)
          </span>
          <button
            type="button"
            onClick={addScheduleRow}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-inter border border-white/10 text-pearl/70 hover:bg-white/[0.04] inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Ajouter une ligne
          </button>
        </div>
        {sched.length === 0 && (
          <p className="font-inter text-[11px] text-pearl/30">
            Aucune ligne. Ajoutez le programme (nom · jour(s) · heure).
          </p>
        )}
        {sched.map((item, i) => {
          const parsed = splitDetail(item.detail || '')
          return (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_110px_auto] sm:items-end">
              <label className="block space-y-1">
                <span className="font-inter text-[10px] uppercase tracking-wider text-pearl/40">Nom</span>
                <input
                  className={SCHED_INPUT}
                  value={item.name || ''}
                  placeholder="La Matinale"
                  onChange={(e) => updateScheduleRow(i, { name: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="font-inter text-[10px] uppercase tracking-wider text-pearl/40">Jour(s)</span>
                <input
                  className={SCHED_INPUT}
                  value={parsed.jours}
                  placeholder="Lundi · Mercredi · Vendredi"
                  onChange={(e) => updateScheduleRow(i, { jours: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="font-inter text-[10px] uppercase tracking-wider text-pearl/40">Heure</span>
                <input
                  className={SCHED_INPUT}
                  value={parsed.heure}
                  placeholder="05h30"
                  onChange={(e) => updateScheduleRow(i, { heure: e.target.value })}
                />
              </label>
              <div className="flex gap-1 pb-0.5">
                <button
                  type="button"
                  onClick={() => moveScheduleRow(i, -1)}
                  disabled={i === 0}
                  title="Monter"
                  className="p-1.5 rounded-lg border border-white/10 text-pearl/60 hover:bg-white/[0.04] disabled:opacity-30"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveScheduleRow(i, 1)}
                  disabled={i === sched.length - 1}
                  title="Descendre"
                  className="p-1.5 rounded-lg border border-white/10 text-pearl/60 hover:bg-white/[0.04] disabled:opacity-30"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeScheduleRow(i)}
                  title="Supprimer"
                  className="p-1.5 rounded-lg border border-rose-500/20 text-rose-300/80 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
        <p className="font-inter text-[11px] text-pearl/30">
          Stocké dans <code className="text-cinematic-gold/70">contact.data.schedule</code> ({'{ name, detail }'}) —
          « detail » recomposé en « jour(s) · heure ». Pense à aligner le hero « Horaire affiché » si le culte dominical change.
        </p>
      </div>
    )
  }

  function panel(key: string, children: ReactNode) {
    const row = byKey.get(key)
    const isOpen = open[key]
    return (
      <div
        key={key}
        className="rounded-xl border border-white/[0.08] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
          onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-inter text-sm font-semibold text-pearl">
              {SECTION_LABELS[key] || key}
            </span>
            <span className="font-mono text-[10px] text-pearl/35">{key}</span>
            {row ? (
              <span className="font-inter text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: row.status === 'published' && row.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.2)',
                  color: row.status === 'published' && row.is_active ? '#4ADE80' : '#9CA3AF',
                }}
              >
                {row.is_active ? (row.status === 'published' ? 'Actif · publié' : 'Actif · brouillon') : 'Désactivé'}
              </span>
            ) : (
              <span className="font-inter text-[10px] text-amber-400/80">Absent</span>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-pearl/40" /> : <ChevronDown className="w-4 h-4 text-pearl/40" />}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">
            {children}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => saveSection(key)}
                disabled={!!savingKey}
                className="btn-gold-cinematic px-4 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                {savingKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Enregistrer
              </button>
              {row && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleSection(key, 'is_active')}
                    className="px-3 py-2 rounded-lg text-xs font-inter border border-white/10 text-pearl/70 hover:bg-white/[0.04] inline-flex items-center gap-1.5"
                  >
                    {row.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {row.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSection(key, 'status')}
                    className="px-3 py-2 rounded-lg text-xs font-inter border border-white/10 text-pearl/70 hover:bg-white/[0.04]"
                  >
                    {row.status === 'published' ? 'Passer en brouillon' : 'Publier'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal max-w-4xl">
        <PageHeader
          eyebrow="CMS · Chapelle Next"
          title={<>Accueil <span className="text-cinematic-gold">La Chapelle</span></>}
          description="Pilotez la one-page Chapelle (6 sections + SEO) sans builder libre ni CSS. Design frontend inchangé."
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={load}
                className="px-3 py-2 rounded-lg text-xs font-inter border border-white/10 text-pearl/70 hover:bg-white/[0.04] inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Recharger
              </button>
              <button
                type="button"
                onClick={seedAll}
                disabled={!!savingKey || demo}
                className="btn-gold-cinematic px-4 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                {savingKey === 'seed' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {page ? 'Réinitialiser contenu validé' : 'Initialiser chapelle-home'}
              </button>
            </div>
          }
        />

        {demo && (
          <div className="mb-5 rounded-xl px-4 py-3 flex gap-3 items-start border border-amber-500/20 bg-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="font-inter text-sm text-amber-100/80">
              Mode démo : connectez Supabase pour créer/éditer. Chapelle Next utilisera son fallback local.
            </p>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 border border-rose-500/25 bg-rose-500/10 font-inter text-sm text-rose-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl px-4 py-3 border border-emerald-500/25 bg-emerald-500/10 font-inter text-sm text-emerald-200">
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="space-y-3">
            {/* SEO page */}
            <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setOpen((o) => ({ ...o, seo: !o.seo }))}
              >
                <span className="font-inter text-sm font-semibold text-pearl">SEO page · {CHAPELLE_HOME_PAGE_SLUG}</span>
                {open.seo ? <ChevronUp className="w-4 h-4 text-pearl/40" /> : <ChevronDown className="w-4 h-4 text-pearl/40" />}
              </button>
              {open.seo && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-4">
                  <p className="font-inter text-xs text-pearl/40">
                    Statut page : <strong className="text-pearl/70">{page?.status || 'absente'}</strong>
                    {' · '}slug <code className="text-cinematic-gold/80">{CHAPELLE_HOME_PAGE_SLUG}</code>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Titre" value={seoDraft.title} onChange={(v) => setSeoDraft((s) => ({ ...s, title: v }))} />
                    <Field label="Titre SEO" value={seoDraft.seo_title} onChange={(v) => setSeoDraft((s) => ({ ...s, seo_title: v }))} />
                    <div className="sm:col-span-2">
                      <Field label="Description SEO" type="textarea" value={seoDraft.seo_description} onChange={(v) => setSeoDraft((s) => ({ ...s, seo_description: v }))} />
                    </div>
                    <Field label="Image OG (chemin ou URL)" value={seoDraft.og_image} onChange={(v) => setSeoDraft((s) => ({ ...s, og_image: v }))} hint="Médias locaux Chapelle Next acceptés (ex. /images/…)" />
                    <label className="block space-y-1">
                      <span className="font-inter text-[11px] font-semibold uppercase tracking-wider text-pearl/45">Statut</span>
                      <select
                        className="w-full rounded-lg px-3 py-2 font-inter text-sm text-pearl bg-white/[0.04] border border-white/10"
                        value={seoDraft.status}
                        onChange={(e) => setSeoDraft((s) => ({ ...s, status: e.target.value }))}
                      >
                        <option value="published">Publié</option>
                        <option value="draft">Brouillon</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={saveSeo}
                    disabled={!page || !!savingKey}
                    className="btn-gold-cinematic px-4 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingKey === 'seo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Enregistrer SEO
                  </button>
                </div>
              )}
            </div>

            {panel(
              'header',
              <>
                {renderTextFields('header', [
                  { name: 'logoUrl', label: 'Logo (URL / chemin public)' },
                  { name: 'logoAlt', label: 'Alt logo' },
                  { name: 'ctaLiveLabel', label: 'Libellé EN DIRECT' },
                  { name: 'ctaLiveHref', label: 'Lien EN DIRECT', type: 'url' },
                  { name: 'ctaJoinLabel', label: 'Libellé Rejoindre' },
                  { name: 'ctaJoinHref', label: 'Lien Rejoindre', type: 'url' },
                ])}
                <p className="font-inter text-xs text-pearl/40">
                  Navigation : ordre / libellés / URLs stockés dans data.nav (réinitialiser pour le contenu validé).
                  Destinations WP temporaires documentées (bascule future) : ressources, formations, intégration, donner, rejoindre.
                </p>
                <pre className="text-[10px] font-mono text-pearl/50 overflow-auto max-h-40 p-3 rounded-lg bg-black/30 border border-white/5">
                  {JSON.stringify(drafts.header?.nav ?? [], null, 2)}
                </pre>
              </>,
            )}

            {panel('hero', renderTextFields('hero', [
              { name: 'imageUrl', label: 'Image Hero' },
              { name: 'objectPosition', label: 'Cadrage (whitelist)', hint: 'left | center | right | center-top | center-bottom | subject-left | subject-right' },
              { name: 'kicker', label: 'Kicker' },
              { name: 'titleLine1', label: 'Titre ligne 1' },
              { name: 'titleLine2Prefix', label: 'Ligne 2 préfixe' },
              { name: 'accentWord', label: 'Mot accentué' },
              { name: 'titleLine2Suffix', label: 'Ligne 2 suffixe' },
              { name: 'subtitle', label: 'Sous-titre', type: 'textarea' },
              { name: 'ctaPrimaryLabel', label: 'CTA primaire' },
              { name: 'ctaPrimaryHref', label: 'Lien CTA primaire', type: 'url' },
              { name: 'ctaSecondaryLabel', label: 'CTA secondaire' },
              { name: 'ctaSecondaryHref', label: 'Lien CTA secondaire', type: 'url' },
              { name: 'scheduleLabel', label: 'Horaire affiché' },
            ]))}

            {panel('vision', renderTextFields('vision', [
              { name: 'portraitUrl', label: 'Portrait' },
              { name: 'portraitAlt', label: 'Alt portrait' },
              { name: 'kicker', label: 'Kicker' },
              { name: 'titleLine1', label: 'Titre ligne 1' },
              { name: 'titleLine2Prefix', label: 'Ligne 2 préfixe' },
              { name: 'accentWord', label: 'Mot accentué' },
              { name: 'titleLine2Suffix', label: 'Ligne 2 suffixe' },
              { name: 'body', label: 'Corps', type: 'textarea' },
              { name: 'leadershipName', label: 'Nom leadership' },
              { name: 'leadershipText', label: 'Texte leadership', type: 'textarea' },
            ]))}

            {panel('journey', renderTextFields('journey', [
              { name: 'kicker', label: 'Kicker' },
              { name: 'titleLine1Prefix', label: 'Titre préfixe' },
              { name: 'accentWord', label: 'Mot accentué' },
              { name: 'titleLine2', label: 'Titre ligne 2' },
              { name: 'intro', label: 'Intro', type: 'textarea' },
            ]))}

            {panel('contact', (
              <>
                {renderTextFields('contact', [
                  { name: 'kicker', label: 'Kicker' },
                  { name: 'title', label: 'Titre' },
                  { name: 'body', label: 'Corps', type: 'textarea' },
                  { name: 'address', label: 'Adresse' },
                  { name: 'mapsUrl', label: 'URL Maps', type: 'url' },
                  { name: 'email', label: 'Email' },
                  { name: 'ctaJoinLabel', label: 'CTA rejoindre' },
                  { name: 'ctaJoinHref', label: 'Lien rejoindre', type: 'url' },
                  { name: 'ctaLiveLabel', label: 'CTA live' },
                  { name: 'ctaLiveHref', label: 'Lien live', type: 'url' },
                ])}
                {renderScheduleEditor()}
              </>
            ))}

            {panel('footer', renderTextFields('footer', [
              { name: 'logoUrl', label: 'Logo' },
              { name: 'brandName', label: 'Nom marque' },
              { name: 'tagline', label: 'Tagline', type: 'textarea' },
              { name: 'address', label: 'Adresse' },
              { name: 'mapsUrl', label: 'URL Maps', type: 'url' },
              { name: 'email', label: 'Email' },
              { name: 'copyrightName', label: 'Nom copyright' },
              { name: 'legalMentionsHref', label: 'Mentions légales', type: 'url' },
              { name: 'legalPrivacyHref', label: 'Confidentialité', type: 'url' },
            ]))}

            <div className="rounded-xl border border-white/[0.06] p-4 mt-6">
              <p className="font-inter text-xs text-pearl/40 leading-relaxed">
                <strong className="text-pearl/60">Routes WordPress temporaires</strong> (à retirer à la bascule Next) :
                {' '}{Object.entries(CHAPELLE_WP_ROUTES_TEMP).map(([k, v]) => `${k}=${v}`).join(' · ')}
              </p>
              <p className="font-inter text-[11px] text-pearl/30 mt-2">
                Médias : chemins publics Chapelle Next conservés pour ne pas dépendre de Storage.
                Images absentes côté CMS → fallback local Chapelle.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
