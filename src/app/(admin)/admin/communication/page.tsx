'use client'
import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Send, Mail, Bell, Loader2, Plus, Trash2, BarChart3, FileText } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

const ROLES = ['visiteur', 'membre', 'disciple', 'leader', 'berger', 'formateur', 'responsable_integration', 'responsable_national', 'pasteur_national', 'admin']
const STATUTS = ['visiteur', 'nouveau_membre', 'membre_actif', 'disciple', 'leader_cellule', 'berger', 'pasteur']
const PLATEFORMES = ['cier', 'chapelle-familiale', 'jeunesse', 'femmes-exceptions', 'cite-refuge', 'cfic', 'mahanaim', 'familles-chapelle']
const TABS = ['Campagnes', 'Annonces', 'Modèles'] as const
type Tab = typeof TABS[number]

function Chips({ all, sel, onToggle }: { all: string[]; sel: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((v) => (
        <button key={v} type="button" onClick={() => onToggle(v)}
          className="text-[11px] font-inter px-2.5 py-1 rounded-full capitalize transition-colors"
          style={sel.includes(v) ? { background: 'rgba(212,175,55,0.2)', color: '#D4AF37' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
          {v.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )
}

export default function AdminCommunicationPage() {
  const [tab, setTab] = useState<Tab>('Campagnes')
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Gouvernement pastoral" title={<>Centre de <span className="text-cinematic-gold">Communication</span></>}
          description="Campagnes ciblées, annonces officielles, modèles et journal — in-app & email." />
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-inter font-medium ${tab === t ? 'bg-gold text-black' : 'bg-pearl/5 text-pearl/50 hover:text-pearl/80'}`}>{t}</button>
          ))}
        </div>
        {tab === 'Campagnes' && <Campaigns />}
        {tab === 'Annonces' && <Announcements />}
        {tab === 'Modèles' && <Templates />}
      </div>
    </div>
  )
}

function Campaigns() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ sujet: '', body: '', channel: 'in_app', roles: [] as string[], statuts: [] as string[], plateformes: [] as string[], pays: '' })
  const [saving, setSaving] = useState(false)
  const toggle = (k: 'roles' | 'statuts' | 'plateformes', v: string) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }))

  const load = useCallback(async () => {
    try { const r = await fetch('/api/admin/communication/campaigns', { credentials: 'same-origin' }); const j = await r.json(); if (j.ok) setList(j.data) } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const target = () => ({ roles: f.roles, statuts: f.statuts, plateformes: f.plateformes, pays: f.pays.split(',').map((x) => x.trim()).filter(Boolean) })

  async function create(send: boolean) {
    if (!f.sujet.trim()) { toast.error('Sujet requis.'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/communication/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ sujet: f.sujet, body: f.body, channel: f.channel, target: target() }) })
      const j = await r.json()
      if (!j.ok) { toast.error(j.message || 'Échec'); setSaving(false); return }
      if (send) {
        const rs = await fetch('/api/admin/communication/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: j.data.id, action: 'send' }) })
        const js = await rs.json()
        if (js.ok) toast.success(`Envoyée à ${js.recipients} destinataire(s)${js.emails_sent ? ` · ${js.emails_sent} emails` : ''}`); else toast.error(js.message || 'Échec envoi')
      } else toast.success('Campagne enregistrée (brouillon)')
      setF({ sujet: '', body: '', channel: 'in_app', roles: [], statuts: [], plateformes: [], pays: '' })
      load()
    } catch { toast.error('Erreur réseau') }
    setSaving(false)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-royal space-y-3">
        <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2"><Send className="w-4 h-4 text-gold" /> Nouvelle campagne</h2>
        <input className="input-royal w-full" placeholder="Sujet" value={f.sujet} onChange={(e) => setF({ ...f, sujet: e.target.value })} />
        <textarea className="input-royal w-full resize-none" rows={4} placeholder="Message… (variables : {prenom})" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-pearl/45 font-inter">Canal</span>
          <select className="input-royal" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>
            <option value="in_app">In-app</option><option value="email">Email</option><option value="both">Les deux</option>
          </select>
        </div>
        <div><p className="text-[11px] text-pearl/45 font-inter mb-1">Rôles</p><Chips all={ROLES} sel={f.roles} onToggle={(v) => toggle('roles', v)} /></div>
        <div><p className="text-[11px] text-pearl/45 font-inter mb-1">Statut spirituel</p><Chips all={STATUTS} sel={f.statuts} onToggle={(v) => toggle('statuts', v)} /></div>
        <div><p className="text-[11px] text-pearl/45 font-inter mb-1">Plateformes</p><Chips all={PLATEFORMES} sel={f.plateformes} onToggle={(v) => toggle('plateformes', v)} /></div>
        <input className="input-royal w-full" placeholder="Pays (séparés par des virgules) — vide = tous" value={f.pays} onChange={(e) => setF({ ...f, pays: e.target.value })} />
        <p className="text-[11px] text-pearl/35 font-inter">Cible vide = tous les membres.</p>
        <div className="flex gap-2">
          <button disabled={saving} onClick={() => create(false)} className="btn-royal text-sm px-4 py-2 disabled:opacity-50">Enregistrer</button>
          <button disabled={saving} onClick={() => create(true)} className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer</button>
        </div>
      </div>

      <div className="card-royal">
        <h2 className="font-cinzel font-bold text-pearl text-sm mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gold" /> Journal des campagnes</h2>
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : list.length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucune campagne.</p> : (
          <div className="space-y-2">
            {list.map((c) => (
              <div key={c.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-pearl/80 font-inter truncate">{c.sujet}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-inter capitalize" style={{ background: c.status === 'sent' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: c.status === 'sent' ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>{c.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-pearl/40 font-inter">
                  <span className="inline-flex items-center gap-1"><Bell className="w-3 h-3" /> {c.channel}</span>
                  <span>{c.recipients_count} destinataires</span>
                  {c.channel !== 'in_app' && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {c.opens_count} ouvertures</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Announcements() {
  const [list, setList] = useState<any[]>([])
  const [f, setF] = useState({ titre: '', body: '', level: 'info', roles: [] as string[], statuts: [] as string[], active_until: '' })
  const [saving, setSaving] = useState(false)
  const toggle = (k: 'roles' | 'statuts', v: string) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }))
  const load = useCallback(async () => { try { const r = await fetch('/api/admin/communication/announcements', { credentials: 'same-origin' }); const j = await r.json(); if (j.ok) setList(j.data) } catch { /* */ } }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    if (!f.titre.trim()) { toast.error('Titre requis.'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/communication/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ titre: f.titre, body: f.body, level: f.level, status: 'active', active_until: f.active_until || null, target: { roles: f.roles, statuts: f.statuts } }) })
      const j = await r.json(); if (j.ok) { toast.success('Annonce publiée'); setF({ titre: '', body: '', level: 'info', roles: [], statuts: [], active_until: '' }); load() } else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setSaving(false)
  }
  async function archive(id: string) { await fetch('/api/admin/communication/announcements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, status: 'archive' }) }); load() }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-royal space-y-3">
        <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2"><Megaphone className="w-4 h-4 text-gold" /> Nouvelle annonce</h2>
        <input className="input-royal w-full" placeholder="Titre" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} />
        <textarea className="input-royal w-full resize-none" rows={3} placeholder="Message" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-pearl/45 font-inter">Niveau</span>
          <select className="input-royal" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}><option value="info">Info</option><option value="important">Important</option><option value="critique">Critique</option></select>
          <span className="text-[11px] text-pearl/45 font-inter ml-2">Jusqu'au</span>
          <input type="date" className="input-royal" value={f.active_until} onChange={(e) => setF({ ...f, active_until: e.target.value })} />
        </div>
        <div><p className="text-[11px] text-pearl/45 font-inter mb-1">Rôles ciblés (vide = tous)</p><Chips all={ROLES} sel={f.roles} onToggle={(v) => toggle('roles', v)} /></div>
        <div><p className="text-[11px] text-pearl/45 font-inter mb-1">Statuts ciblés</p><Chips all={STATUTS} sel={f.statuts} onToggle={(v) => toggle('statuts', v)} /></div>
        <button disabled={saving} onClick={create} className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"><Plus className="w-4 h-4" /> Publier l'annonce</button>
      </div>
      <div className="card-royal">
        <h2 className="font-cinzel font-bold text-pearl text-sm mb-3">Annonces</h2>
        {list.length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucune annonce.</p> : (
          <div className="space-y-2">
            {list.map((a) => (
              <div key={a.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-sm text-pearl/80 font-inter truncate">{a.titre}</span><span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{a.level}</span><span className="text-[10px] text-pearl/30">{a.status}</span></div>
                  {a.body && <p className="text-[11px] text-pearl/40 font-inter mt-0.5 line-clamp-2">{a.body}</p>}
                </div>
                {a.status === 'active' && <button onClick={() => archive(a.id)} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Archiver</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Templates() {
  const [list, setList] = useState<any[]>([])
  const [f, setF] = useState({ nom: '', sujet: '', body: '' })
  const load = useCallback(async () => { try { const r = await fetch('/api/admin/communication/templates', { credentials: 'same-origin' }); const j = await r.json(); if (j.ok) setList(j.data) } catch { /* */ } }, [])
  useEffect(() => { load() }, [load])
  async function create() { if (!f.nom.trim()) { toast.error('Nom requis.'); return } const r = await fetch('/api/admin/communication/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(f) }); const j = await r.json(); if (j.ok) { toast.success('Modèle créé'); setF({ nom: '', sujet: '', body: '' }); load() } else toast.error(j.message || 'Échec') }
  async function del(id: string) { await fetch('/api/admin/communication/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) }); load() }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-royal space-y-3">
        <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-gold" /> Nouveau modèle</h2>
        <input className="input-royal w-full" placeholder="Nom du modèle" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
        <input className="input-royal w-full" placeholder="Sujet" value={f.sujet} onChange={(e) => setF({ ...f, sujet: e.target.value })} />
        <textarea className="input-royal w-full resize-none" rows={4} placeholder="Corps (variables : {prenom})" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <button onClick={create} className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> Créer</button>
      </div>
      <div className="card-royal">
        <h2 className="font-cinzel font-bold text-pearl text-sm mb-3">Modèles</h2>
        {list.length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucun modèle.</p> : (
          <div className="space-y-2">
            {list.map((t) => (
              <div key={t.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex items-center gap-2">
                <span className="text-sm text-pearl/80 font-inter flex-1 truncate">{t.nom}</span>
                <button onClick={() => del(t.id)} className="p-1 rounded-lg hover:bg-pearl/10 text-pearl/40"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
