'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, AlertCircle, CheckCircle, Archive, MessageSquare } from 'lucide-react'
import { MES_PRIERES, PRIERES_COMMUNAUTE, CATEGORIES_PRIERE } from '@/lib/mock/prieres'
import { PageHeader } from '@/components/ui/PageHeader'

const ALL_PRIERES = [...MES_PRIERES, ...PRIERES_COMMUNAUTE]

const TABS = ['Toutes', 'Actives', 'Urgentes', 'Exaucées', 'Archivées'] as const
type Tab = typeof TABS[number]

const STATS = [
  { label: 'Total demandes', value: ALL_PRIERES.length, icon: Heart, color: '#EC4899' },
  { label: 'Actives', value: ALL_PRIERES.filter((p) => p.statut === 'active').length, icon: CheckCircle, color: '#22C55E' },
  { label: 'Urgentes', value: ALL_PRIERES.filter((p) => p.is_urgente).length, icon: AlertCircle, color: '#EF4444' },
  { label: 'Exaucées', value: ALL_PRIERES.filter((p) => p.statut === 'exaucée').length, icon: CheckCircle, color: '#D4AF37' },
]

const STATUT_COLORS: Record<string, string> = {
  active: '#22C55E',
  exaucée: '#D4AF37',
  archivée: '#6B7280',
}

export default function AdminPrieresPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Toutes')

  const filtered = ALL_PRIERES.filter((p) => {
    if (activeTab === 'Toutes') return true
    if (activeTab === 'Actives') return p.statut === 'active'
    if (activeTab === 'Urgentes') return p.is_urgente
    if (activeTab === 'Exaucées') return p.statut === 'exaucée'
    if (activeTab === 'Archivées') return p.statut === 'archivée'
    return true
  })

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Gestion des <span className="text-cinematic-gold">Prières</span></>}
          description="Toutes les demandes de prière de la communauté CIER mondiale."
        />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {STATS.map((s) => (
            <div key={s.label} className="card-royal text-center py-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: `${s.color}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="font-cinzel text-2xl font-black text-pearl mb-1">{s.value}</div>
              <div className="text-xs text-pearl/40 font-inter">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-6 flex-wrap"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gold text-black'
                  : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10 hover:text-pearl/80'
              }`}
            >
              {tab}
              {tab === 'Urgentes' && (
                <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                  {ALL_PRIERES.filter((p) => p.is_urgente).length}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const cat = CATEGORIES_PRIERE.find((c) => c.label === p.categorie)
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="card-royal"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl flex-shrink-0">{cat?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-cinzel font-bold text-pearl text-sm">{p.sujet}</h3>
                      {p.is_urgente && (
                        <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-poppins flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Urgente
                        </span>
                      )}
                      <span
                        className="text-[10px] font-poppins px-2 py-0.5 rounded-full border"
                        style={{
                          background: `${STATUT_COLORS[p.statut]}15`,
                          color: STATUT_COLORS[p.statut],
                          borderColor: `${STATUT_COLORS[p.statut]}30`,
                        }}
                      >
                        {p.statut.charAt(0).toUpperCase() + p.statut.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-pearl/40 font-inter mb-2 leading-relaxed line-clamp-2">{p.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-pearl/30 font-inter">
                      <span>par {p.is_anonyme ? 'Anonyme' : (p.auteur ?? 'Anonyme')}</span>
                      <span>{p.date}</span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-pink-400" />
                        {p.nb_priants} priants
                      </span>
                      <span className="badge-royal">{p.categorie}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="p-2 rounded-xl hover:bg-gold/15 transition-colors text-pearl/30 hover:text-gold"
                      title="Marquer exaucée"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-xl hover:bg-pearl/10 transition-colors text-pearl/30 hover:text-pearl"
                      title="Archiver"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-xl hover:bg-pearl/10 transition-colors text-pearl/30 hover:text-pearl"
                      title="Répondre"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 card-royal">
              <div className="text-5xl mb-4">🙏</div>
              <p className="font-cinzel text-lg text-pearl/50">Aucune demande dans cette catégorie</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
