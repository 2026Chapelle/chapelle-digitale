'use client'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Users, TrendingUp, Heart, BookOpen, DollarSign,
  Tv, AlertCircle, CheckCircle, Globe, Activity,
  ArrowUp, ArrowDown, Filter
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

const ChartSkeleton = () => (
  <div
    className="w-full h-full rounded-xl animate-pulse"
    style={{
      background: 'linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)',
      border: '1px solid rgba(212,175,55,0.06)',
    }}
  />
)

const GrowthChart = dynamic(() => import('./GrowthChart'), { ssr: false, loading: ChartSkeleton })
const PlatformsChart = dynamic(() => import('./PlatformsChart'), { ssr: false, loading: ChartSkeleton })

const GROWTH_DATA = [
  { mois: 'Jan', membres: 1200, dons: 4500, formations: 200 },
  { mois: 'Fév', membres: 1800, dons: 5200, formations: 310 },
  { mois: 'Mar', membres: 2400, dons: 6100, formations: 450 },
  { mois: 'Avr', membres: 3200, dons: 7800, formations: 590 },
  { mois: 'Mai', membres: 4100, dons: 9200, formations: 740 },
]

const PLATFORM_DATA = [
  { name: 'CIER', value: 35, color: '#D4AF37' },
  { name: 'Jeunesse', value: 20, color: '#6366F1' },
  { name: 'Femmes', value: 18, color: '#EC4899' },
  { name: 'Famille', value: 12, color: '#F97316' },
  { name: 'CFIC', value: 10, color: '#8B5CF6' },
  { name: 'Autres', value: 5, color: '#6B7280' },
]

const KPI_CARDS = [
  { title: 'Membres Actifs', value: '4 127', change: '+12.5%', up: true, icon: Users, color: '#D4AF37', subtitle: 'ce mois-ci' },
  { title: 'Dons (EUR)', value: '9 240€', change: '+18.3%', up: true, icon: DollarSign, color: '#22C55E', subtitle: 'ce mois-ci' },
  { title: 'Formations Complétées', value: '742', change: '+25.1%', up: true, icon: BookOpen, color: '#8B5CF6', subtitle: 'ce mois-ci' },
  { title: 'Vues Live', value: '18 540', change: '-3.2%', up: false, icon: Tv, color: '#EF4444', subtitle: 'ce mois-ci' },
]

const RECENT_ALERTS = [
  { type: 'warning', message: 'Pic de trafic détecté : 3x la normale sur YouTube', time: 'Il y a 5min' },
  { type: 'success', message: 'Objectif de dons Mai atteint à 95%', time: 'Il y a 1h' },
  { type: 'info', message: '47 nouveaux membres inscrits aujourd\'hui', time: 'Il y a 2h' },
  { type: 'success', message: 'Live du dimanche : 2 847 spectateurs en simultané', time: 'Il y a 1j' },
]

const RECENT_MEMBERS = [
  { nom: 'Amina K.', pays: '🇨🇮', statut: 'Nouveau membre', date: '10 mai', avatar: 'AK', couleur: '#EC4899' },
  { nom: 'David M.', pays: '🇨🇩', statut: 'Disciple', date: '09 mai', avatar: 'DM', couleur: '#0EA5E9' },
  { nom: 'Sarah P.', pays: '🇫🇷', statut: 'Leader cellule', date: '09 mai', avatar: 'SP', couleur: '#22C55E' },
  { nom: 'John A.', pays: '🇬🇧', statut: 'Nouveau membre', date: '08 mai', avatar: 'JA', couleur: '#F97316' },
  { nom: 'Grace N.', pays: '🇳🇬', statut: 'Membre actif', date: '08 mai', avatar: 'GN', couleur: '#8B5CF6' },
]

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">

        {/* Header */}
        <PageHeader
          eyebrow="Administration"
          title={<>Tableau de Bord <span className="text-cinematic-gold">CIER</span></>}
          description={
            <span className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
              </span>
              Données en temps réel · Mis à jour à {new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
            </span>
          }
          actions={
            <>
              <button className="btn-ghost py-2.5 px-4 flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4" />
                Filtrer
              </button>
              <select className="input-royal py-2.5 px-4 text-sm w-full sm:w-36" aria-label="Période">
                <option>Ce mois</option>
                <option>3 mois</option>
                <option>6 mois</option>
                <option>1 an</option>
              </select>
            </>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {KPI_CARDS.map((kpi, i) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card-royal relative overflow-hidden group"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at top right, ${kpi.color}10 0%, transparent 60%)` }} />
              <div className="relative flex items-start justify-between mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${kpi.color}20`, border: `1px solid ${kpi.color}30` }}
                >
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold font-inter px-2 py-1 rounded-lg ${
                  kpi.up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {kpi.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {kpi.change}
                </div>
              </div>
              <div className="font-cinzel text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs text-pearl/60 font-inter mt-1">{kpi.title}</div>
              <div className="text-[10px] text-pearl/30 font-inter">{kpi.subtitle}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 card-royal"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-cinzel text-sm font-bold text-pearl">Croissance de l'Église</h3>
              <div className="flex items-center gap-3 text-xs">
                {[{ color: '#D4AF37', label: 'Membres' }, { color: '#22C55E', label: 'Dons' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-pearl/40">
                    <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[220px]">
              <GrowthChart data={GROWTH_DATA} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card-royal"
          >
            <h3 className="font-cinzel text-sm font-bold text-pearl mb-6">Répartition Plateformes</h3>
            <div className="flex justify-center mb-4">
              <div className="relative w-[180px] h-[180px]">
                <PlatformsChart data={PLATFORM_DATA} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-cinzel font-black text-2xl text-cinematic-gold leading-none">
                    {PLATFORM_DATA.reduce((s, p) => s + p.value, 0)}%
                  </span>
                  <span className="font-inter text-[10px] mt-1 tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Membres
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {PLATFORM_DATA.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-pearl/60 font-inter">{p.name}</span>
                  </div>
                  <span className="font-bold font-cinzel" style={{ color: p.color }}>{p.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-royal"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cinzel text-sm font-bold text-pearl">Nouveaux Membres</h3>
              <button className="text-xs text-gold/70 hover:text-gold font-inter">Voir tout</button>
            </div>
            <div className="space-y-3">
              {RECENT_MEMBERS.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-abyss font-cinzel flex-shrink-0"
                    style={{ background: m.couleur }}
                  >
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-pearl font-inter flex items-center gap-2">
                      {m.nom} <span>{m.pays}</span>
                    </p>
                    <p className="text-xs text-pearl/40">{m.statut}</p>
                  </div>
                  <span className="text-xs text-pearl/30 font-inter flex-shrink-0">{m.date}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card-royal"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
                <Activity className="w-4 h-4 text-gold" />
                Alertes & Activité
              </h3>
              <button className="text-xs text-pearl/30 hover:text-gold font-inter">Tout marquer lu</button>
            </div>
            <div className="space-y-3">
              {RECENT_ALERTS.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-pearl/[0.02]">
                  {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />}
                  {alert.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
                  {alert.type === 'info' && <Globe className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm text-pearl/70 font-inter leading-relaxed">{alert.message}</p>
                    <p className="text-xs text-pearl/30 mt-0.5">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
