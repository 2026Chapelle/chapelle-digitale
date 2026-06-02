'use client'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Zap, Award, BarChart2, Target } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Système d'engagement — back-office.
 * Aucune donnée fictive : le moteur de gamification (scores, badges, classement)
 * n'étant pas encore alimenté, tout est à 0 / « Aucune donnée disponible ».
 * Les vraies métriques s'afficheront dès que l'attribution réelle sera branchée.
 */
const KPI = [
  { title: 'Score moyen', value: '0', unit: '/100', icon: Target, color: '#D4AF37' },
  { title: 'Badges distribués', value: '0', unit: '', icon: Award, color: '#8B5CF6' },
  { title: 'Actions / jour', value: '0', unit: '', icon: Zap, color: '#22C55E' },
  { title: 'Taux rétention', value: '0', unit: '%', icon: TrendingUp, color: '#0EA5E9' },
]

function EmptyBlock({ title, icon: Icon, hint }: { title: string; icon: typeof Trophy; hint: string }) {
  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2"><Icon className="w-4 h-4 text-gold" /> {title}</h2>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="font-inter text-sm text-pearl/40">Aucune donnée disponible</p>
        <p className="font-inter text-xs text-pearl/25 mt-1">{hint}</p>
      </div>
    </div>
  )
}

export default function AdminEngagementPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Système <span className="text-cinematic-gold">d&apos;Engagement</span></>}
          description="Gamification, badges, classement. Aucune donnée inventée — affichage réel uniquement."
        />

        {/* KPI à zéro tant qu'aucune activité réelle n'est mesurée */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {KPI.map((k, i) => (
            <motion.div key={k.title}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card-royal">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <div className="font-cinzel text-2xl md:text-3xl font-black" style={{ color: k.color }}>
                {k.value}<span className="text-sm text-pearl/30">{k.unit}</span>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{k.title}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2"><EmptyBlock title="Classement Top Membres" icon={Trophy} hint="Le classement apparaîtra dès que les scores d'engagement réels seront calculés." /></div>
          <EmptyBlock title="Profil d'Engagement Communauté" icon={BarChart2} hint="Disponible avec les données réelles." />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmptyBlock title="Actions par Type" icon={Zap} hint="Aucune action enregistrée pour le moment." />
          <EmptyBlock title="Badges Distribués" icon={Award} hint="Aucun badge attribué pour le moment." />
        </div>
      </div>
    </div>
  )
}
