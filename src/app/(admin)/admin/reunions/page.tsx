'use client'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Loader2, Calendar, CalendarDays, Plus, Check, X, MapPin, Video, Users,
  ClipboardList, BarChart3, Inbox, Pencil, Building2, ChevronRight, Globe,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'
import { MEETING_PLATFORMS, detectMeetingPlatform, meetingPlatformLabel, platformUrlHint } from '@/lib/community/meeting-platform'

/* ------------------------------------------------------------------ */
/* Référentiels fixes (value → label)                                  */
/* ------------------------------------------------------------------ */
const PLATEFORMES: { value: string; label: string }[] = [
  { value: 'cier', label: 'CIER' },
  { value: 'familles-chapelle', label: 'Familles de la Chapelle' },
  { value: 'chapelle-familiale', label: 'Chapelle Familiale' },
  { value: 'jeunesse', label: 'Jeunesse' },
  { value: 'femmes-exceptions', label: "Femmes d'Exceptions" },
  { value: 'cite-refuge', label: 'Cité du Refuge' },
  { value: 'mahanaim', label: 'Mahanaïm' },
  { value: 'cfic', label: 'CFIC / Académie des Élus' },
]
const plateformeLabel = (v?: string) => PLATEFORMES.find((p) => p.value === v)?.label || v || '—'

/** Libellés des clés de plateforme renvoyées par l'overview gouvernement. */
const OVERVIEW_PLATEFORME_LABELS: Record<string, string> = {
  cier: 'CIER',
  mahanaim: 'Mahanaïm',
  'familles-chapelle': 'Familles de la Chapelle',
  'femmes-exceptions': "Femmes d'Exceptions",
  jeunesse: 'Jeunesse de la Chapelle',
  'cite-refuge': 'Cité du Refuge',
  cfic: 'CFIC',
  'chapelle-familiale': 'Chapelle Familiale',
}
const overviewPlateformeLabel = (k?: string) =>
  !k || k === '—' ? (k || '—') : OVERVIEW_PLATEFORME_LABELS[k] || k

const TYPE_LABELS: Record<string, string> = { physique: 'Présentiel', virtuelle: 'En ligne', hybride: 'Hybride' }
const typeReunionLabel = (v?: string) => (v ? TYPE_LABELS[v] || v : '—')
const TYPE_OPTIONS = [
  { value: 'physique', label: 'Présentiel' },
  { value: 'virtuelle', label: 'En ligne' },
  { value: 'hybride', label: 'Hybride' },
]

const PRESENCE_LABELS: Record<string, string> = { present: 'Présent', absent: 'Absent', excuse: 'Excusé' }
const PRESENCE_OPTIONS = [
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
  { value: 'excuse', label: 'Excusé' },
]

const STATUT_LABELS: Record<string, string> = { planifiee: 'Planifiée', tenue: 'Tenue', annulee: 'Annulée' }
const statutLabel = (v?: string) => (v ? STATUT_LABELS[v] || v : '—')
const STATUT_OPTIONS = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'tenue', label: 'Tenue' },
  { value: 'annulee', label: 'Annulée' },
]
const statutBadge = (s?: string) =>
  s === 'tenue' ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' }
    : s === 'annulee' ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }
      : s === 'planifiee' ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }

const presenceColor = (s?: string) =>
  s === 'present' ? '#22C55E' : s === 'excuse' ? '#F59E0B' : s === 'absent' ? '#EF4444' : 'rgba(255,255,255,0.5)'

const REUNIONS_API = '/api/admin/reunions'
const GROUPES_API = '/api/admin/groupes'

/* ------------------------------------------------------------------ */
/* Helpers dates                                                       */
/* ------------------------------------------------------------------ */
const fmtDateTime = (s?: string | null) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return s }
}
const fmtTime = (s?: string | null) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
  catch { return s }
}
const fmtDayHeader = (key: string) => {
  try {
    const d = new Date(key + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return key }
}
const dayKey = (s?: string | null) => {
  if (!s) return '—'
  try {
    const d = new Date(s)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch { return '—' }
}
/** ISO → valeur pour <input type="datetime-local"> (en heure locale). */
const isoToLocalInput = (iso?: string | null) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return '' }
}
const pct = (n?: number) => (n == null || isNaN(n) ? '—' : `${Math.round(n)} %`)

