'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { BookOpen, Users, Clock, Award, ChevronRight, Trophy, Zap, GraduationCap, BookOpenCheck } from 'lucide-react'
import { FORMATIONS } from '@/lib/mock/formations'
import { PageHeader } from '@/components/ui/PageHeader'

const TABS = ['Toutes', 'En cours', 'Terminées', 'À commencer'] as const
type Tab = typeof TABS[number]

const STATS = [
  { label: 'En cours', value: 2, icon: Zap, color: '#D4AF37' },
  { label: 'Terminées', value: 1, icon: Trophy, color: '#22C55E' },
  { label: 'Points gagnés', value: 320, icon: Award, color: '#8B5CF6' },
]

function statusLabel(statut?: string) {
  if (statut === 'en_cours') return 'En cours'
  if (statut === 'terminé') return 'Terminée'
  return 'À commencer'
}

function statusClass(statut?: string) {
  if (statut === 'en_cours') return 'badge-gold'
  if (statut === 'terminé') return 'badge-royal'
  return 'text-pearl/30 border border-pearl/10 rounded-full px-2 py-0.5 text-[10px] font-poppins'
}

export default function FormationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Toutes')

  const filtered = FORMATIONS.filter((f) => {
    if (activeTab === 'Toutes') return true
    if (activeTab === 'En cours') return f.statut === 'en_cours'
    if (activeTab === 'Terminées') return f.statut === 'terminé'
    if (activeTab === 'À commencer') return f.statut === 'non_commencé' || !f.statut
    return true
  })

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Espace Membre"
          title={<>Mes <span className="text-cinematic-gold">Formations</span></>}
          description="Continuez votre parcours spirituel à votre rythme."
        />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
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

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-inter font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-gold text-black'
                  : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10 hover:text-pearl/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </motion.div>

        {/* Formation grid */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 card-royal"
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <BookOpenCheck className="w-7 h-7" style={{ color: '#D4AF37' }} />
            </div>
            <p className="font-cinzel text-lg text-pearl/60">Aucune formation dans cette catégorie</p>
            <p className="text-pearl/35 text-sm font-inter mt-1">Explorez nos formations disponibles.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link href={`/member/dashboard/formations/${f.slug}`}
                  className="card-royal flex flex-col h-full hover:border-gold/20 transition-all group block"
                >
                  {/* Top */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${f.couleur}20` }}>
                      {f.emoji}
                    </div>
                    <span className={statusClass(f.statut)}>{statusLabel(f.statut)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="badge-royal mb-2 inline-flex">{f.categorie}</div>
                    <h3 className="font-cinzel font-bold text-pearl text-base mb-1 group-hover:text-gold transition-colors">
                      {f.titre}
                    </h3>
                    <p className="text-xs text-pearl/40 font-inter mb-3 flex items-center gap-1">
                      <span>par {f.instructeur}</span>
                    </p>

                    {/* Progress bar */}
                    {f.progression !== undefined && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-pearl/40 mb-1.5 font-inter">
                          <span>Progression</span>
                          <span>{f.progression}%</span>
                        </div>
                        <div className="progress-royal">
                          <div className="progress-fill" style={{ width: `${f.progression}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-pearl/5">
                    <div className="flex items-center gap-3 text-xs text-pearl/40">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {f.nb_modules} modules
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {f.duree}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-pearl/20 group-hover:text-gold transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
