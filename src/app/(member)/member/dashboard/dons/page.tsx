'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Heart, DollarSign, TrendingUp, Crown, ArrowRight, Download, CheckCircle, Clock, Filter,
  Building2, Globe, BookOpen,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

const DonsChart = dynamic(() => import('./DonsChart'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full rounded-xl animate-pulse"
      style={{
        background:
          'linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)',
        border: '1px solid rgba(212,175,55,0.06)',
      }}
    />
  ),
})

const HISTORIQUE = [
  { mois: 'Jan', montant: 150 },
  { mois: 'Fév', montant: 150 },
  { mois: 'Mar', montant: 200 },
  { mois: 'Avr', montant: 150 },
  { mois: 'Mai', montant: 250 },
]

const MES_DONS = [
  { id: 'D001', type: 'Dîme', montant: 150, date: '2026-05-05', statut: 'validé', recu: true },
  { id: 'D002', type: 'Offrande', montant: 50, date: '2026-05-05', statut: 'validé', recu: true },
  { id: 'D003', type: 'Construction Temple', montant: 100, date: '2026-04-07', statut: 'validé', recu: true },
  { id: 'D004', type: 'Partenariat', montant: 50, date: '2026-04-07', statut: 'validé', recu: true },
  { id: 'D005', type: 'Dîme', montant: 150, date: '2026-03-04', statut: 'validé', recu: true },
  { id: 'D006', type: 'Don libre', montant: 25, date: '2026-03-04', statut: 'validé', recu: true },
  { id: 'D007', type: 'Dîme', montant: 150, date: '2026-02-03', statut: 'validé', recu: true },
  { id: 'D008', type: 'Missions', montant: 30, date: '2026-01-06', statut: 'validé', recu: true },
]

const TYPE_COLORS: Record<string, string> = {
  'Dîme': '#D4AF37',
  'Offrande': '#EC4899',
  'Partenariat': '#8B5CF6',
  'Don libre': '#22C55E',
  'Construction Temple': '#F97316',
  'Missions': '#0EA5E9',
}

type Campagne = { nom: string; icon: LucideIcon; pct: number; couleur: string; montantPersonnel: number }
const CAMPAGNES: Campagne[] = [
  { nom: 'Construction Temple 2026', icon: Building2, pct: 67, couleur: '#D4AF37', montantPersonnel: 100 },
  { nom: 'Missions Évangéliques',     icon: Globe,    pct: 76, couleur: '#22C55E', montantPersonnel: 0   },
  { nom: 'Bourses CFIC',              icon: BookOpen, pct: 61, couleur: '#8B5CF6', montantPersonnel: 0   },
]

