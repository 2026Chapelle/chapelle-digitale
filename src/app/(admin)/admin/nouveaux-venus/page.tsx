'use client'
/**
 * Admin — Demandes « Nouveau Venu » (V2.1D-D).
 *
 * Lit et traite les demandes réelles de public.newcomer_intakes via l'API admin
 * /api/admin/newcomer-intakes (garde cookie admin, service role côté serveur).
 * Aucune clé service role ni client Supabase ici. Aucune donnée fictive.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'
import { Loader2, Phone, Mail, MessageCircle, Inbox, RefreshCw, StickyNote, Search, QrCode, Download, Copy, Check, ExternalLink, Eye, MoreHorizontal } from 'lucide-react'
import QRCode from 'react-qr-code'
import { filterNewcomers } from '@/lib/pastoral/newcomer-filter'

interface Intake {
  id: string
  prenom: string
  nom: string | null
  telephone: string
  email: string | null
  source: string | null
  message: string | null
  priority: string
  status: string
  created_at: string
  processed_at: string | null
  archived_at: string | null
  metadata?: { admin_note?: string; admin_note_at?: string } | null
}

const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: '#0EA5E9' },
  to_review: { label: 'À revoir', color: '#EAB308' },
  contacted: { label: 'Contacté', color: '#8B5CF6' },
  converted: { label: 'Intégré', color: '#22C55E' },
  duplicate: { label: 'Doublon', color: '#6B7280' },
  archived: { label: 'Archivé', color: '#6B7280' },
}
// Actions rapides = les 6 statuts réels du CHECK SQL de newcomer_intakes.
const ACTIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'to_review', label: 'À revoir' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'converted', label: 'Intégré' },
  { value: 'duplicate', label: 'Doublon' },
  { value: 'archived', label: 'Archivé' },
]
const FILTERS = [{ value: '', label: 'Tous' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleString('fr-FR') } catch { return iso } }
const waLink = (tel: string) => `https://wa.me/${tel.replace(/[^\d]/g, '')}`
// Lien public d'accueil (QR Code) — URL de production du formulaire Nouveau Venu.
const PUBLIC_NOUVEAU_VENU_URL = 'https://citadelle.chapelleduroyaume.org/nouveau-venu'
// Libellés humains pour la colonne Source (affichage UI uniquement — la valeur stockée en base est inchangée).
const SOURCE_LABELS: Record<string, string> = {
  nouveau_venu_form: "QR Code / Formulaire d'accueil",
}
const sourceLabel = (src: string | null) => (!src ? '—' : SOURCE_LABELS[src] || src.replace(/_/g, ' '))

export default function AdminNouveauxVenusPage() {
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteOpenId, setNoteOpenId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  async function copyLink() {
    try { await navigator.clipboard.writeText(PUBLIC_NOUVEAU_VENU_URL); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { setCopied(false) }
  }

  // Télécharge le QR (SVG rendu → canvas → PNG). Repli SVG si la conversion échoue. Aucune dépendance.
  function downloadQr() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgStr = new XMLSerializer().serializeToString(svg)
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = () => {
      const size = 512
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); return }
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => {
        if (blob) {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob); a.download = 'qr-nouveau-venu.png'; a.click()
          URL.revokeObjectURL(a.href)
        }
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.onerror = () => {
      const a = document.createElement('a'); a.href = url; a.download = 'qr-nouveau-venu.svg'; a.click(); URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Charge TOUTES les demandes en une fois : filtre statut + recherche se font côté
      // client (compteurs exacts). Plafond serveur = 500 demandes les plus récentes.
      const r = await fetch('/api/admin/newcomer-intakes', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) { setError('Impossible de charger les demandes. Réessayez.'); setIntakes([]) }
      else setIntakes(j.data?.intakes || [])
    } catch { setError('Impossible de charger les demandes. Réessayez.'); setIntakes([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(intake: Intake, status: string) {
    if (busyId) return
    setBusyId(intake.id); setError(null)
    try {
      const r = await fetch('/api/admin/newcomer-intakes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ id: intake.id, status }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) setError('Mise à jour impossible. Réessayez.')
      else await load()
    } catch { setError('Mise à jour impossible. Réessayez.') }
    setBusyId(null)
  }

  function openNote(intake: Intake) {
    setNoteOpenId((prev) => (prev === intake.id ? null : intake.id))
    setNoteDraft(intake.metadata?.admin_note || '')
  }

  async function saveNote(intake: Intake) {
    if (savingNote) return
    const note = noteDraft.trim()
    if (!note) { setNoteOpenId(null); return }
    setSavingNote(true); setError(null)
    try {
      const r = await fetch('/api/admin/newcomer-intakes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ id: intake.id, note }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) setError('Enregistrement de la note impossible. Réessayez.')
      else { setNoteOpenId(null); await load() }
    } catch { setError('Enregistrement de la note impossible. Réessayez.') }
    setSavingNote(false)
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const i of intakes) c[i.status] = (c[i.status] || 0) + 1
    return c
  }, [intakes])

  // Filtre statut + recherche texte, côté client, sur la liste complète (V2.2-C).
  const filtered = useMemo(() => filterNewcomers(intakes, { status: statusFilter, query }), [intakes, statusFilter, query])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader
            eyebrow="Accueil pastoral"
            title={<>Demandes <span className="text-cinematic-gold">Nouveau Venu</span></>}
            description="Demandes reçues via le formulaire public /nouveau-venu — à contacter et intégrer."
          />
          <button onClick={load} disabled={loading} className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 mt-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Rafraîchir
          </button>
        </div>

        {/* QR Code Nouveau Venu (V2.4-A) — lien public d'accueil */}
        <div className="card-royal p-5 mb-6 flex flex-col sm:flex-row items-center gap-5">
          <div ref={qrRef} className="p-3 rounded-xl bg-white flex-shrink-0">
            <QRCode value={PUBLIC_NOUVEAU_VENU_URL} size={132} bgColor="#FFFFFF" fgColor="#0c0a16" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-cinzel font-bold text-pearl text-base flex items-center gap-2 mb-1"><QrCode className="w-4 h-4 text-gold" /> QR Code Nouveau Venu</h2>
            <p className="font-inter text-sm text-pearl/60 mb-0.5">À afficher à l&apos;accueil, sur écran ou à partager sur WhatsApp.</p>
            <p className="font-inter text-xs text-pearl/40 mb-3">Les personnes scannent et remplissent le formulaire d&apos;accueil.</p>

            {/* Lien public d'accueil */}
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-pearl/35 font-inter mb-1">Lien public d&apos;accueil</p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pearl/5 border border-white/10 max-w-full">
                <ExternalLink className="w-3.5 h-3.5 text-pearl/40 flex-shrink-0" />
                <span className="font-inter text-[11px] text-pearl/65 truncate">{PUBLIC_NOUVEAU_VENU_URL}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={downloadQr} className="btn-gold text-xs px-3 py-2 inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Télécharger le QR Code</button>
              <button onClick={copyLink} className="text-xs font-inter px-3 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#F5E6D8', border: '1px solid rgba(255,255,255,0.12)' }}>
                {copied ? <><Check className="w-3.5 h-3.5" /> Lien copié</> : <><Copy className="w-3.5 h-3.5" /> Copier le lien</>}
              </button>
              <a href={PUBLIC_NOUVEAU_VENU_URL} target="_blank" rel="noreferrer" className="text-xs font-inter text-gold hover:gap-2 inline-flex items-center gap-1 px-2 py-2 transition-all">Ouvrir <ExternalLink className="w-3 h-3" /></a>
            </div>
          </div>
        </div>

        {/* Recherche (côté client) */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher nom, email, téléphone, source…"
            className="input-royal w-full pl-9 text-sm" />
        </div>

        {/* Filtre statut */}
        <div className="flex gap-2 flex-wrap mb-3">
          {FILTERS.map((f) => {
            const active = statusFilter === f.value
            return (
              <button key={f.value || 'all'} onClick={() => setStatusFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-inter font-semibold transition-all ${active ? 'bg-gold text-black' : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10 hover:text-pearl/80'}`}>
                {f.label}{f.value && counts[f.value] ? ` (${counts[f.value]})` : ''}
              </button>
            )
          })}
        </div>

        <p className="text-[11px] text-pearl/35 font-inter mb-4">
          {filtered.length} / {intakes.length} demande(s) affichée(s){intakes.length >= 500 ? ' · 500 plus récentes (plafond)' : ''}
        </p>

        {error && <div className="card-royal p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card-royal text-center py-16">
            <Inbox className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
            <p className="font-cinzel text-lg text-pearl/60">{intakes.length === 0 ? 'Aucune demande Nouveau Venu pour le moment.' : 'Aucune demande ne correspond à votre recherche.'}</p>
          </div>
        ) : (
          <div className="card-royal overflow-hidden">
            <div className="px-4 pt-3 pb-1 text-[11px] font-inter text-pearl/35 md:hidden">
              Glissez horizontalement pour voir toutes les colonnes. Les actions restent &agrave; droite.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                    <th className="px-4 py-3">Personne</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Reçue le</th>
                    <th className="sticky right-0 z-20 px-4 py-3 text-right bg-[#120d1f]/95 border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.18)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => {
                    const st = STATUS[i.status] || { label: i.status, color: '#6B7280' }
                    return (
                      <Fragment key={i.id}>
                        <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] align-top">
                        <td className="px-4 py-3">
                          <div className="text-pearl/85 font-inter">{i.prenom} {i.nom || ''}</div>
                          {i.message && <div className="text-[11px] text-pearl/40 font-inter max-w-[240px] truncate" title={i.message}>« {i.message} »</div>}
                          {i.metadata?.admin_note && <div className="text-[11px] text-gold/70 font-inter max-w-[240px] truncate flex items-center gap-1 mt-0.5" title={i.metadata.admin_note}><StickyNote className="w-3 h-3 flex-shrink-0" /> {i.metadata.admin_note}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a href={`tel:${i.telephone}`} title="Appeler" className="text-pearl/50 hover:text-gold"><Phone className="w-4 h-4" /></a>
                            <a href={waLink(i.telephone)} target="_blank" rel="noreferrer" title="WhatsApp" className="text-pearl/50 hover:text-[#22C55E]"><MessageCircle className="w-4 h-4" /></a>
                            {i.email && <a href={`mailto:${i.email}`} title={i.email} className="text-pearl/50 hover:text-gold"><Mail className="w-4 h-4" /></a>}
                          </div>
                          <div className="text-[11px] text-pearl/55 font-inter mt-1 whitespace-nowrap">{i.telephone}</div>
                        </td>
                        <td className="px-4 py-3 text-pearl/60 font-inter">
                          <span className="inline-block max-w-[180px] text-xs" title={i.source || undefined}>{sourceLabel(i.source)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter"
                            style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-pearl/50 font-inter whitespace-nowrap">{fmtDate(i.created_at)}</td>
                        {/* MARKER_NO_SQL_V24E — actions UI uniquement, réutilisent les fonctions existantes (aucun SQL, aucune API modifiée) */}
                        <td className="sticky right-0 z-10 px-4 py-3 bg-[#120d1f]/95 border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.16)]" data-marker="MARKER_ACTIONS_REDESIGN_OK">
                          <div className="flex items-center gap-1.5 justify-end whitespace-nowrap">
                            <Link href={`/admin/nouveaux-venus/${i.id}`} data-marker="MARKER_VIEW_FICHE_PRIMARY_OK"
                              className="text-[11px] font-inter text-gold px-2.5 py-1.5 rounded-md border border-gold/30 bg-gold/10 hover:bg-gold/20 inline-flex items-center gap-1 transition-colors">
                              <Eye className="w-3.5 h-3.5" /> Voir fiche
                            </Link>
                            <button data-marker="MARKER_ACTIONS_MENU_OK" onClick={() => setMenuOpenId(menuOpenId === i.id ? null : i.id)}
                              aria-label="Ouvrir les actions pastorales" aria-haspopup="menu" aria-expanded={menuOpenId === i.id}
                              className={`px-2 py-1.5 rounded-md border transition-colors inline-flex items-center ${menuOpenId === i.id ? 'text-gold bg-gold/10 border-gold/30' : 'text-pearl/50 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:text-gold'}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {busyId === i.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-pearl/40" />}
                          </div>
                        </td>
                        </tr>
                        {menuOpenId === i.id && (
                          <tr className="bg-white/[0.02]">
                            <td colSpan={6} className="px-3 pb-3 pt-1.5">
                              <div className="flex flex-col md:flex-row gap-x-4 gap-y-2 flex-wrap">
                                {/* Groupe Contact */}
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-pearl/35 font-inter mb-1.5">Contact</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    <a href={`tel:${i.telephone}`} className="text-[11px] font-inter px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors inline-flex items-center gap-1 whitespace-nowrap"><Phone className="w-3 h-3" /> Appeler</a>
                                    <a href={waLink(i.telephone)} target="_blank" rel="noreferrer" className="text-[11px] font-inter px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-[#22C55E] hover:bg-white/[0.07] transition-colors inline-flex items-center gap-1 whitespace-nowrap"><MessageCircle className="w-3 h-3" /> WhatsApp</a>
                                    {i.email && <a href={`mailto:${i.email}`} className="text-[11px] font-inter px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors inline-flex items-center gap-1 whitespace-nowrap"><Mail className="w-3 h-3" /> Email</a>}
                                  </div>
                                </div>
                                {/* Groupe Suivi pastoral */}
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-pearl/35 font-inter mb-1.5">Suivi pastoral</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    <button onClick={() => { setMenuOpenId(null); openNote(i) }} className="text-[11px] font-inter px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors inline-flex items-center gap-1 whitespace-nowrap"><StickyNote className="w-3 h-3" /> {i.metadata?.admin_note ? 'Modifier la note' : 'Ajouter une note'}</button>
                                  </div>
                                </div>
                                {/* Groupe Changer le statut */}
                                <div data-marker="MARKER_STATUS_ACTIONS_COMPACT_OK">
                                  <p className="text-[10px] uppercase tracking-wider text-pearl/35 font-inter mb-1.5">Changer le statut</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ACTIONS.filter((a) => a.value !== i.status).map((a) => (
                                      <button key={a.value} onClick={() => { setMenuOpenId(null); setStatus(i, a.value) }} disabled={busyId === i.id}
                                        className="text-[11px] font-inter px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors disabled:opacity-40 whitespace-nowrap">{a.label}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {noteOpenId === i.id && (
                          <tr className="bg-white/[0.015]">
                            <td colSpan={6} className="px-3 pb-3 pt-1.5">
                              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                <div className="flex-1">
                                  <label className="block text-[11px] uppercase tracking-wider text-pearl/40 font-inter mb-1">Note pastorale interne</label>
                                  <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={2} maxLength={2000}
                                    placeholder="Ex. Appelé le dimanche, rappellera après le culte…"
                                    className="input-royal w-full text-sm" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveNote(i)} disabled={savingNote}
                                    className="btn-gold text-xs px-3 py-2 inline-flex items-center gap-1 disabled:opacity-50">
                                    {savingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Enregistrer
                                  </button>
                                  <button onClick={() => setNoteOpenId(null)} className="text-xs font-inter text-pearl/50 hover:text-pearl px-3 py-2">Annuler</button>
                                </div>
                              </div>
                              {i.metadata?.admin_note_at && <div className="text-[10px] text-pearl/30 font-inter mt-1">Dernière note : {fmtDate(i.metadata.admin_note_at)}</div>}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
