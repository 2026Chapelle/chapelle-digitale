'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, TrendingUp, UserCheck, Star, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { MEMBRES } from '@/lib/mock/membres'
import { PageHeader } from '@/components/ui/PageHeader'

const ROLE_COLORS: Record<string, string> = {
  visiteur: '#6B7280',
  membre: '#3B82F6',
  disciple: '#D4AF37',
  serviteur: '#F59E0B',
  leader: '#8B5CF6',
  pasteur: '#EC4899',
  admin: '#EF4444',
}

const STATUT_COLORS: Record<string, string> = {
  actif: '#22C55E',
  inactif: '#6B7280',
  suspendu: '#EF4444',
}

const STATS = [
  { label: 'Total membres', value: MEMBRES.length, icon: Users, color: '#D4AF37' },
  { label: 'Actifs', value: MEMBRES.filter((m) => m.statut === 'actif').length, icon: UserCheck, color: '#22C55E' },
  { label: 'Nouveaux ce mois', value: 3, icon: TrendingUp, color: '#0EA5E9' },
  { label: 'Score moyen', value: Math.round(MEMBRES.reduce((acc, m) => acc + m.score_engagement, 0) / MEMBRES.length), icon: Star, color: '#8B5CF6' },
]

export default function AdminMembresPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const filtered = MEMBRES.filter((m) => {
    const matchSearch = `${m.prenom} ${m.nom} ${m.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || m.role === roleFilter
    const matchStatut = !statutFilter || m.statut === statutFilter
    return matchSearch && matchRole && matchStatut
  })

  const initials = (prenom: string, nom: string) => `${prenom[0]}${nom[0]}`

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Gestion des <span className="text-cinematic-gold">Membres</span></>}
          description={`${MEMBRES.length.toLocaleString('fr')} membres dans la communauté CIER mondiale.`}
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

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-royal mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                className="input-royal w-full pl-11"
                placeholder="Rechercher un membre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-royal"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Tous les rôles</option>
              {['visiteur', 'membre', 'disciple', 'serviteur', 'leader', 'pasteur', 'admin'].map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <select
              className="input-royal"
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {['actif', 'inactif', 'suspendu'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
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
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Membre</th>
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Pays</th>
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Plateforme</th>
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Inscrit le</th>
                  <th className="text-left px-4 py-3 text-xs font-poppins font-semibold text-pearl/40 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.02 * i }}
                    className="border-b border-pearl/[0.03] hover:bg-pearl/[0.02] transition-colors"
                  >
                    {/* Membre */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: `${ROLE_COLORS[m.role]}20`, color: ROLE_COLORS[m.role] }}>
                          {initials(m.prenom, m.nom)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-pearl font-inter">{m.prenom} {m.nom}</p>
                          <p className="text-xs text-pearl/30 font-inter">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Pays */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-pearl/60 font-inter">{m.pays}</span>
                    </td>
                    {/* Plateforme */}
                    <td className="px-4 py-4">
                      <span className="text-xs text-pearl/50 font-inter">{m.plateforme}</span>
                    </td>
                    {/* Rôle */}
                    <td className="px-4 py-4">
                      <span
                        className="text-[10px] font-poppins font-semibold px-2 py-1 rounded-full"
                        style={{
                          background: `${ROLE_COLORS[m.role]}20`,
                          color: ROLE_COLORS[m.role],
                        }}
                      >
                        {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                      </span>
                    </td>
                    {/* Score */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-pearl/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${m.score_engagement}%`, background: '#D4AF37' }}
                          />
                        </div>
                        <span className="text-xs font-cinzel font-bold text-gold">{m.score_engagement}</span>
                      </div>
                    </td>
                    {/* Statut */}
                    <td className="px-4 py-4">
                      <span
                        className="text-[10px] font-poppins px-2 py-1 rounded-full"
                        style={{
                          background: `${STATUT_COLORS[m.statut]}15`,
                          color: STATUT_COLORS[m.statut],
                        }}
                      >
                        {m.statut.charAt(0).toUpperCase() + m.statut.slice(1)}
                      </span>
                    </td>
                    {/* Date */}
                    <td className="px-4 py-4">
                      <span className="text-xs text-pearl/40 font-inter">{m.date_inscription}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4 relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                        className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-pearl/40" />
                      </button>
                      {openMenu === m.id && (
                        <div className="absolute right-4 top-10 z-20 bg-[#120023] border border-pearl/10 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                          {['Voir le profil', 'Modifier le rôle', 'Suspendre'].map((action) => (
                            <button
                              key={action}
                              onClick={() => setOpenMenu(null)}
                              className="w-full text-left px-4 py-2.5 text-xs font-inter text-pearl/70 hover:bg-pearl/10 hover:text-pearl transition-colors"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-pearl/5">
            <span className="text-xs text-pearl/30 font-inter">{filtered.length} membres affichés</span>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors text-pearl/40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-pearl/50 font-inter">Page 1 sur 1</span>
              <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors text-pearl/40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
