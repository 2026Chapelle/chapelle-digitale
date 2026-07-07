'use client'
/**
 * Admin — Demandes « Nouveau Venu » (V2.1D-D).
 *
 * Lit et traite les demandes réelles de public.newcomer_intakes via l'API admin
 * /api/admin/newcomer-intakes (garde cookie admin, service role côté serveur).
 * Aucune clé service role ni client Supabase ici. Aucune donnée fictive.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Loader2, Phone, Mail, MessageCircle, Inbox, RefreshCw, StickyNote, Search } from 'lucide-react'
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                    <th className="px-4 py-3">Personne</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Reçue le</th>
                    <th className="px-4 py-3 text-right">Actions</th>
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
                          <div className="text-[11px] text-pearl/40 font-inter mt-1">{i.telephone}</div>
                        </td>
                        <td className="px-4 py-3 text-pearl/60 font-inter">{i.source || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter"
                            style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-pearl/50 font-inter whitespace-nowrap">{fmtDate(i.created_at)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {ACTIONS.filter((a) => a.value !== i.status).map((a) => (
                            <button key={a.value} onClick={() => setStatus(i, a.value)} disabled={busyId === i.id}
                              className="text-[11px] font-inter text-pearl/50 hover:text-gold px-1.5 py-1 disabled:opacity-40">{a.label}</button>
                          ))}
                          <button onClick={() => openNote(i)} title="Note pastorale"
                            className={`text-[11px] font-inter px-1.5 py-1 inline-flex items-center gap-1 align-middle ${noteOpenId === i.id ? 'text-gold' : 'text-pearl/50 hover:text-gold'}`}>
                            <StickyNote className="w-3.5 h-3.5" /> Note
                          </button>
                          {busyId === i.id && <Loader2 className="w-3.5 h-3.5 animate-spin inline text-pearl/40 ml-1" />}
                        </td>
                        </tr>
                        {noteOpenId === i.id && (
                          <tr className="bg-white/[0.015]">
                            <td colSpan={6} className="px-4 pb-4 pt-1">
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
