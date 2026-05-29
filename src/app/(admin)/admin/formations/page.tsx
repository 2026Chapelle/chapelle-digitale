'use client'
import { motion } from 'framer-motion'
import { Plus, BookOpen, Users, Award, Edit, Eye, Archive } from 'lucide-react'
import { FORMATIONS } from '@/lib/mock/formations'
import { PageHeader } from '@/components/ui/PageHeader'

const STATS = [
  { label: 'Formations actives', value: FORMATIONS.filter((f) => f.statut !== undefined).length, icon: BookOpen, color: '#D4AF37' },
  { label: 'Membres inscrits', value: FORMATIONS.reduce((acc, f) => acc + f.nb_membres, 0), icon: Users, color: '#22C55E' },
  { label: 'Taux completion', value: '34%', icon: Award, color: '#8B5CF6' },
]

const NIVEAU_COLORS: Record<string, string> = {
  'Débutant': '#22C55E',
  'Intermédiaire': '#F59E0B',
  'Avancé': '#EF4444',
}

const STATUT_COLORS: Record<string, string> = {
  en_cours: '#D4AF37',
  terminé: '#22C55E',
  non_commencé: '#6B7280',
}

export default function AdminFormationsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Gestion des <span className="text-cinematic-gold">Formations</span></>}
          description="Modules de discipolat, écoles ministérielles, parcours certifiants."
          actions={
            <button className="btn-gold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Créer une formation
            </button>
          }
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
                  {['Formation', 'Instructeur', 'Catégorie', 'Niveau', 'Membres', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FORMATIONS.map((f, i) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 * i }}
                    className="border-b border-pearl/[0.03] hover:bg-pearl/[0.02] transition-colors"
                  >
                    {/* Formation */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: `${f.couleur}20` }}>
                          {f.emoji}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-pearl font-inter">{f.titre}</p>
                          <p className="text-xs text-pearl/30 font-inter">{f.nb_modules} modules · {f.duree}</p>
                        </div>
                      </div>
                    </td>
                    {/* Instructeur */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-pearl/60 font-inter">{f.instructeur}</span>
                    </td>
                    {/* Catégorie */}
                    <td className="px-4 py-4">
                      <span className="badge-royal">{f.categorie}</span>
                    </td>
                    {/* Niveau */}
                    <td className="px-4 py-4">
                      <span
                        className="text-[10px] font-poppins font-semibold px-2 py-1 rounded-full"
                        style={{
                          background: `${NIVEAU_COLORS[f.niveau]}15`,
                          color: NIVEAU_COLORS[f.niveau],
                        }}
                      >
                        {f.niveau}
                      </span>
                    </td>
                    {/* Membres */}
                    <td className="px-4 py-4">
                      <span className="text-sm font-cinzel font-bold text-pearl">{f.nb_membres}</span>
                    </td>
                    {/* Statut */}
                    <td className="px-4 py-4">
                      {f.statut ? (
                        <span
                          className="text-[10px] font-poppins px-2 py-1 rounded-full"
                          style={{
                            background: `${STATUT_COLORS[f.statut] ?? '#6B7280'}15`,
                            color: STATUT_COLORS[f.statut] ?? '#6B7280',
                          }}
                        >
                          {f.statut === 'en_cours' ? 'En cours'
                            : f.statut === 'terminé' ? 'Terminé'
                            : 'Non commencé'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-poppins px-2 py-1 rounded-full bg-pearl/5 text-pearl/30">
                          Disponible
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
