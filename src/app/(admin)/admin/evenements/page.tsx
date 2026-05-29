'use client'
import { motion } from 'framer-motion'
import { Plus, Calendar, Users, Wifi, Eye, Edit, Archive, CheckCircle } from 'lucide-react'
import { EVENEMENTS } from '@/lib/mock/evenements'
import { PageHeader } from '@/components/ui/PageHeader'

const STATS = [
  { label: 'À venir', value: EVENEMENTS.filter((e) => !e.est_passe).length, icon: Calendar, color: '#D4AF37' },
  { label: 'Inscrits total', value: EVENEMENTS.reduce((acc, e) => acc + e.nb_inscrits, 0), icon: Users, color: '#22C55E' },
  { label: 'En ligne', value: EVENEMENTS.filter((e) => e.en_ligne).length, icon: Wifi, color: '#0EA5E9' },
  { label: 'Taux présence', value: '78%', icon: CheckCircle, color: '#8B5CF6' },
]

const TYPE_COLORS: Record<string, string> = {
  Culte: '#D4AF37',
  Prière: '#8B5CF6',
  Formation: '#0EA5E9',
  Conférence: '#22C55E',
  Live: '#EC4899',
  Retraite: '#F59E0B',
}

export default function AdminEvenementsPage() {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Gestion des <span className="text-cinematic-gold">Événements</span></>}
          description="Cultes, veillées, conférences et formations en présentiel ou en ligne."
          actions={
            <button className="btn-gold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Créer un événement
            </button>
          }
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

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-royal overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pearl/5">
                  {['Événement', 'Type', 'Date & Heure', 'Lieu', 'En ligne', 'Inscrits', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EVENEMENTS.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.04 * i }}
                    className="border-b border-pearl/[0.03] hover:bg-pearl/[0.02] transition-colors"
                  >
                    {/* Événement */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: `${TYPE_COLORS[e.type] ?? '#D4AF37'}15` }}>
                          {e.emoji}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-pearl font-inter">{e.titre}</p>
                          {e.plateforme && (
                            <p className="text-xs text-pearl/30 font-inter">{e.plateforme}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-4">
                      <span
                        className="text-[10px] font-poppins font-semibold px-2 py-1 rounded-full"
                        style={{
                          background: `${TYPE_COLORS[e.type] ?? '#D4AF37'}20`,
                          color: TYPE_COLORS[e.type] ?? '#D4AF37',
                        }}
                      >
                        {e.type}
                      </span>
                    </td>
                    {/* Date + heure */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-pearl/70 font-inter">{formatDate(e.date)}</p>
                      <p className="text-xs text-pearl/30 font-inter">{e.heure}{e.heure_fin ? ` – ${e.heure_fin}` : ''}</p>
                    </td>
                    {/* Lieu */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-pearl/50 font-inter">{e.lieu}</span>
                    </td>
                    {/* En ligne */}
                    <td className="px-4 py-4">
                      {e.en_ligne ? (
                        <span className="flex items-center gap-1 text-[10px] bg-violet-500/15 text-violet-300 px-2 py-1 rounded-full font-poppins">
                          <Wifi className="w-3 h-3" /> Live
                        </span>
                      ) : (
                        <span className="text-[10px] bg-pearl/5 text-pearl/30 px-2 py-1 rounded-full font-poppins">
                          Présentiel
                        </span>
                      )}
                    </td>
                    {/* Inscrits */}
                    <td className="px-4 py-4">
                      <div>
                        <span className="text-sm font-cinzel font-bold text-pearl">{e.nb_inscrits}</span>
                        {e.capacite && (
                          <span className="text-xs text-pearl/30 font-inter ml-1">/ {e.capacite}</span>
                        )}
                      </div>
                    </td>
                    {/* Statut */}
                    <td className="px-4 py-4">
                      {e.est_passe ? (
                        <span className="text-[10px] bg-pearl/5 text-pearl/30 px-2 py-1 rounded-full font-poppins">
                          Passé
                        </span>
                      ) : (
                        <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-1 rounded-full font-poppins">
                          À venir
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors text-pearl/30 hover:text-pearl" title="Éditer">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors text-pearl/30 hover:text-pearl" title="Voir">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors text-pearl/30 hover:text-pearl" title="Archiver">
                          <Archive className="w-3.5 h-3.5" />
                        </button>
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
