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
import { Loader2, ArrowLeft, Phone, MessageCircle, Mail, StickyNote, User, Calendar, Tag, History, Save, Clock, AlertTriangle, Compass, ListChecks, CheckCircle2, Circle, Copy, Check, GraduationCap, Users, ExternalLink, ArrowRight } from 'lucide-react'
import { triageNewcomer, heardFrom, relativeDaysLabel } from '@/lib/pastoral/newcomer-triage'
import { deriveJourneyStage } from '@/lib/pastoral/newcomer-journey'
import { getMessagesForStage, interpolateMessage } from '@/lib/pastoral/newcomer-messages'
import { PASTORAL_ACTIONS, parseJourney, isStepDone } from '@/lib/pastoral/newcomer-actions'
import { CalendarClock, BellRing, X, Route } from 'lucide-react'
import {
  readJourneyFields, hasJourney, journeyStatusLabel, journeyStepLabel, fmtWhen, isFollowUpOverdue,
  eventLine, normalizeEvents, FALLBACK_NO_JOURNEY, FALLBACK_NO_FOLLOWUP, FALLBACK_NO_CONTACT, FALLBACK_NO_HISTORY,
  type NewcomerJourneyEvent,
} from '@/lib/pastoral/newcomer-journey-model'

// Liens d'ORIENTATION recommandée (routes admin vérifiées existantes) — lecture seule.
const ORIENTATION_LINKS = [
  { href: '/admin/tunnel-integration', label: "Parcours d'intégration", Icon: GraduationCap },
  { href: '/admin/formations', label: 'Formations', Icon: GraduationCap },
  { href: '/admin/groupes', label: 'Cellules / groupes', Icon: Users },
] as const

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
  intake_payload?: { heard_from?: string | null } | null
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
// Prochaine action suggérée selon le statut actuel (dérivée — aucune donnée inventée, aucun SQL).
const NEXT_ACTION: Record<string, string> = {
  new: 'Prendre contact rapidement (appel ou WhatsApp).',
  to_review: 'Qualifier la demande, puis prendre contact.',
  contacted: 'Assurer le suivi et proposer une intégration.',
  converted: "Accompagner l'intégration (cellule, formation).",
  duplicate: 'Vérifier le doublon et archiver si confirmé.',
  archived: 'Aucune action requise — demande archivée.',
}
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
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [followUpBusy, setFollowUpBusy] = useState(false)
  const [followUpDraft, setFollowUpDraft] = useState('')
  const [journeyEvents, setJourneyEvents] = useState<NewcomerJourneyEvent[]>([])

  async function copyMessage(id: string, body: string) {
    try { await navigator.clipboard.writeText(body); setCopiedMsgId(id); setTimeout(() => setCopiedMsgId((c) => (c === id ? null : c)), 2000) }
    catch { setCopiedMsgId(null) }
  }

  // V2.6-C — enregistre une action pastorale (metadata.pastoral_journey, via PATCH additif).
  async function markAction(key: string) {
    if (!intake || actionBusy) return
    setActionBusy(key); setError(null)
    try {
      const r = await fetch('/api/admin/newcomer-intakes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ id: intake.id, action: key }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) setError("Enregistrement de l'action impossible. Réessayez.")
      else await load()
    } catch { setError("Enregistrement de l'action impossible. Réessayez.") }
    setActionBusy(null)
  }

  // V2.6-C — programme ou retire une relance manuelle (iso = null → annuler).
  async function saveFollowUp(iso: string | null) {
    if (!intake || followUpBusy) return
    setFollowUpBusy(true); setError(null)
    try {
      const payload = iso === null ? { id: intake.id, clear_follow_up: true } : { id: intake.id, next_follow_up_at: iso }
      const r = await fetch('/api/admin/newcomer-intakes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) setError('Enregistrement de la relance impossible. Réessayez.')
      else { setFollowUpDraft(''); await load() }
    } catch { setError('Enregistrement de la relance impossible. Réessayez.') }
    setFollowUpBusy(false)
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/newcomer-intakes', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) { setError('Impossible de charger la fiche. Réessayez.'); setLoading(false); return }
      const found: Intake | null = (j.data?.intakes || []).find((x: Intake) => x.id === id) || null
      if (!found) setNotFound(true)
      else {
        setIntake(found); setNoteDraft(found.metadata?.admin_note || '')
        // V2.7-B — historique de parcours (best-effort, lecture seule ; échec silencieux).
        try {
          const er = await fetch(`/api/admin/newcomer-journey?intake_id=${encodeURIComponent(found.id)}`, { credentials: 'same-origin' })
          const ej = await er.json().catch(() => ({}))
          setJourneyEvents(er.ok && ej?.ok === true ? normalizeEvents(ej.data?.events) : [])
        } catch { setJourneyEvents([]) }
      }
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
  // Horodatage réel du statut : archived_at si archivé, processed_at si contacté/intégré, sinon aucun (champs existants).
  const statusSince = intake
    ? (intake.status === 'archived' ? intake.archived_at
      : (intake.status === 'contacted' || intake.status === 'converted') ? intake.processed_at : null)
    : null
  // Triage pastoral (V2.6-A) — dérivé des champs existants, aucun SQL.
  const tri = intake ? triageNewcomer(intake, Date.now()) : null
  const hf = intake ? heardFrom(intake.intake_payload) : null
  // Accompagnement guidé (V2.6-B) — dérivé de status + triage, 100% lecture seule.
  const journey = intake && tri ? deriveJourneyStage(intake.status, tri, { hasNote: !!intake.metadata?.admin_note }) : null
  const stageMessages = journey ? getMessagesForStage(journey.stage) : []
  // V2.6-C — actions pastorales persistées (lecture du metadata.pastoral_journey réel).
  const pj = intake ? parseJourney(intake.metadata) : null
  // V2.7-B — champs de parcours du modèle SQL (tolérant : null si absent).
  const jf = intake ? readJourneyFields(intake) : null

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
              <div className="flex flex-col items-end gap-1.5 mt-2">
                {st && <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold font-inter" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>}
                {tri && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-[11px] text-pearl/40 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {relativeDaysLabel(tri.ageDays)}</span>
                    {tri.isOverdue && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: '#EF444422', color: '#F87171' }}><AlertTriangle className="w-2.5 h-2.5" /> En retard</span>}
                    {tri.followUpDue && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: '#F59E0B22', color: '#FBBF24' }}><AlertTriangle className="w-2.5 h-2.5" /> À relancer</span>}
                  </div>
                )}
              </div>
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
                  {hf && <div className="flex justify-between gap-3"><dt className="text-pearl/40">Comment nous a connus</dt><dd className="text-pearl/70 text-right">{hf}</dd></div>}
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

            {/* Parcours pastoral (V2.7-B) — modèle SQL, lecture seule, tolérant aux champs absents */}
            {jf && (
              <div className="card-royal p-5 mb-4" data-marker="MARKER_JOURNEY_SQL_OK">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3"><Route className="w-4 h-4 text-gold" /> Parcours pastoral</h2>
                {hasJourney(jf) ? (
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm font-inter">
                    <div className="flex justify-between gap-3"><dt className="text-pearl/40">Étape actuelle</dt><dd className="text-pearl/85 text-right">{journeyStepLabel(jf.journey_step_key)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-pearl/40">Statut</dt><dd className="text-pearl/85 text-right">{journeyStatusLabel(jf.journey_status)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-pearl/40">Relance prévue</dt><dd className={`text-right ${isFollowUpOverdue(jf, Date.now()) ? 'text-[#F87171]' : 'text-pearl/70'}`}>{jf.follow_up_due_at ? fmtWhen(jf.follow_up_due_at) : FALLBACK_NO_FOLLOWUP}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-pearl/40">Dernier contact</dt><dd className="text-pearl/70 text-right">{jf.last_contacted_at ? fmtWhen(jf.last_contacted_at) : FALLBACK_NO_CONTACT}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-pearl/40">Mise à jour</dt><dd className="text-pearl/60 text-right">{fmtWhen(jf.journey_updated_at)}</dd></div>
                    {jf.journey_completed_at && <div className="flex justify-between gap-3"><dt className="text-pearl/40">Terminé le</dt><dd className="text-[#22C55E]/80 text-right">{fmtWhen(jf.journey_completed_at)}</dd></div>}
                  </dl>
                ) : (
                  <p className="text-sm font-inter text-pearl/40">{FALLBACK_NO_JOURNEY}.</p>
                )}
                <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mt-4 mb-2">Historique récent</p>
                {journeyEvents.length > 0 ? (
                  <ol className="relative ml-2 border-l border-white/10 space-y-3">
                    {journeyEvents.map((ev, idx) => {
                      const l = eventLine(ev)
                      return (
                        <li key={ev.id || idx} className="relative pl-4">
                          <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gold/60" />
                          <p className="font-inter text-[13px] text-pearl/80">{l.label}</p>
                          {l.when && <p className="font-inter text-[11px] text-pearl/40 mt-0.5">{l.when}</p>}
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="text-sm font-inter text-pearl/40">{FALLBACK_NO_HISTORY}.</p>
                )}
              </div>
            )}

            {/* Accompagnement pastoral guidé (V2.6-B) — dérivé, lecture seule, aucun SQL */}
            {journey && (
              <div className="card-royal p-5 mb-4" data-marker="MARKER_JOURNEY_GUIDE_OK">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3"><Compass className="w-4 h-4 text-gold" /> Accompagnement pastoral guidé</h2>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter" style={{ background: journey.isUrgent ? '#EF444422' : 'rgba(212,175,55,0.12)', color: journey.isUrgent ? '#F87171' : '#D4AF37' }}>
                    Étape {journey.step} · {journey.label}
                  </span>
                </div>
                <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-1">Prochaine action recommandée</p>
                <p className="text-sm font-inter text-pearl/75 mb-4 flex items-start gap-2"><ArrowRight className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" /> {journey.nextAction}</p>
                <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-2 inline-flex items-center gap-1"><ListChecks className="w-3 h-3" /> Checklist pastorale (indicative)</p>
                <ul className="space-y-1.5 mb-4">
                  {journey.checklist.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-sm font-inter">
                      {c.done ? <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0" /> : <Circle className="w-4 h-4 text-pearl/25 flex-shrink-0" />}
                      <span className={c.done ? 'text-pearl/70' : 'text-pearl/45'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
                {journey.orientations.length > 0 && (
                  <>
                    <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-2">Parcours recommandé <span className="text-pearl/25 normal-case tracking-normal">— orientation, pas une progression synchronisée</span></p>
                    <div className="flex flex-wrap gap-1.5">
                      {ORIENTATION_LINKS.map((l) => (
                        <Link key={l.href} href={l.href} className="text-[11px] font-inter px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors inline-flex items-center gap-1">
                          <l.Icon className="w-3 h-3" /> {l.label} <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions pastorales enregistrables + relance (V2.6-C) — metadata.pastoral_journey, 0 SQL */}
            {journey && pj && (
              <div className="card-royal p-5 mb-4" data-marker="MARKER_ACTIONS_RECORD_OK">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-gold" /> Actions pastorales</h2>
                {pj.last_action ? (
                  <p className="text-[12px] text-pearl/60 font-inter mb-3">Dernière action : <span className="text-gold/80">{pj.last_action.label}</span> · {fmtDate(pj.last_action.at)}</p>
                ) : (
                  <p className="text-[12px] text-pearl/40 font-inter mb-3">Aucune action enregistrée pour l&apos;instant.</p>
                )}
                <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-2">Marquer une action comme faite</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {PASTORAL_ACTIONS.map((a) => {
                    const done = isStepDone(pj, a.key)
                    return (
                      <button key={a.key} onClick={() => markAction(a.key)} disabled={actionBusy === a.key}
                        className={`text-[11px] font-inter px-2.5 py-1.5 rounded-md border transition-colors inline-flex items-center gap-1 disabled:opacity-50 ${done ? 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10' : 'text-pearl/70 border-white/10 bg-white/[0.03] hover:text-gold hover:bg-white/[0.07]'}`}>
                        {actionBusy === a.key ? <Loader2 className="w-3 h-3 animate-spin" /> : done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        {a.label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-2 inline-flex items-center gap-1"><BellRing className="w-3 h-3" /> Relance prévue</p>
                {pj.next_follow_up_at ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[12px] font-inter text-gold/80 inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> {fmtDate(pj.next_follow_up_at)}</span>
                    <button onClick={() => saveFollowUp(null)} disabled={followUpBusy} className="text-[11px] font-inter text-pearl/50 hover:text-danger inline-flex items-center gap-1 disabled:opacity-50"><X className="w-3 h-3" /> Annuler</button>
                    {followUpBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-pearl/40" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => saveFollowUp(new Date(Date.now() + 3 * 86400000).toISOString())} disabled={followUpBusy} className="text-[11px] font-inter px-2.5 py-1.5 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors disabled:opacity-50">Dans 3 jours</button>
                    <button onClick={() => saveFollowUp(new Date(Date.now() + 7 * 86400000).toISOString())} disabled={followUpBusy} className="text-[11px] font-inter px-2.5 py-1.5 rounded-md border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors disabled:opacity-50">Dans 1 semaine</button>
                    <input type="date" value={followUpDraft} onChange={(e) => setFollowUpDraft(e.target.value)} className="input-royal text-xs py-1.5 px-2 max-w-[160px]" />
                    <button onClick={() => followUpDraft && saveFollowUp(new Date(followUpDraft + 'T10:00:00').toISOString())} disabled={followUpBusy || !followUpDraft} className="btn-gold text-[11px] px-3 py-1.5 disabled:opacity-50">Programmer</button>
                    {followUpBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-pearl/40" />}
                  </div>
                )}
              </div>
            )}

            {/* Messages prêts à copier (V2.6-B) — préparation seule, aucun envoi automatique */}
            {journey && stageMessages.length > 0 && (
              <div className="card-royal p-5 mb-4" data-marker="MARKER_JOURNEY_MESSAGES_OK">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-1"><MessageCircle className="w-4 h-4 text-gold" /> Messages prêts à copier</h2>
                <p className="text-[11px] text-pearl/35 font-inter mb-3">Personnalisés avec le prénom. À copier puis envoyer via WhatsApp, e-mail ou appel — aucun envoi automatique.</p>
                <div className="space-y-2.5">
                  {stageMessages.map((m) => {
                    const body = interpolateMessage(m.body, { prenom: intake.prenom })
                    return (
                      <div key={m.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-inter font-semibold text-pearl/80">{m.label}</span>
                          <button onClick={() => copyMessage(m.id, body)} className="text-[11px] font-inter px-2 py-1 rounded-md border border-white/10 bg-white/[0.03] text-pearl/60 hover:text-gold hover:bg-white/[0.07] transition-colors inline-flex items-center gap-1">
                            {copiedMsgId === m.id ? <><Check className="w-3 h-3" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
                          </button>
                        </div>
                        <p className="text-[13px] font-inter text-pearl/60 leading-relaxed whitespace-pre-line">{body}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <a href={waLink(intake.telephone)} target="_blank" rel="noreferrer" className="text-xs font-inter px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(34,197,94,0.12)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.3)' }}><MessageCircle className="w-3.5 h-3.5" /> Ouvrir WhatsApp</a>
                  {intake.email && <a href={`mailto:${intake.email}`} className="text-xs font-inter px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#F5E6D8', border: '1px solid rgba(255,255,255,0.12)' }}><Mail className="w-3.5 h-3.5" /> Email</a>}
                  <a href={`tel:${intake.telephone}`} className="text-xs font-inter px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#F5E6D8', border: '1px solid rgba(255,255,255,0.12)' }}><Phone className="w-3.5 h-3.5" /> Appeler</a>
                </div>
              </div>
            )}

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

            {/* Historique d'intégration — timeline synthétique. MARKER_NO_SQL_V24D :
                dérivée UNIQUEMENT des champs existants de newcomer_intakes, aucun SQL, aucun champ inventé. */}
            <div className="card-royal p-5" data-marker="MARKER_NO_SQL_V24D">
              <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-4"><History className="w-4 h-4 text-gold" /> Historique d&apos;intégration</h2>
              <ol className="relative ml-2 border-l border-white/10 space-y-5">
                {/* Demande reçue */}
                <li className="relative pl-5" data-marker="MARKER_TIMELINE_RECEIVED_OK">
                  <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: '#0EA5E9' }} />
                  <p className="font-inter text-sm text-pearl/85">Demande reçue</p>
                  <p className="font-inter text-[11px] text-pearl/40 mt-0.5">{fmtDate(intake.created_at)}</p>
                </li>
                {/* Source d'entrée */}
                <li className="relative pl-5">
                  <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: '#D4AF37' }} />
                  <p className="font-inter text-sm text-pearl/85">Source d&apos;entrée</p>
                  <p className="font-inter text-[11px] text-pearl/50 mt-0.5">{sourceLabel(intake.source)}</p>
                </li>
                {/* Statut pastoral actuel */}
                <li className="relative pl-5" data-marker="MARKER_TIMELINE_STATUS_OK">
                  <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: st?.color || '#6B7280' }} />
                  <p className="font-inter text-sm text-pearl/85">Statut pastoral actuel : <span style={{ color: st?.color }}>{st?.label}</span></p>
                  {statusSince && <p className="font-inter text-[11px] text-pearl/40 mt-0.5">Depuis le {fmtDate(statusSince)}</p>}
                </li>
                {/* Urgence pastorale dérivée (V2.6-A) — seulement si en retard / à relancer */}
                {tri && (tri.isOverdue || tri.followUpDue) && (
                  <li className="relative pl-5" data-marker="MARKER_TIMELINE_URGENCY_OK">
                    <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: tri.isOverdue ? '#EF4444' : '#F59E0B' }} />
                    <p className="font-inter text-sm text-pearl/85">{tri.isOverdue ? 'En attente de contact' : 'À relancer'}</p>
                    <p className="font-inter text-[11px] text-pearl/50 mt-0.5">
                      {tri.isOverdue
                        ? `Reçue il y a ${tri.ageDays} j, pas encore contactée.`
                        : `Contactée il y a ${tri.sinceContactDays} j, sans intégration.`}
                    </p>
                  </li>
                )}
                {/* Dernière note pastorale (si disponible) */}
                {intake.metadata?.admin_note && (
                  <li className="relative pl-5">
                    <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: '#EC4899' }} />
                    <p className="font-inter text-sm text-pearl/85">Dernière note pastorale</p>
                    <p className="font-inter text-[12px] text-gold/80 mt-0.5 leading-relaxed">{intake.metadata.admin_note}</p>
                    {intake.metadata.admin_note_at && <p className="font-inter text-[11px] text-pearl/40 mt-0.5">{fmtDate(intake.metadata.admin_note_at)}</p>}
                  </li>
                )}
                {/* Prochaine action suggérée */}
                <li className="relative pl-5" data-marker="MARKER_TIMELINE_NEXT_ACTION_OK">
                  <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: '#22C55E' }} />
                  <p className="font-inter text-sm text-pearl/85">Prochaine action suggérée</p>
                  <p className="font-inter text-[12px] text-pearl/60 mt-0.5">{NEXT_ACTION[intake.status] || 'Assurer le suivi pastoral.'}</p>
                </li>
              </ol>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
