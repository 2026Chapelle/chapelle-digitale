'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2, Mail, Download, Plus, Send, Clock, Check, Users, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type Sub = { id: string; email: string; source?: string; statut: string; created_at: string }
type Campaign = {
  id: string; sujet: string; contenu?: string; audience: string
  scheduled_at?: string | null; status: 'draft' | 'scheduled' | 'sent'
  sent_at?: string | null; recipients_count: number; created_at: string
}
const fmt = (s?: string | null) => { if (!s) return '—'; try { return new Date(s).toLocaleString('fr-FR') } catch { return s } }

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: '#9CA3AF' },
  scheduled: { label: 'Programmé', color: '#0EA5E9' },
  sent: { label: 'Envoyé', color: '#22C55E' },
}

export default function AdminNewsletterPage() {
  const [rows, setRows] = useState<Sub[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ sujet: '', contenu: '', audience: 'tous', scheduled_at: '' })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rs, rc] = await Promise.all([
        fetch('/api/admin/newsletter', { credentials: 'same-origin' }).then((r) => r.json()),
        fetch('/api/admin/newsletter/campaigns', { credentials: 'same-origin' }).then((r) => r.json()),
      ])
      if (rs.demo || rc.demo) setDemo(true)
      if (rs.ok) setRows(rs.data || [])
      if (rc.ok) setCampaigns(rc.data || [])
      if (!rs.ok && rs.message) setError(rs.message)
    } catch { setError('Erreur réseau') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function removeSub(id: string) {
    if (!confirm('Supprimer cet abonné ?')) return
    await fetch('/api/admin/newsletter', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) })
    load()
  }
  function exportCsv() {
    const csv = ['email,source,date', ...rows.map((r) => `${r.email},${r.source || ''},${r.created_at}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'newsletter.csv'; a.click()
  }

  async function saveCampaign(asScheduled: boolean) {
    if (!form.sujet.trim()) { setError('Sujet requis.'); return }
    const payload: any = { sujet: form.sujet, contenu: form.contenu, audience: form.audience }
    if (asScheduled && form.scheduled_at) payload.scheduled_at = new Date(form.scheduled_at).toISOString()
    const r = await fetch('/api/admin/newsletter/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) })
    const j = await r.json()
    if (j.ok) { setComposing(false); setForm({ sujet: '', contenu: '', audience: 'tous', scheduled_at: '' }); load() }
    else setError(j.message || 'Échec')
  }
  async function campaignAction(id: string, action: 'send') {
    if (action === 'send' && !confirm('Marquer cette campagne comme envoyée ? (l\'expédition réelle reste à configurer)')) return
    await fetch('/api/admin/newsletter/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, action }) })
    load()
  }
  async function removeCampaign(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return
    await fetch('/api/admin/newsletter/campaigns', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) })
    load()
  }

  const audiences = ['tous', ...Array.from(new Set(rows.map((r) => r.source).filter(Boolean) as string[]))]

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Administration" title={<>News<span className="text-cinematic-gold">letter</span></>} description="Campagnes & abonnés."
          actions={<button onClick={() => setComposing(true)} disabled={demo} className="btn-gold-cinematic px-4 py-2 text-xs disabled:opacity-40"><Plus className="w-4 h-4" /> Nouvelle campagne</button>} />

        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour gérer campagnes et abonnés.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {/* Bandeau d'état d'envoi */}
        <div className="card-cinematic p-3 mb-6 text-xs font-inter flex items-center gap-2" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <Clock className="w-4 h-4" style={{ color: '#F59E0B' }} />
          <span style={{ color: '#F59E0B' }}>Envoi réel actif si <code className="px-1 rounded bg-black/30">RESEND_API_KEY</code> est configuré (sinon : campagne enregistrée et horodatée, sans expédition). « Envoyer » utilise l&apos;audience choisie.</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : (
          <>
            {/* Campagnes */}
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-3">Campagnes</h2>
            {campaigns.length === 0 ? (
              <div className="card-cinematic p-8 text-center text-pearl/40 font-inter mb-8"><Send className="w-7 h-7 mx-auto mb-3 text-gold/50" />Aucune campagne. Cliquez sur « Nouvelle campagne ».</div>
            ) : (
              <div className="card-cinematic overflow-hidden mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                      <th className="px-4 py-3">Sujet</th><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Programmé / Envoyé</th><th className="px-4 py-3">Dest.</th><th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const meta = STATUS_META[c.status] || STATUS_META.draft
                      return (
                        <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-pearl/80 max-w-[240px] truncate">{c.sujet}</td>
                          <td className="px-4 py-3 text-pearl/50 text-xs">{c.audience}</td>
                          <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.label}</span></td>
                          <td className="px-4 py-3 text-pearl/40 text-xs">{c.status === 'sent' ? fmt(c.sent_at) : fmt(c.scheduled_at)}</td>
                          <td className="px-4 py-3 text-pearl/50 text-xs">{c.status === 'sent' ? c.recipients_count : '—'}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {c.status !== 'sent' && (
                              <button onClick={() => campaignAction(c.id, 'send')} title="Envoyer maintenant" className="text-pearl/40 hover:text-cinematic-gold p-1.5"><Send className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => removeCampaign(c.id)} title="Supprimer" className="text-pearl/40 hover:text-danger p-1.5"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Abonnés */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-cinzel text-sm font-bold text-pearl">Abonnés ({rows.length})</h2>
              {rows.length > 0 && <button onClick={exportCsv} className="btn-gold-cinematic px-3 py-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Exporter CSV</button>}
            </div>
            {rows.length === 0 ? (
              <div className="card-cinematic p-8 text-center text-pearl/40 font-inter"><Mail className="w-7 h-7 mx-auto mb-3 text-gold/50" />Aucun abonné pour le moment.</div>
            ) : (
              <div className="card-cinematic overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-pearl/80">{s.email}</td>
                        <td className="px-4 py-3 text-pearl/40 text-xs">{s.source}</td>
                        <td className="px-4 py-3 text-pearl/40 text-xs">{fmt(s.created_at)}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => removeSub(s.id)} className="text-pearl/40 hover:text-danger p-1.5"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer modal */}
      {composing && (
        <div className="admin-modal-overlay flex items-center justify-center p-4" onClick={() => setComposing(false)}>
          <div className="admin-modal-box w-full max-w-xl max-h-[88vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h2 className="font-cinzel text-lg font-bold text-pearl">Nouvelle campagne</h2>
              <button onClick={() => setComposing(false)} className="text-pearl/40 hover:text-pearl"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Sujet *</label>
                <input value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} className="input-royal" placeholder="Objet de l'email" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Contenu</label>
                <textarea rows={6} value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} className="input-royal resize-none" placeholder="Message…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider"><Users className="w-3 h-3 inline" /> Audience</label>
                  <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="input-royal">
                    {audiences.map((a) => <option key={a} value={a}>{a === 'tous' ? 'Tous les abonnés' : a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Programmer (optionnel)</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="input-royal" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setComposing(false)} className="px-4 py-2 rounded-xl text-sm font-inter text-pearl/50 hover:text-pearl">Annuler</button>
              <button onClick={() => saveCampaign(false)} className="px-4 py-2 rounded-xl text-sm font-inter text-pearl/70 hover:text-pearl inline-flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}><Check className="w-4 h-4" /> Brouillon</button>
              {form.scheduled_at
                ? <button onClick={() => saveCampaign(true)} className="btn-gold-cinematic px-5 py-2.5 text-sm"><Clock className="w-4 h-4" /> Programmer</button>
                : <button onClick={() => saveCampaign(false)} className="btn-gold-cinematic px-5 py-2.5 text-sm"><Send className="w-4 h-4" /> Créer</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
