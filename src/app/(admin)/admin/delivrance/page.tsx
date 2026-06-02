'use client'
import { useEffect, useState } from 'react'
import { Loader2, ShieldAlert, Lock, Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

interface Demande {
  id: string; prenom?: string; email?: string; sujet?: string; description?: string
  niveau?: string; parcours_recommande?: string; statut: string; notes_internes?: string; created_at: string
}

const STATUTS = [
  { v: 'recu', l: 'Reçu' }, { v: 'en_attente', l: 'En attente' }, { v: 'en_traitement', l: 'En traitement' },
  { v: 'suivi', l: 'Suivi' }, { v: 'cloture', l: 'Clôturé' },
]
const STATUT_COLOR: Record<string, string> = { recu: '#60A5FA', en_attente: '#FBBF24', en_traitement: '#A855F7', suivi: '#22C55E', cloture: '#6B7280' }

export default function AdminDelivrancePage() {
  const [items, setItems] = useState<Demande[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState('toutes')

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const r = await fetch('/api/admin/delivrance', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) setItems(j.data || [])
    } catch { /* */ }
    setLoading(false)
  }

  async function update(id: string, patch: Record<string, any>) {
    setBusy(id)
    try {
      const r = await fetch('/api/admin/delivrance', {
        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.message)
      setItems((list) => list.map((x) => x.id === id ? { ...x, ...patch } : x))
      toast.success('Mis à jour')
    } catch { toast.error('Échec') }
    setBusy(null)
  }

  const filtered = items.filter((x) => filter === 'toutes' || x.statut === filter)
  const enAttente = items.filter((x) => ['recu', 'en_attente'].includes(x.statut)).length

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Pastoral · confidentiel"
          title={<>Cure d&apos;âme — <span className="text-cinematic-gold">suivi</span></>}
          description="Demandes d'accompagnement spirituel. Données strictement confidentielles, réservées à l'équipe pastorale."
        />

        <div className="card-cinematic p-4 mb-5 flex items-start gap-3" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
          <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="font-inter text-sm text-pearl/60"><strong className="text-pearl/80">Confidentialité.</strong> Ces informations ne doivent jamais être partagées en dehors de l&apos;équipe pastorale habilitée.</p>
        </div>

        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {[{ v: 'toutes', l: `Toutes (${items.length})` }, ...STATUTS].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-inter font-medium border transition-all ${filter === f.v ? 'bg-gold text-black border-transparent' : 'bg-white/5 text-pearl/55 border-white/10 hover:text-pearl'}`}>
              {f.l}{f.v === 'recu' && enAttente ? '' : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune demande pour le moment.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((it) => (
              <div key={it.id} className="card-cinematic p-5">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-cinzel text-sm font-bold text-pearl">{it.sujet || 'Accompagnement'}</span>
                      {it.niveau && <span className="text-[10px] font-inter px-2 py-0.5 rounded-full bg-white/5 text-pearl/50">{it.niveau}</span>}
                    </div>
                    <p className="font-inter text-[11px] text-pearl/40">{it.prenom || 'Membre'}{it.email ? ` · ${it.email}` : ''} · {new Date(it.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <select value={it.statut} onChange={(e) => update(it.id, { statut: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg text-xs font-inter text-pearl px-2.5 py-1.5"
                    style={{ color: STATUT_COLOR[it.statut] }}>
                    {STATUTS.map((s) => <option key={s.v} value={s.v} className="bg-abyss text-pearl">{s.l}</option>)}
                  </select>
                </div>

                {it.parcours_recommande && <p className="font-inter text-xs text-gold/70 mb-2">Parcours recommandé : {it.parcours_recommande}</p>}
                {it.description && <p className="font-inter text-sm text-pearl/65 mb-3 whitespace-pre-line border-l-2 border-white/10 pl-3">{it.description}</p>}

                <label className="font-inter text-[11px] uppercase tracking-wider text-pearl/40 flex items-center gap-1.5 mb-1"><ShieldAlert className="w-3 h-3" /> Notes internes (privées)</label>
                <textarea
                  rows={2}
                  defaultValue={it.notes_internes ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                  placeholder="Notes pastorales confidentielles…"
                  className="input-royal w-full text-sm mb-2"
                />
                <button onClick={() => update(it.id, { notes_internes: notes[it.id] ?? it.notes_internes ?? '' })} disabled={busy === it.id}
                  className="btn-royal text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
                  {busy === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer les notes
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
