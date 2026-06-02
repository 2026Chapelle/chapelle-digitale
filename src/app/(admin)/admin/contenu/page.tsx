'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, File, Newspaper, Quote, Megaphone, MessageSquareQuote, Plus, Pencil, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import type { ContentItem, ContentType, ContentStatus } from '@/lib/admin-data'

const TYPE_META: Record<ContentType, { label: string; icon: LucideIcon; color: string }> = {
  page: { label: 'Page', icon: File, color: '#D4AF37' },
  article: { label: 'Article', icon: Newspaper, color: '#0EA5E9' },
  temoignage: { label: 'Témoignage', icon: MessageSquareQuote, color: '#14B8A6' },
  verset: { label: 'Verset', icon: Quote, color: '#8B5CF6' },
  annonce: { label: 'Annonce', icon: Megaphone, color: '#F59E0B' },
}
const STATUS_META: Record<ContentStatus, { label: string; color: string }> = {
  publie: { label: 'Publié', color: '#22C55E' },
  brouillon: { label: 'Brouillon', color: '#6B7280' },
  planifie: { label: 'Planifié', color: '#F59E0B' },
}
const FILTERS: { key: ContentType | 'tous'; label: string }[] = [
  { key: 'tous', label: 'Tout' },
  { key: 'page', label: 'Pages' },
  { key: 'article', label: 'Articles' },
  { key: 'temoignage', label: 'Témoignages' },
  { key: 'annonce', label: 'Annonces' },
  { key: 'verset', label: 'Versets' },
]

export default function AdminContenuPage() {
  // Aucune donnée fictive : la liste se remplira depuis la table `content` (Supabase).
  const all = useMemo<ContentItem[]>(() => [], [])
  const [filter, setFilter] = useState<ContentType | 'tous'>('tous')
  const rows = all.filter((c) => filter === 'tous' || c.type === filter)

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Gestion du <span className="text-cinematic-gold">contenu</span></>}
          description="Pages, articles, témoignages, annonces et versets de la plateforme."
          actions={<button className="btn-gold-cinematic px-4 py-2 text-xs"><Plus className="w-4 h-4" /> Nouveau contenu</button>}
        />

        <div className="flex items-center gap-1 p-1 rounded-xl mb-5 w-fit overflow-x-auto max-w-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg font-inter text-xs font-semibold whitespace-nowrap transition-all"
              style={filter === f.key ? { background: 'linear-gradient(135deg,#F5E6A7,#D4AF37)', color: '#1A0F00' } : { color: 'rgba(255,255,255,0.5)' }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="card-cinematic overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Titre', 'Type', 'Auteur', 'Statut', 'Maj', ''].map((h, i) => (
                    <th key={i} className="font-inter text-[11px] font-bold uppercase tracking-wider text-pearl/40 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center font-inter text-sm text-pearl/30">Aucune donnée disponible pour le moment.</td></tr>
                )}
                {rows.map((c, i) => {
                  const t = TYPE_META[c.type]
                  const s = STATUS_META[c.status]
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-inter text-sm font-semibold text-pearl">{c.titre}</div>
                        <div className="font-mono text-[11px] text-pearl/35 mt-0.5">{c.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-inter text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${t.color}1A`, color: t.color }}>
                          <t.icon className="w-3 h-3" />{t.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-inter text-xs text-pearl/55 whitespace-nowrap">{c.auteur}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-inter text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${s.color}1A`, color: s.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />{s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-inter text-xs text-pearl/40 whitespace-nowrap">{c.maj}</td>
                      <td className="px-4 py-3">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-pearl/40 hover:text-gold hover:bg-white/[0.04] transition-colors" aria-label="Éditer">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="font-inter text-[11px] text-pearl/30 mt-4 flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-gold" /> Prêt pour Supabase (table <code className="text-pearl/50">content</code>) — éditeur à brancher.
        </p>
      </div>
    </div>
  )
}
