'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Users, UserCheck, UserX, Plus, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

interface Membre {
  id: string; prenom: string; nom: string; email: string; pays?: string; ville?: string
  role: string; statut: string; membre_statut: string; score_engagement: number
  date_inscription: string; derniere_connexion?: string | null; archived_at?: string | null
}

const STATUT_COLORS: Record<string, string> = { actif: '#22C55E', inactif: '#6B7280', suspendu: '#EF4444', en_attente: '#F59E0B' }
const ROLES = ['visiteur', 'membre', 'disciple', 'leader', 'berger', 'pasteur', 'admin']
const STATUTS = ['actif', 'inactif', 'suspendu', 'en_attente']

function fmt(iso?: string | null) { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) } catch { return '—' } }

export default function AdminMembresPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const [members, setMembers] = useState<Membre[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const pageSize = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ q: search, role, statut, page: String(page), pageSize: String(pageSize) })
      const r = await fetch(`/api/admin/membres?${p}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok && j.data) { setMembers(Array.isArray(j.data.members) ? j.data.members : []); setTotal(j.data.total ?? 0) }
    } catch { /* noop */ }
    setLoading(false)
  }, [search, role, statut, page])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const pages = Math.max(1, Math.ceil(total / pageSize))
  const actifs = members.filter((m) => m.statut === 'actif').length

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader eyebrow="Gouvernement pastoral" title={<>Gestion des <span className="text-cinematic-gold">Membres</span></>}
            description={`${total.toLocaleString('fr')} membres — cliquez une ligne pour la fiche 360°.`} />
          <button onClick={() => setShowCreate(true)} className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 mt-2">
            <Plus className="w-4 h-4" /> Créer un membre
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total (page)', value: members.length, icon: Users, color: '#D4AF37' },
            { label: 'Actifs (page)', value: actifs, icon: UserCheck, color: '#22C55E' },
            { label: 'Total base', value: total, icon: Users, color: '#0EA5E9' },
            { label: 'Suspendus (page)', value: members.filter((m) => m.statut === 'suspendu').length, icon: UserX, color: '#EF4444' },
          ].map((s) => (
            <div key={s.label} className="card-royal text-center py-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${s.color}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="font-cinzel text-2xl font-black text-pearl mb-1">{s.value}</div>
              <div className="text-xs text-pearl/40 font-inter">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card-royal mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input className="input-royal w-full pl-11" placeholder="Rechercher (nom, email)…" value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value) }} />
            </div>
            <select className="input-royal" value={role} onChange={(e) => { setPage(1); setRole(e.target.value) }}>
              <option value="">Tous les rôles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="input-royal" value={statut} onChange={(e) => { setPage(1); setStatut(e.target.value) }}>
              <option value="">Tous les statuts</option>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="card-royal overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pearl/5 text-left text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">
                  <th className="px-4 py-3">Membre</th><th className="px-4 py-3">Pays</th><th className="px-4 py-3">Statut spirituel</th>
                  <th className="px-4 py-3">Compte</th><th className="px-4 py-3">Inscrit</th><th className="px-4 py-3">Dern. connexion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin text-gold mx-auto" /></td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-pearl/40 font-inter text-sm">Aucun membre.</td></tr>
                ) : members.map((m) => (
                  <tr key={m.id} className="border-b border-pearl/[0.03] hover:bg-pearl/[0.03] transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/admin/membres/${m.id}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                          {(m.prenom?.[0] || '') + (m.nom?.[0] || '') || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-pearl font-inter">{m.prenom} {m.nom}{m.archived_at && <span className="ml-2 text-[10px] text-red-400/70">archivé</span>}</p>
                          <p className="text-xs text-pearl/30 font-inter">{m.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-pearl/60 font-inter">{m.pays || '—'}</td>
                    <td className="px-4 py-3"><span className="text-xs text-pearl/60 font-inter capitalize">{(m.membre_statut || '').replace('_', ' ')}</span></td>
                    <td className="px-4 py-3"><span className="text-[10px] font-poppins px-2 py-1 rounded-full capitalize" style={{ background: `${STATUT_COLORS[m.statut] || '#6B7280'}15`, color: STATUT_COLORS[m.statut] || '#6B7280' }}>{m.statut}</span></td>
                    <td className="px-4 py-3 text-xs text-pearl/40 font-inter">{fmt(m.date_inscription)}</td>
                    <td className="px-4 py-3 text-xs text-pearl/40 font-inter">{fmt(m.derniere_connexion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-t border-pearl/5">
            <span className="text-xs text-pearl/30 font-inter">Page {page} / {pages} — {total} membres</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg hover:bg-pearl/10 text-pearl/40 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-lg hover:bg-pearl/10 text-pearl/40 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {showCreate && <CreateMemberModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />}
    </div>
  )
}

function CreateMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', prenom: '', nom: '', telephone: '', pays: '', ville: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.email.includes('@')) { toast.error('Email valide requis.'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/membres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(form) })
      const j = await r.json()
      if (j.ok) { toast.success('Membre créé ✓'); onCreated() } else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="card-royal w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cinzel font-bold text-pearl text-lg">Créer un membre</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-pearl/10 text-pearl/40"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <input className="input-royal w-full" placeholder="Email *" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input-royal w-full" placeholder="Prénom" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} />
            <input className="input-royal w-full" placeholder="Nom" value={form.nom} onChange={(e) => set('nom', e.target.value)} />
          </div>
          <input className="input-royal w-full" placeholder="Téléphone" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input-royal w-full" placeholder="Pays" value={form.pays} onChange={(e) => set('pays', e.target.value)} />
            <input className="input-royal w-full" placeholder="Ville" value={form.ville} onChange={(e) => set('ville', e.target.value)} />
          </div>
        </div>
        <p className="text-[11px] text-pearl/40 font-inter mt-3">Un mot de passe temporaire est généré. Le membre pourra le réinitialiser.</p>
        <button onClick={submit} disabled={saving} className="btn-gold w-full justify-center mt-4 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : <><Plus className="w-4 h-4" /> Créer le membre</>}
        </button>
      </div>
    </div>
  )
}
