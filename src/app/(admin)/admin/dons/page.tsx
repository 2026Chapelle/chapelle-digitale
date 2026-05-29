'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, Heart, Target, Users,
  Download, Filter, Calendar, ChevronDown,
  CheckCircle, Clock, ArrowUpRight, Building2, Globe, BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

const AdminDonsChart = dynamic(() => import('./AdminDonsChart'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full rounded-xl animate-pulse"
      style={{
        background: 'linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)',
        border: '1px solid rgba(212,175,55,0.06)',
      }}
    />
  ),
})

const DONS_HISTORY = [
  { mois: 'Jan', total: 4500, dimes: 2800, offrandes: 1200, partenaires: 500 },
  { mois: 'Fév', total: 5200, dimes: 3100, offrandes: 1400, partenaires: 700 },
  { mois: 'Mar', total: 6100, dimes: 3600, offrandes: 1700, partenaires: 800 },
  { mois: 'Avr', total: 7800, dimes: 4500, offrandes: 2100, partenaires: 1200 },
  { mois: 'Mai', total: 9240, dimes: 5200, offrandes: 2640, partenaires: 1400 },
]

const RECENT_DONS = [
  { id: 'D001', donateur: 'David M.', drapeau: '🇨🇩', type: 'Dîme', montant: 150, devise: 'EUR', date: '2026-05-09', statut: 'validé', couleur: '#0EA5E9' },
  { id: 'D002', donateur: 'Amina K.', drapeau: '🇨🇮', type: 'Partenariat', montant: 50, devise: 'EUR', date: '2026-05-09', statut: 'validé', couleur: '#EC4899' },
  { id: 'D003', donateur: 'Marie C.', drapeau: '🇫🇷', type: 'Offrande', montant: 25, devise: 'EUR', date: '2026-05-09', statut: 'validé', couleur: '#8B5CF6' },
  { id: 'D004', donateur: 'Paul N.', drapeau: '🇧🇪', type: 'Don libre', montant: 100, devise: 'EUR', date: '2026-05-08', statut: 'en_cours', couleur: '#F97316' },
  { id: 'D005', donateur: 'Grace A.', drapeau: '🇬🇭', type: 'Dîme', montant: 75, devise: 'EUR', date: '2026-05-08', statut: 'validé', couleur: '#22C55E' },
  { id: 'D006', donateur: 'Samuel K.', drapeau: '🇨🇲', type: 'Construction Temple', montant: 500, devise: 'EUR', date: '2026-05-07', statut: 'validé', couleur: '#D4AF37' },
]

type Campagne = { nom: string; objectif: number; collecte: number; couleur: string; icon: LucideIcon }
const CAMPAGNES: Campagne[] = [
  { nom: 'Construction Temple 2026', objectif: 100000, collecte: 67450, couleur: '#D4AF37', icon: Building2 },
  { nom: 'Missions Évangéliques',     objectif: 25000,  collecte: 18900, couleur: '#22C55E', icon: Globe },
  { nom: 'Bourses CFIC',              objectif: 15000,  collecte: 9200,  couleur: '#8B5CF6', icon: BookOpen },
]

const TYPE_COLORS: Record<string, string> = {
  'Dîme': '#D4AF37',
  'Partenariat': '#8B5CF6',
  'Offrande': '#EC4899',
  'Don libre': '#22C55E',
  'Construction Temple': '#F97316',
}

