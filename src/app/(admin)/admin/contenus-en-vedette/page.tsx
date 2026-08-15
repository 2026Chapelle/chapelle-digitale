'use client'
/**
 * V2.9-B — CMS « Contenus en vedette » (accueil). Trois onglets :
 *   • Formations  → public.formations, type <> 'parcours'
 *   • Parcours    → public.formations, type = 'parcours'   (JAMAIS public.parcours)
 *   • Événements  → public.cms_events
 * Mise en vedette on/off + ordre éditorial, via la route étroite /api/admin/featured
 * (garde admin serveur, limites 3/3/6, ordres non dupliqués). Miniature entière
 * (object-contain), lien vers l'édition complète, confirmation seulement après succès.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Star, Loader2, Check, ExternalLink, AlertTriangle, Search, Info } from 'lucide-react'
import { deriveDisplayType, isParcoursType, FEATURED_LIMITS } from '@/lib/cms/featured'

type Tab = 'formations' | 'parcours' | 'evenements'
type Resource = 'formations' | 'cms_events'

interface Item {
  id: string
  resource: Resource
  title: string
  image: string | null
  statusRaw: string
  isPublished: boolean
  summary: string
  typeLabel: string | null
  typeRaw: string | null
  editHref: string
  dateInfo: string | null
  is_featured: boolean
  order: number
}

const IMG_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i
const looksImage = (u?: string | null) => !!u && (IMG_RE.test(u) || /^https?:\/\//i.test(u))

function fmtDate(iso?: string | null) {
  if (!iso) return null
  try { return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return null }
}

export default function ContenusEnVedettePage() {
  const [formations, setFormations] = useState<Item[]>([])
  const [events, setEvents] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<Tab>('formations')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Édition locale (overlay) + état par ligne.
  const [edits, setEdits] = useState<Record<string, { is_featured: boolean; order: number }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})

  const mapFormation = (f: any): Item => ({
    id: f.id, resource: 'formations',
    title: f.titre || f.title || 'Sans titre',
    image: looksImage(f.image_couverture) ? f.image_couverture : null,
    statusRaw: f.statut || 'brouillon',
    isPublished: f.statut === 'publie',
    summary: f.contenu_court || f.description || '',
    typeRaw: f.type || null,
    typeLabel: deriveDisplayType(f.type),
    editHref: '/admin/formations',
    dateInfo: null,
    is_featured: f.is_featured === true,
    order: Number(f.featured_order ?? 0),
  })
  const mapEvent = (e: any): Item => ({
    id: e.id, resource: 'cms_events',
    title: e.title || 'Sans titre',
    image: looksImage(e.cover_url) ? e.cover_url : null,
    statusRaw: e.status || 'draft',
    isPublished: e.status === 'published',
    summary: e.description || '',
    typeRaw: null, typeLabel: null,
    editHref: '/admin/evenements',
    dateInfo: fmtDate(e.starts_at),
    is_featured: e.is_featured === true,
    order: Number(e.sort_order ?? 0),
  })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rf, re] = await Promise.all([
        fetch('/api/admin/lms/formations', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/admin/cms/events', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({})),
      ])
      if (rf?.demo || re?.demo) { setDemo(true); setFormations([]); setEvents([]) }
      else {
        setDemo(false)
        setFormations(Array.isArray(rf?.data) ? rf.data.map(mapFormation) : [])
        setEvents(Array.isArray(re?.data) ? re.data.map(mapEvent) : [])
      }
      setEdits({})
    } catch { setError('Erreur de chargement.') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Valeurs effectives (base + overlay d'édition).
  const eff = (it: Item) => edits[it.id] ?? { is_featured: it.is_featured, order: it.order }
  const isDirty = (it: Item) => {
    const e = edits[it.id]; return !!e && (e.is_featured !== it.is_featured || e.order !== it.order)
  }
  const setEdit = (it: Item, patch: Partial<{ is_featured: boolean; order: number }>) =>
    setEdits((prev) => ({ ...prev, [it.id]: { ...eff(it), ...patch } }))

  // Comptes de vedettes ACTIVES par groupe (base, hors overlay non enregistré).
  const counts = useMemo(() => ({
    formations: formations.filter((f) => f.is_featured && !isParcoursType(f.typeRaw)).length,
    parcours: formations.filter((f) => f.is_featured && isParcoursType(f.typeRaw)).length,
    events: events.filter((e) => e.is_featured).length,
  }), [formations, events])

  const group: Record<Tab, 'formations' | 'parcours' | 'events'> = { formations: 'formations', parcours: 'parcours', evenements: 'events' }
  const limitFor: Record<Tab, number> = { formations: FEATURED_LIMITS.formations, parcours: FEATURED_LIMITS.parcours, evenements: FEATURED_LIMITS.events }

  const rows = useMemo(() => {
    let base: Item[] =
      tab === 'evenements' ? events
      : formations.filter((f) => tab === 'parcours' ? isParcoursType(f.typeRaw) : !isParcoursType(f.typeRaw))
    const q = search.trim().toLowerCase()
    if (q) base = base.filter((it) => it.title.toLowerCase().includes(q))
    if (statusFilter !== 'all') base = base.filter((it) => it.statusRaw === statusFilter)
    // Tri : vedettes d'abord, par ordre, puis titre.
    return [...base].sort((a, b) => {
      const ea = eff(a), eb = eff(b)
      if (ea.is_featured !== eb.is_featured) return ea.is_featured ? -1 : 1
      if (ea.order !== eb.order) return ea.order - eb.order
      return a.title.localeCompare(b.title)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, events, formations, search, statusFilter, edits])

  const statusOptions = tab === 'evenements'
    ? [{ v: 'all', l: 'Tous statuts' }, { v: 'published', l: 'Publié' }, { v: 'draft', l: 'Brouillon' }]
    : [{ v: 'all', l: 'Tous statuts' }, { v: 'publie', l: 'Publié' }, { v: 'brouillon', l: 'Brouillon' }, { v: 'archive', l: 'Archivé' }]

  async function save(it: Item) {
    const e = eff(it)
    setSavingId(it.id); setSavedId(null)
    setRowError((p) => { const n = { ...p }; delete n[it.id]; return n })
    try {
      const r = await fetch('/api/admin/featured', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ resource: it.resource, id: it.id, is_featured: e.is_featured, order: e.order }),
      })
      const j = await r.json()
      if (!j.ok) { setRowError((p) => ({ ...p, [it.id]: j.message || 'Échec.' })); setSavingId(null); return }
      // Applique la valeur autoritative serveur à la base.
      const apply = (arr: Item[]) => arr.map((x) => x.id === it.id
        ? { ...x, is_featured: !!(j.data?.is_featured ?? e.is_featured), order: Number(j.data?.featured_order ?? j.data?.sort_order ?? e.order) }
        : x)
      if (it.resource === 'formations') setFormations(apply); else setEvents(apply)
      setEdits((prev) => { const n = { ...prev }; delete n[it.id]; return n })
      setSavedId(it.id); setTimeout(() => setSavedId((c) => (c === it.id ? null : c)), 2500)
    } catch { setRowError((p) => ({ ...p, [it.id]: 'Erreur réseau.' })) }
    setSavingId(null)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'formations', label: 'Formations' }, { id: 'parcours', label: 'Parcours' }, { id: 'evenements', label: 'Événements' },
  ]

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Contenu & CMS"
          title={<>Contenus en <span className="text-cinematic-gold">vedette</span></>}
          description="Sélectionnez et ordonnez ce qui apparaît en avant sur l'accueil."
        />

        <div className="card-cinematic p-3 mb-5 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-gold/70 flex-shrink-0 mt-0.5" />
          <p className="font-inter text-xs text-pearl/55 leading-relaxed">
            Tant qu'aucun contenu n'est sélectionné, l'accueil utilise automatiquement les dernières formations publiées
            (et les prochains événements). Dès qu'au moins un contenu est mis en vedette, seuls les contenus sélectionnés
            s'affichent — la sélection partielle n'est jamais complétée automatiquement.
            Limites : {FEATURED_LIMITS.formations} formations · {FEATURED_LIMITS.parcours} parcours · {FEATURED_LIMITS.events} événements.
          </p>
        </div>

        {demo && (
          <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour piloter les contenus.</div>
        )}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {/* Onglets */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setStatusFilter('all'); setSearch('') }}
              className={`px-4 py-2 rounded-xl text-sm font-inter font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-gold text-black' : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10 hover:text-pearl/80'}`}>
              {t.label} <span className="opacity-70">· {counts[group[t.id]]}/{limitFor[t.id]}</span>
            </button>
          ))}
        </div>

        {/* Recherche + filtre statut */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pearl/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par titre…"
              className="input-royal w-full pl-9" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-royal w-auto">
            {statusOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic text-center py-14">
            {tab === 'parcours' ? (
              <p className="font-inter text-sm text-pearl/50 max-w-md mx-auto">
                Aucun parcours éditorial disponible. Modifiez le type des formations concernées en « Parcours » depuis <Link href="/admin/formations" className="text-gold hover:underline">Formations</Link>.
              </p>
            ) : (
              <p className="font-inter text-sm text-pearl/40">Aucun contenu pour ces filtres.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((it) => {
              const e = eff(it)
              const dirty = isDirty(it)
              const err = rowError[it.id]
              return (
                <div key={it.id} className="card-cinematic p-4 flex flex-col sm:flex-row gap-4">
                  {/* Miniature ENTIÈRE (object-contain) sur fond neutre */}
                  <div className="w-full sm:w-40 flex-shrink-0">
                    <div className="w-full aspect-[16/9] rounded-lg border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden">
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt="" loading="lazy" decoding="async" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-inter text-amber-400/80"><AlertTriangle className="w-3.5 h-3.5" /> Aucune image</span>
                      )}
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {it.typeLabel && <span className="text-[10px] font-inter font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>{it.typeLabel}</span>}
                      <span className="text-[10px] font-inter font-semibold px-2 py-0.5 rounded-full" style={it.isPublished ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' } : { background: 'rgba(107,114,128,0.15)', color: '#9CA3AF' }}>
                        {it.isPublished ? 'Publié' : (it.statusRaw === 'archive' ? 'Archivé' : 'Brouillon')}
                      </span>
                      {it.dateInfo && <span className="text-[11px] font-inter text-pearl/40">{it.dateInfo}</span>}
                    </div>
                    <h3 className="font-cinzel font-bold text-pearl text-sm truncate">{it.title}</h3>
                    {it.summary && <p className="text-xs font-inter text-pearl/45 line-clamp-2 mt-1">{it.summary}</p>}
                    <Link href={it.editHref} className="inline-flex items-center gap-1 text-[11px] font-inter text-gold/70 hover:text-gold mt-2">
                      <ExternalLink className="w-3 h-3" /> Modifier le contenu complet
                    </Link>
                    {err && <p className="text-[11px] text-danger font-inter mt-2">{err}</p>}
                  </div>

                  {/* Contrôles vedette */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:w-44 flex-shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={e.is_featured} onChange={(ev) => setEdit(it, { is_featured: ev.target.checked })} />
                      <span className="text-xs font-inter text-pearl/70 inline-flex items-center gap-1"><Star className={`w-3.5 h-3.5 ${e.is_featured ? 'text-gold' : 'text-pearl/30'}`} /> En vedette</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-inter text-pearl/50">
                      Ordre
                      <input type="number" min={0} value={e.order}
                        onChange={(ev) => setEdit(it, { order: Math.max(0, Math.trunc(Number(ev.target.value) || 0)) })}
                        className="input-royal w-20 py-1.5 text-sm" />
                    </label>
                    <button onClick={() => save(it)} disabled={!dirty || savingId === it.id}
                      className="btn-gold-cinematic px-4 py-2 text-xs disabled:opacity-40 w-full sm:w-auto justify-center">
                      {savingId === it.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> …</>
                        : savedId === it.id ? <><Check className="w-3.5 h-3.5" /> Enregistré</>
                        : <>Enregistrer</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
