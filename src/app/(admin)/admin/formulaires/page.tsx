'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Inbox, Search, Mail, Phone, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { type FormStatus, type FormSubmission } from '@/lib/admin-data'
import { useAdminData } from '@/lib/chapelle/useAdminData'

const STATUS_META: Record<FormStatus, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau', color: '#D4AF37' },
  en_cours: { label: 'En cours', color: '#0EA5E9' },
  traite: { label: 'Traité', color: '#22C55E' },
}
const FILTERS: { key: FormStatus | 'tous'; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'nouveau', label: 'Nouveaux' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'traite', label: 'Traités' },
]

export default function AdminFormulairesPage() {
  // Branché sur Supabase (table chapelle.form_submissions).
  // Aucune donnée fictive : liste vide tant qu'aucune soumission réelle n'est chargée.
  const all = useAdminData<FormSubmission[]>('/api/admin/data/forms', () => [])
  const [filter, setFilter] = useState<FormStatus | 'tous'>('tous')
  const [q, setQ] = useState('')

  const rows = all.filter((r) => {
    const okStatus = filter === 'tous' || r.status === filter
    const okQ = !q || `${r.prenom} ${r.email} ${r.source}`.toLowerCase().includes(q.toLowerCase())
    return okStatus && okQ
  })

  const counts = {
    tous: all.length,
    nouveau: all.filter((r) => r.status === 'nouveau').length,
    en_cours: all.filter((r) => r.status === 'en_cours').length,
    traite: all.filter((r) => r.status === 'traite').length,
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Formulaires <span className="text-cinematic-gold">reçus</span></>}
          description="Leads du tunnel (intégration, service, partenariat) — synchronisés avec FluentCRM."
        />

        {/* Filtres + recherche */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg font-inter text-xs font-semibold transition-all"
                style={filter === f.key ? { background: 'linear-gradient(135deg,#F5E6A7,#D4AF37)', color: '#1A0F00' } : { color: 'rgba(255,255,255,0.5)' }}>
                {f.label} <span className="opacity-60">({counts[f.key]})</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
            <input className="input-royal pl-10 py-2.5" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="card-cinematic overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Contact', 'Source', 'Message', 'Statut', 'Reçu le'].map((h) => (
                    <th key={h} className="font-inter text-[11px] font-bold uppercase tracking-wider text-pearl/40 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const meta = STATUS_META[r.status]
                  return (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-inter text-sm font-semibold text-pearl">{r.prenom}</div>
                        <div className="flex items-center gap-2 text-[11px] text-pearl/40 mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>
                          {r.telephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.telephone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-inter text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{r.source}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-inter text-xs text-pearl/55 truncate">{r.message || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-inter text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${meta.color}1A`, color: meta.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-inter text-xs text-pearl/40 whitespace-nowrap">{r.date}</td>
                    </motion.tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center font-inter text-sm text-pearl/40">
                    <Inbox className="w-6 h-6 mx-auto mb-2 opacity-40" />Aucun formulaire pour ce filtre.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="font-inter text-[11px] text-pearl/30 mt-4 flex items-center gap-1.5">
          <Check className="w-3 h-3 text-divine" /> Architecture prête pour Supabase (table <code className="text-pearl/50">form_submissions</code>) + FluentCRM.
        </p>
      </div>
    </div>
  )
}