/* ------------------------------------------------------------------ */
/* Types formulaire réunion                                            */
/* ------------------------------------------------------------------ */
type ReunionForm = {
  id?: string
  titre: string
  type: string
  date_local: string // valeur datetime-local
  duree_min: string
  lieu: string
  lien_visio: string
  description: string
}
const emptyReunionForm = (): ReunionForm => ({
  titre: '', type: 'physique', date_local: '', duree_min: '', lieu: '', lien_visio: '', description: '',
})

/* ------------------------------------------------------------------ */
/* Types overview gouvernement                                         */
/* ------------------------------------------------------------------ */
type OverviewStats = {
  total: number
  present: number
  absent: number
  excuse: number
  taux_presence: number
  taux_assiduite: number
}
type OverviewRow = { key: string; stats: OverviewStats }
type OverviewData = {
  global: OverviewStats
  par_plateforme: OverviewRow[]
  par_pays: OverviewRow[]
  nb_groupes: number
  nb_releves: number
}

/* ================================================================== */
export default function AdminReunionsPage() {
  const [tab, setTab] = useState<'calendrier' | 'groupe' | 'gouvernement'>('calendrier')

  /* ---------------- Vue calendrier (global) ---------------- */
  const [recent, setRecent] = useState<any[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [errRecent, setErrRecent] = useState<string | null>(null)

  /* ---------------- Sélection de groupe ---------------- */
  const [groupes, setGroupes] = useState<any[]>([])
  const [loadingGroupes, setLoadingGroupes] = useState(true)
  const [errGroupes, setErrGroupes] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState('')

  /* ---------------- Réunions du groupe ---------------- */
  const [groupReunions, setGroupReunions] = useState<any[]>([])
  const [loadingGroupReunions, setLoadingGroupReunions] = useState(false)

  /* ---------------- Statistiques ---------------- */
  const [stats, setStats] = useState<any | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  /* ---------------- Vue gouvernement (overview transverse) ---------------- */
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [errOverview, setErrOverview] = useState<string | null>(null)
  const [ovPlateforme, setOvPlateforme] = useState('')
  const [ovPays, setOvPays] = useState('') // valeur appliquée (déclenche le rechargement)
  const [ovPaysInput, setOvPaysInput] = useState('') // saisie en cours (appliquée sur Entrée/blur)

  /* ---------------- Modale formulaire réunion ---------------- */
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ReunionForm>(emptyReunionForm())
  const [savingForm, setSavingForm] = useState(false)
  // VISIO V1 — plateforme dérivée du lien_visio (affichage/placeholder uniquement, jamais persistée)
  const [platformKey, setPlatformKey] = useState<string>(() => detectMeetingPlatform('').key)
  const [platformPlaceholder, setPlatformPlaceholder] = useState<string>(() => platformUrlHint(detectMeetingPlatform('').key))

  /* ---------------- Feuille de présence ---------------- */
  const [attendanceFor, setAttendanceFor] = useState<any | null>(null) // réunion ciblée
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [attendees, setAttendees] = useState<any[]>([]) // membres actifs + statut courant
  const [savingAttendance, setSavingAttendance] = useState(false)

  const [busy, setBusy] = useState(false)

  const selectedGroup = useMemo(
    () => groupes.find((g) => g.id === selectedGroupId) || null,
    [groupes, selectedGroupId],
  )

  /* ---------------- Chargements ---------------- */
  const loadRecent = useCallback(async () => {
    setLoadingRecent(true); setErrRecent(null)
    try {
      const r = await fetch(REUNIONS_API, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setRecent(j.data || [])
      else setErrRecent(j.message || 'Erreur de chargement')
    } catch { setErrRecent('Erreur réseau') }
    setLoadingRecent(false)
  }, [])

  const loadGroupes = useCallback(async () => {
    setLoadingGroupes(true); setErrGroupes(null)
    try {
      const r = await fetch(GROUPES_API, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setGroupes(j.data || [])
      else setErrGroupes(j.message || 'Erreur de chargement')
    } catch { setErrGroupes('Erreur réseau') }
    setLoadingGroupes(false)
  }, [])

  const loadGroupReunions = useCallback(async (groupeId: string) => {
    if (!groupeId) { setGroupReunions([]); return }
    setLoadingGroupReunions(true)
    try {
      const r = await fetch(`${REUNIONS_API}?groupe_id=${encodeURIComponent(groupeId)}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setGroupReunions(j.data || [])
      else { setGroupReunions([]); toast.error(j.message || 'Erreur') }
    } catch { setGroupReunions([]); toast.error('Erreur réseau') }
    setLoadingGroupReunions(false)
  }, [])

  const loadStats = useCallback(async (groupeId: string) => {
    if (!groupeId) { setStats(null); return }
    setLoadingStats(true)
    try {
      const r = await fetch(`${REUNIONS_API}?groupe_id=${encodeURIComponent(groupeId)}&stats=1`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setStats(j.data || null)
      else { setStats(null) }
    } catch { setStats(null) }
    setLoadingStats(false)
  }, [])

  const loadOverview = useCallback(async (plateforme: string, pays: string) => {
    setLoadingOverview(true); setErrOverview(null)
    try {
      const params = new URLSearchParams({ overview: '1' })
      if (plateforme) params.set('plateforme', plateforme)
      if (pays.trim()) params.set('pays', pays.trim())
      const r = await fetch(`${REUNIONS_API}?${params.toString()}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setOverview((j.data as OverviewData) || null)
      else { setOverview(null); setErrOverview(j.message || 'Erreur de chargement') }
    } catch { setOverview(null); setErrOverview('Erreur réseau') }
    setLoadingOverview(false)
  }, [])

  useEffect(() => { loadRecent() }, [loadRecent])
  useEffect(() => { loadGroupes() }, [loadGroupes])

  // Charge l'overview gouvernement quand l'onglet est actif (et à chaque changement de filtre)
  useEffect(() => {
    if (tab === 'gouvernement') loadOverview(ovPlateforme, ovPays)
  }, [tab, ovPlateforme, ovPays, loadOverview])

  // Quand un groupe est sélectionné : charge réunions + stats
  useEffect(() => {
    if (selectedGroupId) { loadGroupReunions(selectedGroupId); loadStats(selectedGroupId) }
    else { setGroupReunions([]); setStats(null) }
  }, [selectedGroupId, loadGroupReunions, loadStats])

  /* ---------------- POST générique ---------------- */
  const post = useCallback(async (body: Record<string, unknown>): Promise<{ ok: boolean; data?: any }> => {
    setBusy(true)
    try {
      const r = await fetch(REUNIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (j.ok) { toast.success(j.message || 'Action effectuée ✓'); return { ok: true, data: j.data } }
      toast.error(j.message || 'Échec de l’action')
      return { ok: false }
    } catch { toast.error('Erreur réseau'); return { ok: false } }
    finally { setBusy(false) }
  }, [])

  /* ---------------- Formulaire création / édition ---------------- */
  function openCreate() {
    if (!selectedGroupId) { toast.error('Sélectionnez d’abord un groupe.'); return }
    const k = detectMeetingPlatform('').key
    setPlatformKey(k); setPlatformPlaceholder(platformUrlHint(k))
    setForm(emptyReunionForm()); setShowForm(true)
  }
  function openEdit(rn: any) {
    const k = detectMeetingPlatform(rn.lien_visio).key
    setPlatformKey(k); setPlatformPlaceholder(platformUrlHint(k))
    setForm({
      id: rn.id,
      titre: rn.titre || '',
      type: rn.type || 'physique',
      date_local: isoToLocalInput(rn.date_reunion),
      duree_min: rn.duree_min != null ? String(rn.duree_min) : '',
      lieu: rn.lieu || '',
      lien_visio: rn.lien_visio || '',
      description: rn.description || '',
    })
    setShowForm(true)
  }

  async function submitForm() {
    if (!selectedGroupId) { toast.error('Aucun groupe sélectionné.'); return }
    if (!form.titre.trim()) { toast.error('Le titre est obligatoire.'); return }
    if (!form.date_local) { toast.error('La date et l’heure sont obligatoires.'); return }
    let iso: string
    try { iso = new Date(form.date_local).toISOString() }
    catch { toast.error('Date invalide.'); return }
    setSavingForm(true)
    const payload: Record<string, unknown> = {
      action: form.id ? 'update' : 'create',
      ...(form.id ? { id: form.id } : { groupe_id: selectedGroupId }),
      titre: form.titre.trim(),
      description: form.description.trim() || null,
      type: form.type,
      date_reunion: iso,
      duree_min: form.duree_min.trim() === '' ? null : Number(form.duree_min),
      lieu: form.lieu.trim() || null,
      lien_visio: form.lien_visio.trim() || null,
    }
    const res = await post(payload)
    setSavingForm(false)
    if (res.ok) {
      setShowForm(false); setForm(emptyReunionForm())
      await loadGroupReunions(selectedGroupId); await loadStats(selectedGroupId); await loadRecent()
    }
  }

  async function changeStatut(rn: any, statut: string) {
    if (statut === rn.statut) return
    const res = await post({ action: 'set_statut', id: rn.id, statut })
    if (res.ok) { await loadGroupReunions(selectedGroupId); await loadStats(selectedGroupId); await loadRecent() }
  }

  /* ---------------- Feuille de présence ---------------- */
  async function openAttendance(rn: any) {
    if (!selectedGroupId) return
    setAttendanceFor(rn)
    setLoadingAttendance(true)
    setAttendees([])
    try {
      const [mRes, aRes] = await Promise.all([
        fetch(`${GROUPES_API}?members=${encodeURIComponent(selectedGroupId)}`, { credentials: 'same-origin' }),
        fetch(`${REUNIONS_API}?reunion_id=${encodeURIComponent(rn.id)}&attendance=1`, { credentials: 'same-origin' }),
      ])
      const mJson = await mRes.json()
      const aJson = await aRes.json()
      if (!mJson.ok) { toast.error(mJson.message || 'Membres indisponibles'); setLoadingAttendance(false); return }
      const existing: Record<string, { statut: string; note: string }> = {}
      if (aJson.ok) {
        for (const a of aJson.data || []) existing[a.user_id] = { statut: a.statut, note: a.note || '' }
      }
      const actifs = (mJson.data || []).filter((m: any) => m.statut === 'actif')
      setAttendees(actifs.map((m: any) => ({
        user_id: m.user_id,
        profile: m.profile,
        role: m.role,
        statut: existing[m.user_id]?.statut || 'present',
        note: existing[m.user_id]?.note || '',
      })))
    } catch { toast.error('Erreur réseau') }
    setLoadingAttendance(false)
  }
  function closeAttendance() { setAttendanceFor(null); setAttendees([]) }

  function setAttendeeStatut(userId: string, statut: string) {
    setAttendees((prev) => prev.map((a) => (a.user_id === userId ? { ...a, statut } : a)))
  }
  function setAttendeeNote(userId: string, note: string) {
    setAttendees((prev) => prev.map((a) => (a.user_id === userId ? { ...a, note } : a)))
  }
  function markAll(statut: string) {
    setAttendees((prev) => prev.map((a) => ({ ...a, statut })))
  }

  async function saveAttendance() {
    if (!attendanceFor) return
    setSavingAttendance(true)
    const entries = attendees.map((a) => ({ user_id: a.user_id, statut: a.statut, note: a.note?.trim() || undefined }))
    const res = await post({ action: 'record_attendance', reunion_id: attendanceFor.id, entries })
    setSavingAttendance(false)
    if (res.ok) {
      closeAttendance()
      await loadStats(selectedGroupId); await loadGroupReunions(selectedGroupId)
    }
  }

  /* ---------------- Regroupement calendrier ---------------- */
  const recentByDay = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const rn of recent) {
      const k = dayKey(rn.date_reunion)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(rn)
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)) // plus récent en haut
    for (const k of keys) {
      map.get(k)!.sort((a, b) => new Date(b.date_reunion).getTime() - new Date(a.date_reunion).getTime())
    }
    return keys.map((k) => ({ key: k, items: map.get(k)! }))
  }, [recent])

  const presentCount = useMemo(() => attendees.filter((a) => a.statut === 'present').length, [attendees])

  /* ================================================================ */
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Réunions & <span className="text-cinematic-gold">Présences</span></>}
          description="Planifiez les réunions des groupes, tenez les feuilles de présence et suivez l’assiduité par membre."
        />

        {/* Onglets */}
        <div className="flex items-center gap-2 mb-6">
          <TabButton active={tab === 'calendrier'} onClick={() => setTab('calendrier')} icon={CalendarDays} label="Calendrier" count={recent.length} />
          <TabButton active={tab === 'groupe'} onClick={() => setTab('groupe')} icon={Users} label="Par groupe" />
          <TabButton active={tab === 'gouvernement'} onClick={() => setTab('gouvernement')} icon={Globe} label="Gouvernement" />
        </div>

        {/* ============================================================ */}
        {/* ONGLET CALENDRIER (vue globale)                              */}
        {/* ============================================================ */}
        {tab === 'calendrier' && (
          <>
            {errRecent && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{errRecent}</div>}
            {loadingRecent ? (
              <SkeletonList />
            ) : recentByDay.length === 0 ? (
              <EmptyState icon={Calendar} text="Aucune réunion récente sur les plateformes." />
            ) : (
              <div className="space-y-6">
                {recentByDay.map(({ key, items }) => (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-gold/70" />
                      <h3 className="font-cinzel font-bold text-pearl text-sm capitalize">{fmtDayHeader(key)}</h3>
                      <span className="text-[11px] text-pearl/30 font-inter">· {items.length} réunion{items.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((rn) => (
                        <div key={rn.id} className="card-cinematic p-4 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[11px] text-pearl/40 font-inter flex items-center gap-1.5 truncate">
                                <Building2 className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{rn.groupe?.nom || 'Groupe'}</span>
                              </div>
                              <div className="text-[10px] text-pearl/30 font-inter">{plateformeLabel(rn.groupe?.plateforme_id)}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={statutBadge(rn.statut)}>{statutLabel(rn.statut)}</span>
                          </div>
                          <div className="font-inter text-sm text-pearl/85 font-medium leading-snug">{rn.titre || 'Réunion'}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pearl/45 font-inter mt-auto pt-1">
                            <span className="inline-flex items-center gap-1">
                              {rn.type === 'virtuelle' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {typeReunionLabel(rn.type)}
                            </span>
                            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtTime(rn.date_reunion)}</span>
                            {rn.duree_min ? <span>· {rn.duree_min} min</span> : null}
                          </div>
                          {(rn.type === 'virtuelle' || rn.type === 'hybride') && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-pearl/45 font-inter">
                              <span className="inline-flex items-center gap-1">📹 Réunion virtuelle · Plateforme : {meetingPlatformLabel(rn.lien_visio)}</span>
                              {rn.lien_visio && (
                                <a
                                  href={rn.lien_visio}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-abyss whitespace-nowrap"
                                  style={{ background: '#D4AF37' }}
                                >
                                  <Video className="w-3 h-3" /> Rejoindre la réunion
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* ONGLET PAR GROUPE                                            */}
        {/* ============================================================ */}
        {tab === 'groupe' && (
          <>
            {/* Sélecteur de groupe */}
            <div className="card-cinematic p-4 mb-5 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Groupe</label>
                {loadingGroupes ? (
                  <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm h-[42px]"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
                ) : (
                  <select className="input-royal w-full" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                    <option value="">— Sélectionner un groupe —</option>
                    {groupes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nom} — {plateformeLabel(g.plateforme_id)}{g.membres_count != null ? ` (${g.membres_count})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                onClick={openCreate}
                disabled={!selectedGroupId}
                className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-40"
              >
                <Plus className="w-4 h-4" /> Nouvelle réunion
              </button>
            </div>

            {errGroupes && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{errGroupes}</div>}

            {!selectedGroupId ? (
              <EmptyState icon={Users} text="Sélectionnez un groupe pour gérer ses réunions et son assiduité." />
            ) : (
              <div className="grid lg:grid-cols-3 gap-5">
                {/* Colonne réunions */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gold" /> Réunions du groupe
                  </h3>
                  {loadingGroupReunions ? (
                    <SkeletonList rows={4} />
                  ) : groupReunions.length === 0 ? (
                    <EmptyState icon={Inbox} text="Aucune réunion pour ce groupe. Créez-en une." />
                  ) : (
                    <div className="space-y-3">
                      {groupReunions.map((rn) => (
                        <div key={rn.id} className="card-cinematic p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-inter text-sm text-pearl/85 font-medium">{rn.titre || 'Réunion'}</div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pearl/45 font-inter mt-1">
                                <span className="inline-flex items-center gap-1">
                                  {rn.type === 'virtuelle' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                  {typeReunionLabel(rn.type)}
                                </span>
                                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDateTime(rn.date_reunion)}</span>
                                {rn.duree_min ? <span>· {rn.duree_min} min</span> : null}
                                {rn.lieu ? <span className="truncate">· {rn.lieu}</span> : null}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0" style={statutBadge(rn.statut)}>{statutLabel(rn.statut)}</span>
                          </div>
                          {(rn.type === 'virtuelle' || rn.type === 'hybride') && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-pearl/45 font-inter mt-2">
                              <span className="inline-flex items-center gap-1">📹 Réunion virtuelle · Plateforme : {meetingPlatformLabel(rn.lien_visio)}</span>
                              {rn.lien_visio && (
                                <a
                                  href={rn.lien_visio}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-abyss whitespace-nowrap"
                                  style={{ background: '#D4AF37' }}
                                >
                                  <Video className="w-3 h-3" /> Rejoindre la réunion
                                </a>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                            <select
                              className="input-royal text-xs py-1.5 px-2 w-[130px]"
                              value={rn.statut || 'planifiee'}
                              onChange={(e) => changeStatut(rn, e.target.value)}
                              disabled={busy}
                              title="Statut de la réunion"
                            >
                              {STATUT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <button onClick={() => openAttendance(rn)} className="btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
                              <ClipboardList className="w-3.5 h-3.5" /> Feuille de présence
                            </button>
                            <button onClick={() => openEdit(rn)} className="text-pearl/40 hover:text-gold p-1.5 ml-auto" title="Modifier"><Pencil className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Colonne statistiques */}
                <div className="space-y-4">
                  <h3 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gold" /> Statistiques
                  </h3>
                  {loadingStats ? (
                    <div className="card-cinematic p-4"><div className="flex items-center gap-2 text-pearl/40 font-inter text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div></div>
                  ) : !stats || !stats.nb_reunions ? (
                    <div className="card-cinematic p-6 text-center text-pearl/40 font-inter text-sm">
                      <BarChart3 className="w-6 h-6 mx-auto mb-2 text-gold/40" />
                      Pas encore de présences enregistrées.
                    </div>
                  ) : (
                    <>
                      <div className="card-royal grid grid-cols-2 gap-3">
                        <StatTile label="Taux de présence" value={pct(stats.global?.taux_presence)} accent />
                        <StatTile label="Taux d’assiduité" value={pct(stats.global?.taux_assiduite)} />
                        <StatTile label="Présents" value={String(stats.global?.present ?? 0)} small />
                        <StatTile label="Absents" value={String(stats.global?.absent ?? 0)} small />
                        <StatTile label="Excusés" value={String(stats.global?.excuse ?? 0)} small />
                        <StatTile label="Réunions" value={String(stats.nb_reunions ?? 0)} small />
                      </div>

                      {/* Par membre — du moins au plus assidu */}
                      <div className="card-cinematic p-4">
                        <p className="font-inter text-xs text-pearl/45 mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Assiduité par membre</p>
                        {(!stats.par_membre || stats.par_membre.length === 0) ? (
                          <p className="text-pearl/35 font-inter text-xs">Aucun membre suivi.</p>
                        ) : (
                          <div className="space-y-2">
                            {[...stats.par_membre]
                              .sort((a: any, b: any) => (a.stats?.taux_presence ?? a.stats?.taux_assiduite ?? 0) - (b.stats?.taux_presence ?? b.stats?.taux_assiduite ?? 0))
                              .map((m: any) => {
                                const p = m.profile
                                const name = p ? `${p.prenom || ''} ${p.nom || ''}`.trim() || m.user_id : m.user_id
                                const taux = m.stats?.taux_presence ?? m.stats?.taux_assiduite
                                return (
                                  <div key={m.user_id} className="flex items-center gap-2">
                                    <span className="font-inter text-xs text-pearl/70 truncate flex-1">{name}</span>
                                    <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0">
                                      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, taux || 0))}%`, background: '#D4AF37' }} />
                                    </div>
                                    <span className="font-inter text-[11px] text-pearl/50 w-10 text-right flex-shrink-0">{pct(taux)}</span>
                                  </div>
                                )
                              })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* ONGLET GOUVERNEMENT (synthèse d'assiduité transverse)        */}
        {/* ============================================================ */}
        {tab === 'gouvernement' && (
          <>
            {/* Filtres */}
            <div className="card-cinematic p-4 mb-5 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Plateforme</label>
                <select className="input-royal w-full" value={ovPlateforme} onChange={(e) => setOvPlateforme(e.target.value)}>
                  <option value="">Toutes les plateformes</option>
                  {PLATEFORMES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Pays</label>
                <input
                  className="input-royal w-full"
                  value={ovPaysInput}
                  onChange={(e) => setOvPaysInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setOvPays(ovPaysInput.trim()) }}
                  onBlur={() => { if (ovPaysInput.trim() !== ovPays) setOvPays(ovPaysInput.trim()) }}
                  placeholder="Tous les pays (Entrée pour filtrer)"
                />
              </div>
              {(ovPlateforme || ovPays) && (
                <button
                  onClick={() => { setOvPlateforme(''); setOvPays(''); setOvPaysInput('') }}
                  className="btn-ghost text-sm px-4 py-2.5 whitespace-nowrap"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {errOverview && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{errOverview}</div>}

            {loadingOverview ? (
              <SkeletonList rows={5} />
            ) : !overview ? (
              <EmptyState icon={Globe} text="Synthèse indisponible pour le moment." />
            ) : overview.nb_releves === 0 ? (
              <EmptyState icon={Inbox} text="Aucune présence enregistrée pour le moment." />
            ) : (
              <div className="space-y-6">
                {/* KPI globaux */}
                <div className="card-royal grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatTile label="Taux de présence" value={pct(overview.global?.taux_presence)} accent />
                  <StatTile label="Assiduité" value={pct(overview.global?.taux_assiduite)} />
                  <StatTile label="Groupes" value={String(overview.nb_groupes ?? 0)} />
                  <StatTile label="Relevés" value={String(overview.nb_releves ?? 0)} />
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                  {/* Par plateforme */}
                  <div className="space-y-3">
                    <h3 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gold" /> Par plateforme
                    </h3>
                    {(!overview.par_plateforme || overview.par_plateforme.length === 0) ? (
                      <EmptyState icon={Inbox} text="Aucune donnée par plateforme." />
                    ) : (
                      <div className="card-cinematic p-4 space-y-3">
                        {overview.par_plateforme.map((row) => (
                          <OverviewBar key={row.key} label={overviewPlateformeLabel(row.key)} stats={row.stats} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Par pays */}
                  <div className="space-y-3">
                    <h3 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gold" /> Par pays
                    </h3>
                    {(!overview.par_pays || overview.par_pays.length === 0) ? (
                      <EmptyState icon={Inbox} text="Aucune donnée par pays." />
                    ) : (
                      <div className="card-cinematic p-4 space-y-3">
                        {overview.par_pays.map((row) => (
                          <OverviewBar key={row.key} label={row.key === '—' || !row.key ? '—' : row.key} stats={row.stats} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODALE FORMULAIRE RÉUNION                                    */}
      {/* ============================================================ */}
      {showForm && (
        <Modal onClose={() => !savingForm && setShowForm(false)} title={form.id ? 'Modifier la réunion' : 'Nouvelle réunion'} icon={Calendar}>
          {selectedGroup && (
            <p className="text-[11px] text-pearl/40 font-inter mb-4 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> {selectedGroup.nom} · {plateformeLabel(selectedGroup.plateforme_id)}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Titre *" full>
              <input className="input-royal w-full" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex. Cellule du mardi" />
            </Field>
            <Field label="Type">
              <select className="input-royal w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Durée (minutes)">
              <input type="number" className="input-royal w-full" value={form.duree_min} onChange={(e) => setForm({ ...form, duree_min: e.target.value })} placeholder="Ex. 90" />
            </Field>
            <Field label="Date & heure *" full>
              <input type="datetime-local" className="input-royal w-full" value={form.date_local} onChange={(e) => setForm({ ...form, date_local: e.target.value })} />
            </Field>
            <Field label="Lieu">
              <input className="input-royal w-full" value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} placeholder="Adresse ou salle" />
            </Field>
            {(form.type === 'virtuelle' || form.type === 'hybride') && (
              <Field label="Plateforme de réunion">
                <select
                  className="input-royal w-full"
                  value={platformKey}
                  onChange={(e) => {
                    const k = e.target.value
                    setPlatformKey(k)
                    setPlatformPlaceholder(platformUrlHint(k))
                  }}
                >
                  {MEETING_PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </Field>
            )}
            <Field label="Lien visio">
              <input className="input-royal w-full" value={form.lien_visio} onChange={(e) => setForm({ ...form, lien_visio: e.target.value })} placeholder={platformPlaceholder} />
            </Field>
            <Field label="Description" full>
              <textarea className="input-royal w-full resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ordre du jour, thème…" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowForm(false)} disabled={savingForm} className="btn-ghost text-sm px-4 py-2.5">Annuler</button>
            <button onClick={submitForm} disabled={savingForm} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
              {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {form.id ? 'Enregistrer' : 'Créer la réunion'}
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* FEUILLE DE PRÉSENCE                                          */}
      {/* ============================================================ */}
      {attendanceFor && (
        <Modal onClose={() => !savingAttendance && closeAttendance()} title={`Présences — ${attendanceFor.titre || 'Réunion'}`} icon={ClipboardList} wide>
          <p className="text-[11px] text-pearl/40 font-inter mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDateTime(attendanceFor.date_reunion)}</span>
            <span className="inline-flex items-center gap-1"><ChevronRight className="w-3 h-3" /> {typeReunionLabel(attendanceFor.type)}</span>
          </p>

          {loadingAttendance ? (
            <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-8"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des membres…</div>
          ) : attendees.length === 0 ? (
            <EmptyState icon={Users} text="Aucun membre actif dans ce groupe." />
          ) : (
            <>
              {/* Barre d'actions rapides */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[11px] text-pearl/40 font-inter mr-1">Marquer tous :</span>
                {PRESENCE_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => markAll(o.value)} className="btn-ghost text-xs px-3 py-1.5">{o.label}</button>
                ))}
                <span className="ml-auto text-[11px] text-pearl/40 font-inter">{presentCount}/{attendees.length} présents</span>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {attendees.map((a) => {
                  const p = a.profile
                  const name = p ? `${p.prenom || ''} ${p.nom || ''}`.trim() || p.email || a.user_id : a.user_id
                  return (
                    <div key={a.user_id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-inter text-sm text-pearl/85 truncate">{name}</div>
                        {p?.email && <div className="text-[11px] text-pearl/35 font-inter truncate">{p.email}</div>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {PRESENCE_OPTIONS.map((o) => {
                          const on = a.statut === o.value
                          return (
                            <button
                              key={o.value}
                              onClick={() => setAttendeeStatut(a.user_id, o.value)}
                              className="text-xs font-inter px-3 py-1.5 rounded-lg transition-colors"
                              style={on
                                ? { background: presenceColor(o.value), color: '#0a0a0a', fontWeight: 600 }
                                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' }}
                            >
                              {o.label}
                            </button>
                          )
                        })}
                      </div>
                      <input
                        className="input-royal text-xs py-1.5 px-2 w-full sm:w-[160px]"
                        value={a.note}
                        onChange={(e) => setAttendeeNote(a.user_id, e.target.value)}
                        placeholder="Note (optionnel)"
                      />
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={closeAttendance} disabled={savingAttendance} className="btn-ghost text-sm px-4 py-2.5">Annuler</button>
                <button onClick={saveAttendance} disabled={savingAttendance} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
                  {savingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

/* ================================================================== */
/* Sous-composants UI                                                  */
/* ================================================================== */
function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-inter inline-flex items-center gap-2 transition-colors ${active ? 'text-abyss' : 'text-pearl/55 hover:text-pearl/80'}`}
      style={active ? { background: '#D4AF37' } : { background: 'rgba(255,255,255,0.04)' }}
    >
      <Icon className="w-4 h-4" /> {label}
      {typeof count === 'number' && count > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={active ? { background: 'rgba(0,0,0,0.18)', color: '#1a1a1a' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{count}</span>
      )}
    </button>
  )
}

function StatTile({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
      <div className={`font-cinzel font-bold ${small ? 'text-base' : 'text-2xl'}`} style={{ color: accent ? '#D4AF37' : 'rgba(255,255,255,0.85)' }}>{value}</div>
      <div className="text-[10px] text-pearl/40 font-inter mt-0.5 leading-tight">{label}</div>
    </div>
  )
}

function OverviewBar({ label, stats }: { label: string; stats: OverviewStats }) {
  const presence = Math.max(0, Math.min(100, stats?.taux_presence || 0))
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-inter text-sm text-pearl/80 truncate">{label}</span>
        <span className="font-inter text-[11px] text-pearl/45 flex-shrink-0">
          {stats?.present ?? 0}/{stats?.total ?? 0}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${presence}%`, background: '#D4AF37' }} />
        </div>
        <span className="font-inter text-[11px] text-pearl/55 w-10 text-right flex-shrink-0">{pct(stats?.taux_presence)}</span>
      </div>
      <div className="text-[10px] text-pearl/35 font-inter mt-1">
        Assiduité : {pct(stats?.taux_assiduite)}
      </div>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-[11px] text-pearl/45 font-inter mb-1">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, icon: Icon, children, onClose, wide }: { title: string; icon: any; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(5,7,12,0.78)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className={`card-royal w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cinzel font-bold text-pearl text-lg flex items-center gap-2 min-w-0">
            <Icon className="w-5 h-5 text-gold flex-shrink-0" /> <span className="truncate">{title}</span>
          </h2>
          <button onClick={onClose} className="text-pearl/40 hover:text-pearl p-1.5 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card-cinematic p-4 space-y-3">
      <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm pb-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">
      <Icon className="w-7 h-7 mx-auto mb-3 text-gold/50" />
      {text}
    </div>
  )
}
