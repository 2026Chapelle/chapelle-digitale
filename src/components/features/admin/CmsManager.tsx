'use client'
/**
 * Gestionnaire CRUD générique du back-office CMS.
 *
 * Pilote n'importe quelle table cms_* via /api/admin/cms/<resource> :
 * liste, création, édition (modale), publication/activation, ordre, suppression.
 *
 * En mode démo (Supabase non configuré) l'API renvoie { demo:true } : on affiche
 * un bandeau invitant à connecter Supabase, sans rien casser.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, Eye, EyeOff, Database, Loader2, Check, ExternalLink, Copy } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'url' | 'datetime' | 'select' | 'tags' | 'file' | 'json' | 'ref-select' | 'media-select'

export interface FieldDef {
  name: string
  label: string
  type?: FieldType
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  /** Masquer dans le tableau (édité dans la modale uniquement). */
  hideInTable?: boolean
  /** Valeur par défaut à la création. */
  default?: any
  /** Pour type 'file' : filtre l'explorateur (ex. 'image/*', 'application/pdf,video/*'). */
  accept?: string
  /** Pour type 'ref-select' : ressource à lister comme options (ex: 'formations'). La valeur stockée reste l'UUID (row.id). */
  refResource?: string
  /** Pour type 'ref-select' : base d'API de la liste (défaut : apiBase du CmsManager). */
  refApiBase?: string
  /** Pour type 'ref-select' : construit le libellé lisible d'une option depuis sa ligne. */
  refLabel?: (row: any) => string
  /** Pour type 'ref-select' : filtre optionnel des options selon la ligne en cours d'édition. */
  refFilter?: (row: any, editing: any) => boolean
  /** Pour type 'ref-select' : libellé de l'option vide (ex: 'Aucun prérequis'). */
  emptyLabel?: string
  /** Pour type 'media-select' : filtre les médias proposés (ex: vidéos/youtube uniquement). */
  mediaFilter?: (row: any) => boolean
  /** Pour type 'media-select' : à la sélection, renvoie les champs (existants) à fusionner dans le formulaire. Ne crée aucune colonne. */
  mediaApply?: (row: any, editing: any) => Record<string, any>
}

interface CmsManagerProps {
  resource: string            // ex: 'pages', 'lives', 'podcasts'
  eyebrow?: string
  title: React.ReactNode
  description?: string
  fields: FieldDef[]
  /** Colonne de statut : 'status' (draft/published) ou 'is_active' (bool). */
  statusField?: 'status' | 'is_active'
  /** Libellé de l'élément singulier (ex: « page », « live »). */
  itemLabel?: string
  /** Base d'API CRUD (défaut: /api/admin/cms). Ex: /api/admin/lms pour le LMS. */
  apiBase?: string
  /** Affiche le bouton Aperçu (route /preview). Désactiver pour les tables sans page publique. */
  previewable?: boolean
  /** Nom de la colonne de statut (défaut 'status'). Ex: 'statut' pour la table formations. */
  statusColumn?: string
  /** Valeur "publié" (défaut 'published'). Ex: 'publie'. */
  publishedValue?: string
  /** Valeur "brouillon" (défaut 'draft'). Ex: 'brouillon'. */
  draftValue?: string
}

type Row = Record<string, any>

