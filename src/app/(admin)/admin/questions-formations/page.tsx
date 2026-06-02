'use client'
import { useEffect, useState } from 'react'
import { Loader2, HelpCircle, Send, Trash2, Check, Globe, Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

interface Q {
  id: string
  question: string
  reponse: string | null
  statut: string
  is_public: boolean
  auteur: string | null
  email: string | null
  created_at: string
  formations: { titre: string | null; slug: string | null } | { titre: string | null; slug: string | null }[] | null
}

const titreOf = (q: Q) => {
  const f: any = Array.isArray(q.formations) ? q.formations[0] : q.formations
  return f?.titre || 'Formation'
}

export default function AdminQuestionsPage() {
  const [items, setItems] = useState<Q[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<'toutes' | 'ouverte' | 'repondue'>('toutes')

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const r = await fetch('/api/admin/questions', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) setItems(j.data || [])
    } catch { /* */ }
    setLoading(false)
  }

  async function answer(q: Q) {
    const reponse = (drafts[q.id] ?? q.reponse ?? '').trim()
    if (!reponse) { toast.error('Réponse vide.'); return }
    setBusy(q.id)
    try {
      const r = await fetch('/api/admin/questions', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id, reponse }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.message)
      toast.success('Réponse envoyée à l\'apprenant 🙏')
      setItems((list) => list.map((x) => x.id === q.id ? { ...x, reponse, statut: 'repondue' } : x))
    } catch { toast.error('Échec') }
    setBusy(null)
  }

  async function togglePublic(q: Q) {
    try {
      await fetch('/api/admin/questions', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id, is_public: !q.is_public }),
      })
      setItems((list) => list.map((x) => x.id === q.id ? { ...x, is_public: !x.is_public } : x))
    } catch { toast.error('Échec') }
  }

  async function remove(q: Q) {
    if (!confirm('Supprimer cette question ?')) return
    try {
      await fetch('/api/admin/questions', {
        method: 'DELETE', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id }),
      })
      setItems((list) => list.filter((x) => x.id !== q.id))
    } catch { toast.error('Échec') }
  }

  const filtered = items.filter((q) => filter === 'toutes' || q.statut === filter)
  const ouvertes = items.filter((q) => q.statut === 'ouverte').length

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Formations"
          title={<>Questions des <span className="text-cinematic-gold">apprenants</span></>}
          description="Répondez aux questions ; l'apprenant est notifié par email. Rendez une réponse publique pour en faire profiter toute la promotion."
        />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        <div className="flex items-center gap-2 mb-5">
          {(['toutes', 'ouverte', 'repondue'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-inter font-medium border transition-all ${filter === f ? 'bg-gold text-black border-transparent' : 'bg-white/5 text-pearl/55 border-white/10 hover:text-pearl'}`}>
              {f === 'toutes' ? `Toutes (${items.length})` : f === 'ouverte' ? `En attente (${ouvertes})` : 'Répondues'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune question pour le moment.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((q) => (
              <div key={q.id} className="card-cinematic p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-inter font-bold px-2 py-0.5 rounded-full" style={{ background: '#0EA5E915', color: '#0EA5E9' }}>{titreOf(q)}</span>
                      {q.statut === 'repondue'
                        ? <span className="text-[10px] font-inter font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 inline-flex items-center gap-1"><Check className="w-3 h-3" /> Répondue</span>
                        : <span className="text-[10px] font-inter font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">En attente</span>}
                    </div>
                    <p className="font-inter text-[11px] text-pearl/40">{q.auteur || 'Membre'}{q.email ? ` · ${q.email}` : ''} · {new Date(q.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => togglePublic(q)} title={q.is_public ? 'Public (visible par la promotion)' : 'Privé'}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-pearl/50">
                      {q.is_public ? <Globe className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove(q)} className="p-1.5 rounded-lg hover:bg-white/10 text-pearl/40 hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <p className="font-inter text-sm text-pearl/80 mb-3 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" /> {q.question}
                </p>

                <textarea
                  rows={3}
                  defaultValue={q.reponse ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  placeholder="Votre réponse…"
                  className="input-royal w-full text-sm mb-2"
                />
                <button onClick={() => answer(q)} disabled={busy === q.id}
                  className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
                  {busy === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {q.statut === 'repondue' ? 'Mettre à jour la réponse' : 'Répondre & notifier'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