export default function AdminDonsPage() {
  const [periode, setPeriode] = useState('Ce mois')
  const totalMois = 9240

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Gestion <span className="text-cinematic-gold">des Dons</span></>}
          description="Dîmes, offrandes, partenariats et campagnes de collecte."
          actions={
            <>
              <button className="btn-ghost flex items-center gap-2 text-sm py-2.5 px-4">
                <Download className="w-4 h-4" />
                Exporter
              </button>
              <select className="input-royal text-sm py-2.5 px-4 w-full sm:w-36"
                value={periode} onChange={e => setPeriode(e.target.value)} aria-label="Période">
                {['Ce mois', '3 mois', '6 mois', 'Année 2026'].map(p => <option key={p}>{p}</option>)}
              </select>
            </>
          }
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total mai 2026', value: `${totalMois.toLocaleString()}€`, change: '+18.3%', icon: DollarSign, color: '#D4AF37' },
            { label: 'Donateurs actifs', value: '892', change: '+8.1%', icon: Users, color: '#22C55E' },
            { label: 'Don moyen', value: '10.36€', change: '+9.2%', icon: TrendingUp, color: '#0EA5E9' },
            { label: 'Objectif du mois', value: '92.4%', change: 'atteint', icon: Target, color: '#8B5CF6' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card-royal">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${kpi.color}18` }}>
                  <kpi.icon className="w-4.5 h-4.5" style={{ color: kpi.color }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-lg">
                  <ArrowUpRight className="w-3 h-3" />
                  {kpi.change}
                </div>
              </div>
              <div className="font-cinzel text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[11px] text-pearl/35 font-inter mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Area chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card-royal lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-cinzel text-sm font-bold text-pearl">Évolution des Dons 2026</h3>
              <div className="flex gap-3 text-xs">
                {[{ c: '#D4AF37', l: 'Dîmes' }, { c: '#EC4899', l: 'Offrandes' }, { c: '#8B5CF6', l: 'Partenaires' }].map(l => (
                  <div key={l.l} className="flex items-center gap-1.5 text-pearl/40">
                    <div className="w-2 h-2 rounded-full" style={{ background: l.c }} />
                    {l.l}
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[220px]">
              <AdminDonsChart data={DONS_HISTORY} />
            </div>
          </motion.div>

          {/* Campagnes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="card-royal">
            <h3 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
              <Target className="w-4 h-4 text-gold" />
              Campagnes
            </h3>
            <div className="space-y-4">
              {CAMPAGNES.map((c) => {
                const pct = Math.round((c.collecte / c.objectif) * 100)
                return (
                  <div key={c.nom}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${c.couleur}18`, border: `1px solid ${c.couleur}30` }}
                        >
                          <c.icon className="w-3 h-3" style={{ color: c.couleur }} />
                        </div>
                        <span className="font-inter text-xs font-semibold text-pearl leading-tight truncate">{c.nom}</span>
                      </div>
                      <span className="font-cinzel text-xs font-black flex-shrink-0 tabular-nums" style={{ color: c.couleur }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ background: c.couleur }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-inter text-pearl/25">
                      <span>{c.collecte.toLocaleString()}€ collectés</span>
                      <span>/ {c.objectif.toLocaleString()}€</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Recent transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="card-royal overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
              <Heart className="w-4 h-4 text-gold" />
              Transactions Récentes
            </h3>
            <button className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Filter className="w-3 h-3" /> Filtrer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pearl/[0.04]">
                  {['ID', 'Donateur', 'Type', 'Montant', 'Date', 'Statut'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-pearl/30 uppercase tracking-wider font-inter">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_DONS.map((don, i) => (
                  <motion.tr key={don.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.04 * i }}
                    className="border-b border-pearl/[0.03] hover:bg-pearl/[0.02] transition-colors"
                  >
                    <td className="px-3 py-3 text-[10px] font-mono text-pearl/25">{don.id}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: don.couleur }}>
                          {don.donateur[0]}
                        </div>
                        <span className="text-xs font-semibold text-pearl font-inter">{don.donateur} {don.drapeau}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-inter"
                        style={{ background: `${TYPE_COLORS[don.type] || '#6B7280'}15`, color: TYPE_COLORS[don.type] || '#6B7280' }}>
                        {don.type}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-cinzel text-sm font-black" style={{ color: '#D4AF37' }}>
                        {don.montant}{don.devise}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-pearl/40 font-inter">{don.date}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {don.statut === 'validé'
                          ? <><CheckCircle className="w-3 h-3 text-green-400" /><span className="text-[10px] text-green-400 font-inter">Validé</span></>
                          : <><Clock className="w-3 h-3 text-yellow-400" /><span className="text-[10px] text-yellow-400 font-inter">En cours</span></>
                        }
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