export function CmsManager({ resource, eyebrow = 'Administration', title, description, fields, statusField = 'status', itemLabel = 'élément', apiBase = '/api/admin/cms', previewable = true, statusColumn = 'status', publishedValue = 'published', draftValue = 'draft' }: CmsManagerProps) {
  const [rows, setRows] = useState<Row[]>([])
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Row | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  // Options des champs 'ref-select' (listes déportées), + drapeau d'échec pour repli en saisie manuelle.
  const [refOptions, setRefOptions] = useState<Record<string, Row[]>>({})
  const [refFailed, setRefFailed] = useState<Record<string, boolean>>({})

  const base = `${apiBase}/${resource}`

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(base, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) { setDemo(true); setRows([]) }
      else if (j.ok) { setDemo(false); setRows(j.data || []) }
      else setError(j.message || 'Erreur de chargement')
    } catch { setError('Erreur réseau') }
    setLoading(false)
  }, [base])

  useEffect(() => { load() }, [load])

  // Charge (à l'ouverture de la modale) les listes des champs 'ref-select'. Une seule fois par ressource.
  // En cas d'échec : on marque la ressource pour retomber proprement en saisie manuelle (jamais bloquant).
  useEffect(() => {
    if (!editing) return
    for (const f of fields) {
      if ((f.type !== 'ref-select' && f.type !== 'media-select') || !f.refResource) continue
      const res = f.refResource
      if (refOptions[res] || refFailed[res]) continue
      const url = `${f.refApiBase ?? apiBase}/${res}`
      ;(async () => {
        try {
          const r = await fetch(url, { credentials: 'same-origin' })
          const j = await r.json()
          if (j.ok && Array.isArray(j.data)) setRefOptions((p) => ({ ...p, [res]: j.data }))
          else setRefFailed((p) => ({ ...p, [res]: true }))
        } catch { setRefFailed((p) => ({ ...p, [res]: true })) }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const tableFields = useMemo(() => fields.filter((f) => !f.hideInTable), [fields])

  function openNew() {
    const blank: Row = {}
    for (const f of fields) blank[f.name] = f.default ?? (f.type === 'boolean' ? true : '')
    if (statusField === 'status' && !blank[statusColumn]) blank[statusColumn] = draftValue
    if (statusField === 'is_active' && blank.is_active === '') blank.is_active = true
    blank.sort_order = rows.length
    setEditing(blank); setIsNew(true)
  }
  function openEdit(row: Row) { setEditing({ ...row }); setIsNew(false) }
  function closeModal() { setEditing(null); setSaving(false) }

  async function save() {
    if (!editing) return
    setSaving(true); setError(null)
    const payload: Row = { ...editing }
    // normalise les tags "a, b" → ['a','b']
    for (const f of fields) {
      // 'media-select' est un champ VIRTUEL d'aide à la saisie : jamais persisté (aucune colonne).
      if (f.type === 'media-select') { delete payload[f.name]; continue }
      if (f.type === 'tags' && typeof payload[f.name] === 'string') {
        payload[f.name] = payload[f.name].split(',').map((s: string) => s.trim()).filter(Boolean)
      }
      if (f.type === 'number' && payload[f.name] !== '' && payload[f.name] != null) {
        payload[f.name] = Number(payload[f.name])
      }
      if ((f.type === 'datetime') && payload[f.name] === '') payload[f.name] = null
      if (f.type === 'json' && typeof payload[f.name] === 'string') {
        const raw = (payload[f.name] as string).trim()
        try { payload[f.name] = raw === '' ? null : JSON.parse(raw) }
        catch { setError(`JSON invalide pour « ${f.label} »`); setSaving(false); return }
      }
    }
    try {
      const r = await fetch(base, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (j.ok) { closeModal(); load() }
      else { setError(j.message || 'Échec de l’enregistrement'); setSaving(false) }
    } catch { setError('Erreur réseau'); setSaving(false) }
  }

  async function duplicate(row: Row) {
    const copy: Row = { ...row }
    delete copy.id; delete copy.created_at; delete copy.updated_at
    for (const k of ['title', 'titre', 'public_title']) if (copy[k]) copy[k] = `${copy[k]} (copie)`
    if (copy.slug) copy.slug = `${copy.slug}-copie`
    if (statusField === 'status') copy[statusColumn] = draftValue   // la copie est un brouillon
    copy.sort_order = rows.length
    try {
      const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(copy) })
      const j = await r.json()
      if (j.ok) load(); else setError(j.message || 'Échec de la duplication')
    } catch { setError('Erreur réseau') }
  }

  async function remove(row: Row) {
    if (!confirm(`Supprimer cet ${itemLabel} ? Cette action est définitive.`)) return
    try {
      await fetch(base, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: row.id }) })
      load()
    } catch { setError('Erreur réseau') }
  }

  async function patch(row: Row, changes: Row) {
    try {
      await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: row.id, ...changes }) })
      load()
    } catch { setError('Erreur réseau') }
  }

  function togglePublish(row: Row) {
    if (statusField === 'is_active') patch(row, { is_active: !row.is_active })
    else patch(row, { [statusColumn]: row[statusColumn] === publishedValue ? draftValue : publishedValue })
  }

  async function move(row: Row, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id)
    const swap = rows[idx + dir]
    if (!swap) return
    await patch(row, { sort_order: swap.sort_order ?? idx + dir })
    await patch(swap, { sort_order: row.sort_order ?? idx })
  }

  async function uploadFile(fieldName: string, file: File) {
    if (!editing) return
    setUploading(fieldName); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/admin/upload', { method: 'POST', credentials: 'same-origin', body: fd })
      const j = await r.json()
      if (j.ok) {
        // Renseigne l'URL ; complète quelques métadonnées si les champs existent.
        const patch: Row = { [fieldName]: j.url }
        if ('mime' in editing) patch.mime = j.mime
        if ('size_bytes' in editing) patch.size_bytes = j.size
        setEditing({ ...editing, ...patch })
      } else {
        setError(j.message || 'Échec de l’upload')
      }
    } catch { setError('Erreur réseau pendant l’upload') }
    setUploading(null)
  }

  const isPublished = (row: Row) => statusField === 'is_active' ? !!row.is_active : row[statusColumn] === publishedValue

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={
            <button onClick={openNew} disabled={demo} className="btn-gold-cinematic px-4 py-2 text-xs disabled:opacity-40">
              <Plus className="w-4 h-4" /> Nouveau
            </button>
          }
        />

        {demo && (
          <div className="card-cinematic p-4 mb-5 flex items-center gap-3">
            <Database className="w-4 h-4 text-gold" />
            <p className="font-inter text-sm text-pearl/60">
              Mode démo : connectez Supabase (variables d’environnement) pour gérer ces contenus en base.
              Le site public affiche les contenus de secours en attendant.
            </p>
          </div>
        )}

        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : (
          <div className="card-cinematic overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                    <th className="px-4 py-3 w-10">#</th>
                    {tableFields.map((f) => <th key={f.name} className="px-4 py-3">{f.label}</th>)}
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && !demo && (
                    <tr><td colSpan={tableFields.length + 3} className="px-4 py-8 text-center text-pearl/30 font-inter">Aucun contenu. Cliquez sur « Nouveau ».</td></tr>
                  )}
                  {rows.map((row, i) => (
                    <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-pearl/30">
                        <div className="flex flex-col">
                          <button onClick={() => move(row, -1)} disabled={i === 0} className="text-pearl/30 hover:text-gold disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                          <button onClick={() => move(row, 1)} disabled={i === rows.length - 1} className="text-pearl/30 hover:text-gold disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                        </div>
                      </td>
                      {tableFields.map((f) => (
                        <td key={f.name} className="px-4 py-3 text-pearl/70 max-w-[260px] truncate">
                          {f.type === 'boolean' ? (row[f.name] ? 'Oui' : 'Non') : String(row[f.name] ?? '—').slice(0, 80)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button onClick={() => togglePublish(row)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter"
                          style={isPublished(row) ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' } : { background: 'rgba(107,114,128,0.15)', color: '#9CA3AF' }}>
                          {isPublished(row) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {isPublished(row) ? 'Publié' : 'Masqué'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {previewable && <button onClick={() => window.open(`/preview/${resource}/${row.id}`, '_blank')} title="Aperçu" className="text-pearl/40 hover:text-cinematic-gold p-1.5"><ExternalLink className="w-4 h-4" /></button>}
                        <button onClick={() => openEdit(row)} title="Modifier" className="text-pearl/40 hover:text-gold p-1.5"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => duplicate(row)} title="Dupliquer (brouillon)" className="text-pearl/40 hover:text-gold p-1.5"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => remove(row)} title="Supprimer" className="text-pearl/40 hover:text-danger p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modale création / édition */}
      {editing && (
        <div className="admin-modal-overlay flex items-center justify-center p-4" onClick={closeModal}>
          <div className="admin-modal-box w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-cinzel text-lg font-bold text-pearl">{isNew ? 'Créer' : 'Modifier'}</h2>
                {!isNew && (editing.created_at || editing.updated_at) && (
                  <p className="text-[11px] text-pearl/35 font-inter mt-1">
                    {editing.created_at && <>Créé le {new Date(editing.created_at).toLocaleDateString('fr-FR')}</>}
                    {editing.updated_at && <> · Modifié le {new Date(editing.updated_at).toLocaleString('fr-FR')}</>}
                  </p>
                )}
              </div>
              <button onClick={closeModal} className="text-pearl/40 hover:text-pearl"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">{f.label}{f.required && ' *'}</label>
                  {f.type === 'json' ? (
                    <textarea rows={6} placeholder={f.placeholder || '[ … ]  (JSON)'}
                      value={typeof editing[f.name] === 'string' ? editing[f.name] : JSON.stringify(editing[f.name] ?? '', null, 2)}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="input-royal resize-none font-mono text-xs" />
                  ) : f.type === 'textarea' ? (
                    <textarea rows={4} value={editing[f.name] ?? ''} placeholder={f.placeholder}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="input-royal resize-none" />
                  ) : f.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-pearl/60 font-inter">
                      <input type="checkbox" checked={!!editing[f.name]} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.checked })} />
                      Activé
                    </label>
                  ) : f.type === 'select' ? (
                    <select value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="input-royal">
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'ref-select' ? (
                    (() => {
                      const opts = f.refResource ? refOptions[f.refResource] : undefined
                      const failed = f.refResource ? refFailed[f.refResource] : false
                      if (opts && opts.length > 0) {
                        const list = f.refFilter ? opts.filter((o) => f.refFilter!(o, editing)) : opts
                        return (
                          <select value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="input-royal">
                            <option value="">{f.emptyLabel ?? '—'}</option>
                            {list.map((o) => <option key={o.id} value={o.id}>{f.refLabel ? f.refLabel(o) : (o.titre || o.title || o.id)}</option>)}
                          </select>
                        )
                      }
                      // Repli propre : liste indisponible / vide / en cours → saisie manuelle de l'UUID (jamais bloquant).
                      return (
                        <div className="space-y-1">
                          <input type="text" value={editing[f.name] ?? ''} placeholder={f.placeholder}
                            onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="input-royal" />
                          <p className="text-[11px] text-pearl/35 font-inter">
                            {failed ? 'Liste indisponible — saisie manuelle de l’ID possible.'
                              : opts ? 'Aucun élément disponible — saisie manuelle possible.'
                              : 'Chargement de la liste…'}
                          </p>
                        </div>
                      )
                    })()
                  ) : f.type === 'media-select' ? (
                    (() => {
                      const all = f.refResource ? refOptions[f.refResource] : undefined
                      const failed = f.refResource ? refFailed[f.refResource] : false
                      const opts = all ? (f.mediaFilter ? all.filter((o) => f.mediaFilter!(o)) : all) : undefined
                      if (opts && opts.length > 0) {
                        const chosen = opts.find((o) => o.id === editing[f.name])
                        return (
                          <div className="space-y-2">
                            <select value={editing[f.name] ?? ''} onChange={(e) => {
                                const id = e.target.value
                                const row = opts.find((o) => o.id === id)
                                if (!id || !row) { setEditing({ ...editing, [f.name]: '' }); return }
                                const applied = f.mediaApply ? f.mediaApply(row, editing) : {}
                                setEditing({ ...editing, [f.name]: id, ...applied })
                              }} className="input-royal">
                              <option value="">Aucune vidéo — saisie manuelle ci-dessous</option>
                              {opts.map((o) => <option key={o.id} value={o.id}>{`${o.title || 'Sans titre'} · ${String(o.type || '').toLowerCase()} · ${o.status === 'published' ? 'publié' : 'brouillon'}${o.category ? ' · ' + o.category : ''}`}</option>)}
                            </select>
                            {chosen && (
                              <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                {chosen.thumbnail_url && /\.(png|jpe?g|gif|webp|avif)$/i.test(String(chosen.thumbnail_url)) && (
                                  <img src={String(chosen.thumbnail_url)} alt="" className="w-16 h-10 object-cover rounded border border-white/10" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs text-pearl/70 font-inter truncate">{chosen.title}</p>
                                  {chosen.url && <a href={String(chosen.url)} target="_blank" rel="noreferrer" className="text-[11px] text-gold/70 hover:text-gold break-all font-inter">{String(chosen.url)}</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }
                      // Repli : médiathèque indisponible/vide → les champs vidéo manuels ci-dessous restent utilisables.
                      return (
                        <p className="text-[11px] text-pearl/35 font-inter">
                          {failed ? 'Médiathèque indisponible — utilisez les champs vidéo ci-dessous.'
                            : opts ? 'Aucune vidéo dans la médiathèque — utilisez les champs ci-dessous.'
                            : 'Chargement de la médiathèque…'}
                        </p>
                      )
                    })()
                  ) : f.type === 'tags' ? (
                    <input value={Array.isArray(editing[f.name]) ? editing[f.name].join(', ') : (editing[f.name] ?? '')} placeholder="séparés par des virgules"
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="input-royal" />
                  ) : f.type === 'file' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="btn-gold-cinematic px-3 py-2 text-xs cursor-pointer whitespace-nowrap">
                          {uploading === f.name
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                            : <><Plus className="w-4 h-4" /> {editing[f.name] ? 'Remplacer' : 'Téléverser'}</>}
                          <input
                            type="file"
                            accept={f.accept}
                            className="hidden"
                            disabled={uploading === f.name}
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(f.name, file); e.target.value = '' }}
                          />
                        </label>
                        {editing[f.name] && (
                          <button type="button" onClick={() => setEditing({ ...editing, [f.name]: '' })}
                            className="text-pearl/40 hover:text-danger p-1.5" title="Retirer"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                      {editing[f.name] && (
                        /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(String(editing[f.name]))
                          ? <img src={String(editing[f.name])} alt="" className="max-h-32 rounded-lg border border-white/10" />
                          : <a href={String(editing[f.name])} target="_blank" rel="noreferrer" className="text-xs text-gold/80 hover:text-gold break-all font-inter">{String(editing[f.name])}</a>
                      )}
                      <input
                        value={editing[f.name] ?? ''} placeholder="… ou collez une URL externe"
                        onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                        className="input-royal text-xs" />
                    </div>
                  ) : (
                    <input type={f.type === 'number' ? 'number' : f.type === 'datetime' ? 'datetime-local' : 'text'}
                      value={editing[f.name] ?? ''} placeholder={f.placeholder}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="input-royal" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              {previewable && !isNew && editing.id && (
                <button onClick={() => window.open(`/preview/${resource}/${editing.id}`, '_blank')}
                  className="px-4 py-2 rounded-xl text-sm font-inter text-pearl/60 hover:text-cinematic-gold inline-flex items-center gap-1.5 mr-auto">
                  <ExternalLink className="w-4 h-4" /> Aperçu
                </button>
              )}
              <button onClick={closeModal} className="px-4 py-2 rounded-xl text-sm font-inter text-pearl/50 hover:text-pearl">Annuler</button>
              <button onClick={save} disabled={saving} className="btn-gold-cinematic px-5 py-2.5 text-sm disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : <><Check className="w-4 h-4" /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
