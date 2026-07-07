'use client'
/**
 * Admin — Fiche détail d'un « Nouveau Venu » (V2.4-C).
 *
 * Données RÉELLES de public.newcomer_intakes. L'API admin n'expose pas de GET par id :
 * on charge la liste via /api/admin/newcomer-intakes et on retrouve l'élément par id
 * côté client (option validée). Statut + note pastorale réutilisent le PATCH existant.
 * Aucune nouvelle table, aucun mock, aucune donnée fictive.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Loader2, ArrowLeft, Phone, MessageCircle, Mail, StickyNote, User, Calendar, Tag, History, Save } from 'lucide-react'

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
const ACTIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'to_review', label: 'À revoir' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'converted', label: 'Intégré' },
  { value: 'duplicate', label: 'Doublon' },
  { value: 'archived', label: 'Archivé' },
]
const SOURCE_LABELS: Record<string, string> = { nouveau_venu_form: "QR Code / Formulaire d'accueil" }
const sourceLabel = (src: string | null) => (!src ? '—' : SOURCE_LABELS[src] || src.replace(/_/g, ' '))
const fmtDate = (iso: string | null) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString('fr-FR') } catch { return iso } }
const waLink = (tel: string) => `https://wa.me/${tel.replace(/[^\d]/g, '')}`

export default function NewcomerDetailPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const [intake, setIntake] = useState<Intake | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/newcomer-intakes', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) { setError('Impossible de charger la fiche. Réessayez.'); setLoading(false); return }
      const found: Intake | null = (j.data?.intakes || []).find((x: Intake) => x.id === id) || null
      if (!found) setNotFound(true)
      else { setIntake(found); setNoteDraft(found.metadata?.admin_note || '') }
    } catch { setError('Impossible de charger la fiche. Réessayez.') }
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  async function setStatus(status: string) {
    if (!intake || busy) return
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/admin/newcomer-intakes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ id: intake.id, status }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) setError('Mise à jour du statut impossible. Réessayez.')
      else await load()
    } catch { setError('Mise à jour du statut impossible. Réessayez.') }
    setBusy(false)
  }

  async function saveNote() {
    if (!intake || savingNote) return
    const note = noteDraft.trim()
    if (!note) return
    setSavingNote(true); setError(null)
    try {
      const r = await fetch('/api/admin/newcomer-intakes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ id: intake.id, note }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) setError('Enregistrement de la note impossible. Réessayez.')
      else await load()
    } catch { setError('Enregistrement de la note impossible. Réessayez.') }
    setSavingNote(false)
  }

  const st = intake ? (STATUS[intake.status] || { label: intake.status, color: '#6B7280' }) : null

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal max-w-4xl">
        <Link href="/admin/nouveaux-venus" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Demandes Nouveau Venu
        </Link>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : notFound ? (
          <div className="card-royal text-center py-16">
            <p className="font-cinzel text-lg text-pearl/60 mb-4">Cette demande est introuvable.</p>
            <Link href="/admin/nouveaux-venus" className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2">Retour à la liste</Link>
          </div>
        ) : intake ? (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <PageHeader eyebrow="Accueil pastoral · fiche"
                title={<>{intake.prenom} <span className="text-cinematic-gold">{intake.nom || ''}</span></>}
                description={`Reçue le ${fmtDate(intake.created_at)} · ${sourceLabel(intake.source)}`} />
              {st && <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold font-inter mt-2" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>}
            </div>

            {error && <div className="card-royal p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Identité */}
              <div className="card-royal p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3"><User className="w-4 h-4 text-gold" /> Identité</h2>
                <dl className="space-y-2 text-sm font-inter">
                  <div className="flex justify-between gap-3"><dt className="text-pearl/40">Prénom</dt><dd className="text-pearl/85">{intake.prenom}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-pearl/40">Nom</dt><dd className="text-pearl/85">{intake.nom || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-pearl/40 inline-flex items-center gap-1"><Tag className="w-3 h-3" /> Source</dt><dd className="text-pearl/70 text-right">{sourceLabel(intake.source)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-pearl/40 inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Reçue le</dt><dd className="text-pearl/70 text-right">{fmtDate(intake.created_at)}</dd></div>
                </dl>
              </div>

              {/* Contact */}
              <div className="card-royal p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3"><Phone className="w-4 h-4 text-gold" /> Contact</h2>
                <p className="text-sm font-inter text-pearl/85 mb-1">{intake.telephone}</p>
                {intake.email && <p className="text-sm font-inter text-pearl/70 mb-3 break-all">{intake.email}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <a href={`tel:${intake.telephone}`} className="text-xs font-inter px-3 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#F5E6D8', border: '1px solid rgba(255,255,255,0.12)' }}><Phone className="w-3.5 h-3.5" /> Appeler</a>
                  <a href={waLink(intake.telephone)} target="_blank" rel="noreferrer" className="text-xs font-inter px-3 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(34,197,94,0.12)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.3)' }}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
                  {intake.email && <a href={`mailto:${intake.email}`} className="text-xs font-inter px-3 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#F5E6D8', border: '1px solid rgba(255,255,255,0.12)' }}><Mail className="w-3.5 h-3.5" /> Email</a>}
                </div>
              </div>
            </div>

            {/* Suivi pastoral */}
            <div className="card-royal p-5 mb-4">
              <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3">Suivi pastoral</h2>
              <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-2">Changer le statut</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {ACTIONS.map((a) => {
                  const active = intake.status === a.value
                  return (
                    <button key={a.value} onClick={() => setStatus(a.value)} disabled={busy || active}
                      className={`text-xs font-inter px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${active ? 'text-gold bg-gold/10 border-gold/30' : 'text-pearl/60 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:text-gold'}`}>{a.label}</button>
                  )
                })}
                {busy && <Loader2 className="w-4 h-4 animate-spin text-pearl/40 self-center" />}
              </div>

              <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-1">Note pastorale interne</p>
              <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} maxLength={2000}
                placeholder="Ex. Appelé le dimanche, rappellera après le culte…" className="input-royal w-full text-sm mb-2" />
              <div className="flex items-center gap-3">
                <button onClick={saveNote} disabled={savingNote || !noteDraft.trim()} className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50">
                  {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer la note
                </button>
                {intake.metadata?.admin_note_at && <span className="text-[11px] text-pearl/35 font-inter">Dernière note : {fmtDate(intake.metadata.admin_note_at)}</span>}
              </div>
            </div>

            {/* Message du formulaire + note existante */}
            <div className="card-royal p-5 mb-4">
              <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3"><StickyNote className="w-4 h-4 text-gold" /> Message &amp; note</h2>
              <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-1">Message du formulaire</p>
              {intake.message ? <p className="text-sm font-inter text-pearl/75 leading-relaxed mb-4 whitespace-pre-line">« {intake.message} »</p> : <p className="text-sm font-inter text-pearl/35 mb-4">Aucun message.</p>}
              <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-1">Note pastorale enregistrée</p>
              {intake.metadata?.admin_note ? <p className="text-sm font-inter text-gold/80 leading-relaxed">{intake.metadata.admin_note}</p> : <p className="text-sm font-inter text-pearl/35">Aucune note enregistrée.</p>}
            </div>

            {/* Historique (placeholder honnête) */}
            <div className="card-royal p-5">
              <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-2"><History className="w-4 h-4 text-gold" /> Historique d'intégration</h2>
              <p className="text-sm font-inter text-pearl/40">Historique détaillé bientôt disponible.</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