export default function MesDonsPage() {
  const [filter, setFilter] = useState('Tous')

  const totalGlobal = MES_DONS.reduce((acc, d) => acc + d.montant, 0)
  const totalMois = MES_DONS.filter(d => d.date.startsWith('2026-05')).reduce((acc, d) => acc + d.montant, 0)
  const nbDons = MES_DONS.length
  const types = Array.from(new Set(MES_DONS.map(d => d.type)))

  const filtered = filter === 'Tous' ? MES_DONS : MES_DONS.filter(d => d.type === filter)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Espace Membre"
          title={<>Mes <span className="text-cinematic-gold">Dons</span></>}
          description="Historique de vos contributions au Royaume."
          actions={
            <Link href="/dons" className="btn-gold text-sm py-2.5 px-5">
              <Heart className="w-4 h-4" />
              Faire un Don
            </Link>
          }
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total 2026', value: `${totalGlobal}€`, icon: DollarSign, color: '#D4AF37' },
            { label: 'Ce mois (mai)', value: `${totalMois}€`, icon: TrendingUp, color: '#22C55E' },
            { label: 'Dons effectués', value: String(nbDons), icon: Heart, color: '#EC4899' },
            { label: 'Statut Partenaire', value: 'Actif', icon: Crown, color: '#8B5CF6' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card-royal">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${kpi.color}18` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="font-cinzel text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[11px] text-pearl/35 font-inter mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card-royal lg:col-span-2">
            <h3 className="font-cinzel text-sm font-bold text-pearl mb-5">Évolution de mes Dons</h3>
            <div className="h-[180px]">
              <DonsChart data={HISTORIQUE} />
            </div>
          </motion.div>

          {/* Campagnes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="card-royal">
            <h3 className="font-cinzel text-sm font-bold text-pearl mb-5">Campagnes Actives</h3>
            <div className="space-y-5">
              {CAMPAGNES.map(c => (
                <div key={c.nom}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${c.couleur}18`, border: `1px solid ${c.couleur}30` }}
                      >
                        <c.icon className="w-3.5 h-3.5" style={{ color: c.couleur }} />
                      </div>
                      <span className="text-xs font-inter font-semibold text-pearl leading-tight truncate">{c.nom}</span>
                    </div>
                    <span className="text-xs font-cinzel font-bold tabular-nums flex-shrink-0" style={{ color: c.couleur }}>{c.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${c.pct}%` }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full" style={{ background: c.couleur }}
                    />
                  </div>
                  {c.montantPersonnel > 0 && (
                    <div className="text-[10px] font-inter text-pearl/30">
                      Votre contribution : <span className="text-gold font-semibold">{c.montantPersonnel}€</span>
                    </div>
                  )}
                  {c.montantPersonnel === 0 && (
                    <Link href="/dons" className="text-[10px] font-inter text-pearl/25 hover:text-gold transition-colors">
                      Contribuer à cette campagne →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="card-royal overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
              <Heart className="w-4 h-4 text-gold" />
              Historique des Transactions
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="input-royal text-xs py-1.5 px-3 w-36"
              >
                <option>Tous</option>
                {types.map(t => <option key={t}>{t}</option>)}
              </select>
              <button className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                <Download className="w-3 h-3" />
                Reçus fiscaux
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pearl/[0.04]">
                  {['ID', 'Type de don', 'Montant', 'Date', 'Statut', 'Reçu'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-pearl/30 uppercase tracking-wider font-inter">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((don, i) => (
                  <motion.tr key={don.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.04 * i }}
                    className="border-b border-pearl/[0.03] hover:bg-pearl/[0.02] transition-colors"
                  >
                    <td className="px-3 py-3 text-[10px] font-mono text-pearl/25">{don.id}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-inter"
                        style={{ background: `${TYPE_COLORS[don.type] || '#6B7280'}15`, color: TYPE_COLORS[don.type] || '#6B7280' }}>
                        {don.type}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-cinzel text-sm font-black text-gold">{don.montant}€</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-pearl/40 font-inter">{don.date}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 font-inter">Validé</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button className="text-[10px] font-inter text-pearl/30 hover:text-gold transition-colors flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom CTA */}
          <div className="mt-5 pt-5 border-t border-pearl/5 flex items-center justify-between">
            <p className="text-xs text-pearl/30 font-inter">
              Total en 2026 : <span className="text-gold font-bold font-cinzel">{totalGlobal}€</span>
            </p>
            <Link href="/dons" className="btn-gold text-xs py-2 px-4">
              Faire un don
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* Partenariat card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-6 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(212,175,55,0.06) 100%)', border: '1px solid rgba(212,175,55,0.15)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center flex-shrink-0">
            <Crown className="w-8 h-8 text-gold" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-cinzel text-base font-bold text-pearl mb-1">Devenir Partenaire du Royaume</h3>
            <p className="font-inter text-xs text-pearl/45">
              En tant que partenaire mensuel, vous recevez des rapports d'impact personnalisés, un accès prioritaire aux formations premium et la possibilité de participer aux consultations pastorales.
            </p>
          </div>
          <Link href="/dons" className="btn-gold flex-shrink-0 text-sm">
            Devenir Partenaire
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
