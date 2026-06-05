'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, CalendarDays, MapPin, Video, Users, Loader2, Plus, X, Check,
  ClipboardList, BarChart3, Clock, ChevronDown, ChevronRight, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { MEETING_PLATFORMS, detectMeetingPlatform, meetingPlatformLabel, platformUrlHint } from '@/lib/community/meeting-platform'

/* ── Libellés (aucune donnée fictive) ─────────────────────────────────────── */
const TYPE_LABEL: Record<string, string> = { physique: 'Présentiel', virtuelle: 'En ligne', hybride: 'Hybride' }
const PRESENCE_LABEL: Record<string, string> = { present: 'Présent', absent: 'Absent', excuse: 'Excusé' }
const STATUT_LABEL: Record<string, string> = { planifiee: 'Planifiée', tenue: 'Tenue', annulee: 'Annulée' }
const STATUT_COLOR: Record<string, string> = { planifiee: '#F59E0B', tenue: '#22C55E', annulee: '#EF4444' }
const PRESENCE_COLOR: Record<string, string> = { present: '#22C55E', absent: '#EF4444', excuse: '#F59E0B' }

const typeLabel = (t?: string | null) => (t && TYPE_LABEL[t]) || t || '—'
const statutLabel = (s?: string | null) => (s && STATUT_LABEL[s]) || s || '—'
const presenceLabel = (p?: string | null) => (p && PRESENCE_LABEL[p]) || '—'
const isVirtuel = (t?: string | null) => t === 'virtuelle' || t === 'hybride'

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const fmtTime = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
const fmtDayKey = (iso?: string | null) => {
  if (!iso) return 'Sans date'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Sans date'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
/** ISO → valeur datetime-local (heure locale). */
const isoToLocalInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fullName = (p?: any, fallback?: string) =>
  (p && (`${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || p.email)) || fallback || '—'

async function post(payload: Record<string, unknown>) {
  const r = await fetch('/api/member/reunions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
    body: JSON.stringify(payload),
  })
  return r.json()
}

type ReunionForm = {
  titre: string; description: string; type: string; date_reunion: string
  duree_min: string; lieu: string; lien_visio: string
}
const EMPTY_FORM: ReunionForm = { titre: '', description: '', type: 'physique', date_reunion: '', duree_min: '90', lieu: '', lien_visio: '' }

export default function MesReunionsPage() {
  const [tab, setTab] = useState<'mes' | 'animation'>('mes')

  // ── Mes réunions ──
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [mes, setMes] = useState<any[]>([])

  // ── Animation (gestion) ──
  const [canManage, setCanManage] = useState(false)
  const [managed, setManaged] = useState<any[]>([])
  const [selGroupe, setSelGroupe] = useState<string>('')
  const [gReunions, setGReunions] = useState<any[]>([])
  const [gLoading, setGLoading] = useState(false)
  const [stats, setStats] = useState<any | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  // ── Synthèse d'assiduité du leader (overview) ──
  const [overview, setOverview] = useState<any | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewLoaded, setOverviewLoaded] = useState(false)

  // Formulaire create/update
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ReunionForm>(EMPTY_FORM)
  const [platformKey, setPlatformKey] = useState<string>('autre') // Visioconférence V1 : dérivé de lien_visio (placeholder du select plateforme)
  const [platformHint, setPlatformHint] = useState<string>('https://…')
  const [saving, setSaving] = useState(false)

  // Feuille de présence (réunion ouverte)
  const [sheetReunion, setSheetReunion] = useState<string | null>(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetMembers, setSheetMembers] = useState<any[]>([])
  const [sheetEntries, setSheetEntries] = useState<Record<string, { statut: string; note: string }>>({})

  /* ── Chargements ── */
  const loadMes = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/member/reunions', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (j?.demo) { setDemo(true); setLoading(false); return }
      if (j?.ok) setMes(j.data || [])
    } catch { /* noop */ }
    setLoading(false)
  }, [])

  const loadManaged = useCallback(async () => {
    try {
      const r = await fetch('/api/member/groupes?manage=1', { credentials: 'same-origin' })
      if (r.status === 403) { setCanManage(false); return }
      const j = await r.json().catch(() => ({}))
      if (j?.ok && Array.isArray(j.data) && j.data.length > 0) {
        setCanManage(true)
        setManaged(j.data)
        setSelGroupe((cur) => cur || j.data[0].id)
      } else {
        setCanManage(false); setManaged([])
      }
    } catch { setCanManage(false) }
  }, [])

  const loadGroupReunions = useCallback(async (groupeId: string) => {
    if (!groupeId) return
    setGLoading(true)
    try {
      const r = await fetch(`/api/member/reunions?groupe_id=${encodeURIComponent(groupeId)}`, { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (j?.ok) setGReunions(j.data || [])
      else { setGReunions([]); toast.error(j?.message || 'Accès refusé') }
    } catch { setGReunions([]); toast.error('Erreur réseau') }
    setGLoading(false)
  }, [])

  const loadStats = useCallback(async (groupeId: string) => {
    if (!groupeId) return
    setStatsLoading(true)
    try {
      const r = await fetch(`/api/member/reunions?groupe_id=${encodeURIComponent(groupeId)}&stats=1`, { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (j?.ok) setStats(j.data || null)
      else setStats(null)
    } catch { setStats(null) }
    setStatsLoading(false)
  }, [])

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const r = await fetch('/api/member/reunions?overview=1', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (j?.ok) setOverview(j.data || null)
      else setOverview(null)
    } catch { setOverview(null) }
    setOverviewLoading(false)
    setOverviewLoaded(true)
  }, [])

  useEffect(() => { loadMes(); loadManaged() }, [loadMes, loadManaged])

  // Charge la synthèse à l'activation de l'onglet Animation (une fois)
  useEffect(() => {
    if (tab === 'animation' && canManage && !overviewLoaded && !overviewLoading) loadOverview()
  }, [tab, canManage, overviewLoaded, overviewLoading, loadOverview])

  useEffect(() => {
    if (tab !== 'animation' || !selGroupe) return
    loadGroupReunions(selGroupe)
    loadStats(selGroupe)
    setSheetReunion(null)
    setFormOpen(false)
  }, [tab, selGroupe, loadGroupReunions, loadStats])

  /* ── Groupage chronologique « Mes réunions » ── */
  const mesGrouped = useMemo(() => {
    const sorted = [...mes].sort((a, b) => new Date(a.date_reunion).getTime() - new Date(b.date_reunion).getTime())
    const map = new Map<string, any[]>()
    for (const r of sorted) {
      const key = fmtDayKey(r.date_reunion)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
  }, [mes])

  /* ── Actions gestion ── */
  function openCreate() {
    setEditId(null); setForm(EMPTY_FORM)
    setPlatformKey('autre'); setPlatformHint('https://…')
    setFormOpen(true)
  }
  function openEdit(r: any) {
    setEditId(r.id)
    setForm({
      titre: r.titre || '', description: r.description || '', type: r.type || 'physique',
      date_reunion: isoToLocalInput(r.date_reunion), duree_min: r.duree_min ? String(r.duree_min) : '90',
      lieu: r.lieu || '', lien_visio: r.lien_visio || '',
    })
    // Visioconférence V1 : la plateforme est dérivée de l'URL du lien visio existant
    const k = detectMeetingPlatform(r.lien_visio).key
    setPlatformKey(k); setPlatformHint(platformUrlHint(k))
    setFormOpen(true)
  }

  async function submitForm() {
    if (!form.titre.trim()) { toast.error('Le titre est requis.'); return }
    if (!form.date_reunion) { toast.error('La date est requise.'); return }
    const iso = new Date(form.date_reunion).toISOString()
    const duree = parseInt(form.duree_min, 10)
    setSaving(true)
    try {
      const base = {
        titre: form.titre.trim(), description: form.description.trim(), type: form.type,
        date_reunion: iso, duree_min: Number.isFinite(duree) ? duree : undefined,
        lieu: form.lieu.trim(), lien_visio: form.lien_visio.trim(),
      }
      const j = editId
        ? await post({ action: 'update', id: editId, ...base })
        : await post({ action: 'create', groupe_id: selGroupe, ...base })
      if (j?.ok) {
        toast.success(editId ? 'Réunion mise à jour ✓' : 'Réunion créée ✓')
        setFormOpen(false); setEditId(null); setForm(EMPTY_FORM)
        await loadGroupReunions(selGroupe); await loadStats(selGroupe); await loadMes()
      } else toast.error(j?.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setSaving(false)
  }

  async function changeStatut(r: any, statut: string) {
    setBusy(`st-${r.id}`)
    try {
      const j = await post({ action: 'set_statut', id: r.id, statut })
      if (j?.ok) { toast.success('Statut mis à jour ✓'); await loadGroupReunions(selGroupe); await loadStats(selGroupe); await loadMes() }
      else toast.error(j?.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setBusy(null)
  }

  /* ── Feuille de présence ── */
  async function openSheet(r: any) {
    if (sheetReunion === r.id) { setSheetReunion(null); return }
    setSheetReunion(r.id)
    setSheetLoading(true)
    setSheetMembers([]); setSheetEntries({})
    try {
      const [mr, ar] = await Promise.all([
        fetch(`/api/member/groupes?manage=1&members=${encodeURIComponent(selGroupe)}`, { credentials: 'same-origin' }),
        fetch(`/api/member/reunions?reunion_id=${encodeURIComponent(r.id)}&attendance=1`, { credentials: 'same-origin' }),
      ])
      const mj = await mr.json().catch(() => ({}))
      const aj = await ar.json().catch(() => ({}))
      const members = (mj?.ok ? (mj.data || []) : []).filter((m: any) => m.statut === 'actif')
      const existing: any[] = aj?.ok ? (aj.data || []) : []
      const byUser = new Map<string, any>(existing.map((e) => [e.user_id, e]))
      const entries: Record<string, { statut: string; note: string }> = {}
      for (const m of members) {
        const e = byUser.get(m.user_id)
        entries[m.user_id] = { statut: e?.statut || 'present', note: e?.note || '' }
      }
      setSheetMembers(members)
      setSheetEntries(entries)
    } catch { toast.error('Erreur lors du chargement de la feuille') }
    setSheetLoading(false)
  }

  function setEntryStatut(userId: string, statut: string) {
    setSheetEntries((p) => ({ ...p, [userId]: { ...(p[userId] || { note: '' }), statut } }))
  }

  async function saveSheet(reunionId: string) {
    const entries = sheetMembers.map((m) => ({
      user_id: m.user_id,
      statut: sheetEntries[m.user_id]?.statut || 'present',
      note: sheetEntries[m.user_id]?.note || undefined,
    }))
    setBusy(`sheet-${reunionId}`)
    try {
      const j = await post({ action: 'record_attendance', reunion_id: reunionId, entries })
      if (j?.ok) {
        toast.success('Présences enregistrées ✓')
        await loadStats(selGroupe); await loadMes()
      } else toast.error(j?.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setBusy(null)
  }

  /* ── Rendu démo ── */
  if (demo) return (
    <div className="min-h-screen pt-24 pb-16"><div className="container-royal">
      <div className="card-royal p-8 text-center text-pearl/60 font-inter">Mode démo : connectez Supabase pour gérer vos réunions et présences.</div>
    </div></div>
  )

  const par_membre: any[] = stats?.par_membre
    ? [...stats.par_membre].sort((a, b) => (a.stats?.taux_presence ?? 0) - (b.stats?.taux_presence ?? 0))
    : []

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        {/* Header */}
        <div className="mb-8">
          <div className="section-label mb-2">Espace Membre</div>
          <h1 className="font-cinzel font-black text-pearl" style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', lineHeight: 1.05 }}>
            Mes <span className="text-cinematic-gold">Réunions</span>
          </h1>
          <p className="text-pearl/50 text-sm font-inter mt-2">Vos rencontres, votre présence et l&apos;assiduité des groupes que vous animez.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabBtn active={tab === 'mes'} onClick={() => setTab('mes')}>Mes réunions</TabBtn>
          {canManage && <TabBtn active={tab === 'animation'} onClick={() => setTab('animation')}>Animation</TabBtn>}
        </div>

        {/* ── MES RÉUNIONS ── */}
        {tab === 'mes' && (
          loading ? (
            <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="card-royal h-28 animate-pulse opacity-40" />)}</div>
          ) : mes.length === 0 ? (
            <EmptyState title="Aucune réunion programmée" hint="Les réunions de vos groupes apparaîtront ici dès qu'elles seront planifiées." />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key="mes-list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {mesGrouped.map(([day, items]) => (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays className="w-4 h-4" style={{ color: '#D4AF37' }} />
                      <h2 className="font-cinzel text-sm font-bold text-pearl capitalize">{day}</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {items.map((r) => (
                        <div key={r.id} className="card-royal">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-widest font-inter" style={{ color: '#D4AF37' }}>{r.groupe_nom || 'Groupe'}</div>
                              <h3 className="font-cinzel text-base font-bold text-pearl truncate">{r.titre}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <Badge color={STATUT_COLOR[r.statut] || '#9CA3AF'}>{statutLabel(r.statut)}</Badge>
                              {r.ma_presence && <Badge color={PRESENCE_COLOR[r.ma_presence] || '#9CA3AF'}>{presenceLabel(r.ma_presence)}</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-inter text-pearl/45">
                            <span className="inline-flex items-center gap-1">
                              {isVirtuel(r.type) ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{typeLabel(r.type)}
                            </span>
                            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(r.date_reunion)}</span>
                            {r.lieu && !isVirtuel(r.type) && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{r.lieu}</span>}
                          </div>
                          {/* Visioconférence V1 : réunion virtuelle claire + plateforme + bouton Rejoindre */}
                          {isVirtuel(r.type) && (
                            <div className="mt-3 pt-3 border-t border-white/[0.05]">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-inter text-pearl/55">
                                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#D4AF37' }}>
                                  <Video className="w-3.5 h-3.5" /> Réunion virtuelle
                                </span>
                                <span className="text-pearl/30">·</span>
                                <span>Plateforme : <span className="text-pearl/75">{meetingPlatformLabel(r.lien_visio)}</span></span>
                              </div>
                              {r.lien_visio ? (
                                <a href={r.lien_visio} target="_blank" rel="noopener noreferrer"
                                  className="btn-gold text-xs py-2 px-3 mt-2.5 inline-flex items-center justify-center gap-1.5 max-w-full">
                                  <Video className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">Rejoindre la réunion</span>
                                </a>
                              ) : (
                                <span className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-inter text-pearl/40">
                                  <Clock className="w-3.5 h-3.5" /> Lien de connexion à venir
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          )
        )}

        {/* ── ANIMATION ── */}
        {tab === 'animation' && canManage && (
          <AnimatePresence mode="wait">
            <motion.div key="anim" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Synthèse d'assiduité du leader */}
              {overviewLoading && !overview ? (
                <div className="grid lg:grid-cols-2 gap-4">
                  {[0, 1].map((i) => <div key={i} className="card-royal h-56 animate-pulse opacity-40" />)}
                </div>
              ) : overview?.leader ? (
                <div className="grid lg:grid-cols-2 gap-4">
                  <OverviewCard
                    title="Synthèse assiduité — mes groupes"
                    global={overview.leader.global}
                    parGroupe={overview.leader.par_groupe}
                    nbGroupes={overview.leader.nb_groupes}
                  />
                  {overview.perimetre && (
                    <OverviewCard
                      title="Synthèse périmètre"
                      global={overview.perimetre.global}
                      parGroupe={overview.perimetre.par_groupe}
                      nbGroupes={overview.perimetre.nb_groupes}
                    />
                  )}
                </div>
              ) : null}

              {/* Sélecteur + créer */}
              <div className="card-royal flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1">
                  <label className="text-[11px] uppercase tracking-widest font-inter text-pearl/40 block mb-1.5">Groupe animé</label>
                  <select value={selGroupe} onChange={(e) => setSelGroupe(e.target.value)} className="input-royal w-full">
                    {managed.map((g) => (
                      <option key={g.id} value={g.id}>{g.nom}{typeof g.membres_count === 'number' ? ` · ${g.membres_count} membre(s)` : ''}</option>
                    ))}
                  </select>
                </div>
                <button onClick={openCreate} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> Créer une réunion
                </button>
              </div>

              {/* Formulaire create/update */}
              <AnimatePresence>
                {formOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="card-royal space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-cinzel text-sm font-bold text-pearl">{editId ? 'Modifier la réunion' : 'Nouvelle réunion'}</h3>
                        <button onClick={() => { setFormOpen(false); setEditId(null) }} className="text-pearl/40 hover:text-pearl/70"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Titre *" className="sm:col-span-2">
                          <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="input-royal w-full" placeholder="Réunion de cellule…" />
                        </Field>
                        <Field label="Type">
                          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-royal w-full">
                            <option value="physique">Présentiel</option>
                            <option value="virtuelle">En ligne</option>
                            <option value="hybride">Hybride</option>
                          </select>
                        </Field>
                        <Field label="Date et heure *">
                          <input type="datetime-local" value={form.date_reunion} onChange={(e) => setForm({ ...form, date_reunion: e.target.value })} className="input-royal w-full" />
                        </Field>
                        <Field label="Durée (minutes)">
                          <input type="number" min={0} value={form.duree_min} onChange={(e) => setForm({ ...form, duree_min: e.target.value })} className="input-royal w-full" />
                        </Field>
                        <Field label="Lieu">
                          <input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} className="input-royal w-full" placeholder="Adresse ou salle" />
                        </Field>
                        {/* Visioconférence V1 : plateforme (virtuelle/hybride uniquement) — dérivée de l'URL */}
                        {isVirtuel(form.type) && (
                          <Field label="Plateforme de réunion" className="sm:col-span-2">
                            <select
                              value={platformKey}
                              onChange={(e) => {
                                const k = e.target.value
                                setPlatformKey(k)
                                // Applique le placeholder d'exemple SANS écraser une valeur déjà saisie
                                setPlatformHint(platformUrlHint(k))
                              }}
                              className="input-royal w-full"
                            >
                              {MEETING_PLATFORMS.map((p) => (
                                <option key={p.key} value={p.key}>{p.label}</option>
                              ))}
                            </select>
                          </Field>
                        )}
                        {isVirtuel(form.type) && (
                          <Field label="Lien visio" className="sm:col-span-2">
                            <input
                              value={form.lien_visio}
                              onChange={(e) => setForm({ ...form, lien_visio: e.target.value })}
                              className="input-royal w-full"
                              placeholder={platformHint}
                            />
                          </Field>
                        )}
                        <Field label="Description" className="sm:col-span-2">
                          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-royal w-full resize-y" placeholder="Ordre du jour, thème…" />
                        </Field>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={saving} onClick={submitForm} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-1.5 disabled:opacity-60">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? 'Enregistrer' : 'Créer'}
                        </button>
                        <button onClick={() => { setFormOpen(false); setEditId(null) }} className="btn-ghost text-sm px-4 py-2.5">Annuler</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Liste des réunions du groupe */}
              <div className="card-royal">
                <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color: '#D4AF37' }} /> Réunions du groupe</h3>
                {gLoading ? (
                  <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
                ) : gReunions.length === 0 ? (
                  <p className="text-xs text-pearl/35 font-inter">Aucune réunion pour ce groupe. Créez-en une.</p>
                ) : (
                  <div className="space-y-2">
                    {gReunions.map((r) => (
                      <div key={r.id} className="rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm text-pearl/85 font-inter truncate">{r.titre}</p>
                              <Badge color={STATUT_COLOR[r.statut] || '#9CA3AF'}>{statutLabel(r.statut)}</Badge>
                            </div>
                            <p className="text-[11px] text-pearl/40 font-inter mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1">{isVirtuel(r.type) ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{typeLabel(r.type)}</span>
                              <span>·</span><span>{fmtDate(r.date_reunion)}</span>
                              {/* Visioconférence V1 : plateforme dérivée du lien visio */}
                              {isVirtuel(r.type) && (<><span>·</span><span>Plateforme : {meetingPlatformLabel(r.lien_visio)}</span></>)}
                            </p>
                            {/* Visioconférence V1 : bouton Rejoindre (si lien présent) */}
                            {isVirtuel(r.type) && r.lien_visio && (
                              <a href={r.lien_visio} target="_blank" rel="noopener noreferrer"
                                className="btn-ghost text-[11px] py-1.5 px-2.5 mt-2 inline-flex items-center gap-1.5 max-w-full">
                                <Video className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">Rejoindre la réunion</span>
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => openEdit(r)} className="btn-ghost text-xs py-1.5 px-2.5 inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Modifier</button>
                            <button onClick={() => openSheet(r)} className="btn-ghost text-xs py-1.5 px-2.5 inline-flex items-center gap-1">
                              <ClipboardList className="w-3.5 h-3.5" /> Présence{sheetReunion === r.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Changement de statut */}
                        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                          {(['planifiee', 'tenue', 'annulee'] as const).map((s) => (
                            <button key={s} disabled={busy === `st-${r.id}` || r.statut === s} onClick={() => changeStatut(r, s)}
                              className="text-[11px] font-inter px-2.5 py-1 rounded-lg transition-all disabled:opacity-100"
                              style={{
                                background: r.statut === s ? `${STATUT_COLOR[s]}26` : 'rgba(255,255,255,0.04)',
                                color: r.statut === s ? STATUT_COLOR[s] : 'rgba(255,255,255,0.45)',
                                border: `1px solid ${r.statut === s ? `${STATUT_COLOR[s]}59` : 'transparent'}`,
                                cursor: r.statut === s ? 'default' : 'pointer',
                              }}>
                              {STATUT_LABEL[s]}
                            </button>
                          ))}
                        </div>

                        {/* Feuille de présence */}
                        {sheetReunion === r.id && (
                          <div className="px-3 pb-4 border-t border-white/5 pt-3">
                            {sheetLoading ? (
                              <div className="flex items-center gap-2 text-xs text-pearl/40 font-inter py-3"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement de la feuille…</div>
                            ) : sheetMembers.length === 0 ? (
                              <p className="text-xs text-pearl/35 font-inter py-2">Aucun membre actif dans ce groupe.</p>
                            ) : (
                              <>
                                <div className="space-y-1.5">
                                  {sheetMembers.map((m) => {
                                    const cur = sheetEntries[m.user_id]?.statut || 'present'
                                    return (
                                      <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                                        <span className="text-xs text-pearl/75 font-inter truncate min-w-0">{fullName(m.profile, m.user_id)}</span>
                                        <div className="flex gap-1 flex-shrink-0">
                                          {(['present', 'absent', 'excuse'] as const).map((st) => (
                                            <button key={st} onClick={() => setEntryStatut(m.user_id, st)}
                                              className="text-[11px] font-inter px-2.5 py-1 rounded-lg transition-all"
                                              style={{
                                                background: cur === st ? `${PRESENCE_COLOR[st]}26` : 'rgba(255,255,255,0.04)',
                                                color: cur === st ? PRESENCE_COLOR[st] : 'rgba(255,255,255,0.4)',
                                                border: `1px solid ${cur === st ? `${PRESENCE_COLOR[st]}59` : 'transparent'}`,
                                              }}>
                                              {PRESENCE_LABEL[st]}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                <button disabled={busy === `sheet-${r.id}`} onClick={() => saveSheet(r.id)}
                                  className="btn-gold text-xs px-4 py-2 mt-3 inline-flex items-center gap-1.5 disabled:opacity-60">
                                  {busy === `sheet-${r.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Enregistrer les présences
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statistiques */}
              <div className="card-royal">
                <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" style={{ color: '#D4AF37' }} /> Statistiques d&apos;assiduité</h3>
                {statsLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
                ) : !stats || (stats.nb_reunions ?? 0) === 0 ? (
                  <p className="text-xs text-pearl/35 font-inter">Pas encore de données de présence pour ce groupe.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      <Stat label="Taux de présence" value={`${Math.round(stats.global?.taux_presence ?? 0)}%`} accent="#22C55E" />
                      <Stat label="Taux d'assiduité" value={`${Math.round(stats.global?.taux_assiduite ?? 0)}%`} accent="#D4AF37" />
                      <Stat label="Réunions" value={String(stats.nb_reunions ?? 0)} />
                      <Stat label="Présences totales" value={String(stats.global?.present ?? 0)} />
                    </div>
                    {par_membre.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-inter">
                          <thead>
                            <tr className="text-pearl/35 text-left">
                              <th className="pb-2 font-medium">Membre</th>
                              <th className="pb-2 font-medium text-center">Présent</th>
                              <th className="pb-2 font-medium text-center">Absent</th>
                              <th className="pb-2 font-medium text-center">Excusé</th>
                              <th className="pb-2 font-medium text-right">Présence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {par_membre.map((pm) => {
                              const taux = Math.round(pm.stats?.taux_presence ?? 0)
                              return (
                                <tr key={pm.user_id} className="border-t border-white/[0.04]">
                                  <td className="py-2 text-pearl/75 truncate max-w-[160px]">{fullName(pm.profile, pm.user_id)}</td>
                                  <td className="py-2 text-center text-pearl/55">{pm.stats?.present ?? 0}</td>
                                  <td className="py-2 text-center text-pearl/55">{pm.stats?.absent ?? 0}</td>
                                  <td className="py-2 text-center text-pearl/55">{pm.stats?.excuse ?? 0}</td>
                                  <td className="py-2 text-right font-semibold" style={{ color: taux >= 75 ? '#22C55E' : taux >= 50 ? '#F59E0B' : '#EF4444' }}>{taux}%</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        <div className="mt-8">
          <Link href="/member/dashboard/groupes" className="btn-ghost text-sm py-2.5 px-4 inline-flex items-center gap-2"><Users className="w-4 h-4" /> Mes groupes</Link>
        </div>
      </div>
    </div>
  )
}

/* ── Sous-composants ───────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-5 py-2 rounded-xl text-sm font-inter font-medium transition-all"
      style={{ background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)', color: active ? '#D4AF37' : 'rgba(255,255,255,0.45)', border: `1px solid ${active ? 'rgba(212,175,55,0.3)' : 'transparent'}` }}>
      {children}
    </button>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-[9px] font-inter font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${color}1f`, color }}>{children}</span>
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="text-[11px] uppercase tracking-widest font-inter text-pearl/40 block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
      <div className="font-cinzel text-xl font-bold" style={{ color: accent || '#F5F5F0' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-inter text-pearl/35 mt-0.5">{label}</div>
    </div>
  )
}

function OverviewCard({ title, global, parGroupe, nbGroupes }: {
  title: string
  global?: { total?: number; present?: number; absent?: number; excuse?: number; taux_presence?: number; taux_assiduite?: number } | null
  parGroupe?: Array<{ key?: string; nom?: string; stats?: { taux_presence?: number } | null }> | null
  nbGroupes?: number
}) {
  const groupes = Array.isArray(parGroupe) ? parGroupe : []
  const empty = (nbGroupes ?? 0) === 0
  return (
    <div className="card-royal">
      <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" style={{ color: '#D4AF37' }} /> {title}
      </h3>
      {empty ? (
        <p className="text-xs text-pearl/35 font-inter">Aucune donnée d&apos;assiduité.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Taux de présence" value={`${Math.round(global?.taux_presence ?? 0)}%`} accent="#22C55E" />
            <Stat label="Taux d'assiduité" value={`${Math.round(global?.taux_assiduite ?? 0)}%`} accent="#D4AF37" />
            <Stat label="Groupes" value={String(nbGroupes ?? 0)} />
          </div>
          {groupes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-inter">
                <thead>
                  <tr className="text-pearl/35 text-left">
                    <th className="pb-2 font-medium">Groupe</th>
                    <th className="pb-2 font-medium text-right">Présence</th>
                  </tr>
                </thead>
                <tbody>
                  {groupes.map((g, i) => {
                    const taux = Math.round(g.stats?.taux_presence ?? 0)
                    return (
                      <tr key={g.key || i} className="border-t border-white/[0.04]">
                        <td className="py-2 text-pearl/75 truncate max-w-[200px]">{g.nom || '—'}</td>
                        <td className="py-2 text-right font-semibold" style={{ color: taux >= 75 ? '#22C55E' : taux >= 50 ? '#F59E0B' : '#EF4444' }}>{taux}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="card-royal text-center py-14">
      <Calendar className="w-8 h-8 mx-auto mb-3 text-gold/40" />
      <p className="font-inter text-sm text-pearl/55">{title}</p>
      {hint && <p className="font-inter text-xs text-pearl/30 mt-1">{hint}</p>}
      {children}
    </div>
  )
}
