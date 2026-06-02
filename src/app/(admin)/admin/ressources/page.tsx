'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Plus, Search, Edit, Trash2,
  Eye, Download, BookOpen, Video, Music,
  Lock, Unlock, Star, Upload, MoreVertical
} from 'lucide-react'
import type { RessourceMock } from '@/lib/mock/ressources'
import { PageHeader } from '@/components/ui/PageHeader'

// Aucune donnée fictive : la bibliothèque se remplira avec les ressources réelles (Supabase).
const RESSOURCES: RessourceMock[] = []

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'PDF': <FileText className="w-4 h-4" />,
  'Vidéo': <Video className="w-4 h-4" />,
  'Audio': <Music className="w-4 h-4" />,
  'Livre': <BookOpen className="w-4 h-4" />,
  'Podcast': <Music className="w-4 h-4" />,
  'Dévotionnel': <FileText className="w-4 h-4" />,
}

const TYPE_COLORS: Record<string, string> = {
  'PDF': '#EF4444',
  'Vidéo': '#8B5CF6',
  'Audio': '#0EA5E9',
  'Livre': '#22C55E',
  'Podcast': '#F59E0B',
  'Dévotionnel': '#EC4899',
}

const CATEGORIES_FILTER = ['Toutes', 'Prédication', 'Prière', 'Culte', 'Doctrine', 'Leadership', 'Formation', 'Famille', 'Dévotionnel']

const STATS = [
  { label: 'Total ressources', value: String(RESSOURCES.length), icon: FileText, color: '#D4AF37' },
  { label: 'Téléchargements', value: RESSOURCES.reduce((a, r) => a + r.nb_telechargements, 0).toLocaleString(), icon: Download, color: '#22C55E' },
  { label: 'Ressources premium', value: String(RESSOURCES.filter(r => r.is_premium).length), icon: Lock, color: '#8B5CF6' },
  { label: 'Vues estimées', value: (RESSOURCES.reduce((a, r) => a + r.nb_telechargements, 0) * 3).toLocaleString(), icon: Eye, color: '#0EA5E9' },
]

export default function AdminRessourcesPage() {
  const [search, setSearch] = useState('')
  const [categorie, setCategorie] = useState('Toutes')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const filtered = RESSOURCES.filter((r) => {
    const matchSearch = r.titre.toLowerCase().includes(search.toLowerCase())
    const matchCat = categorie === 'Toutes' || r.categorie === categorie
    const matchType = !typeFilter || r.type === typeFilter
    return matchSearch && matchCat && matchType
  })

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Bibliothèque <span className="text-cinematic-gold">Ressources</span></>}
          description="Gérer les ressources spirituelles, formations et publications."
          actions={
            <button
              onClick={() => setShowForm(true)}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter
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

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-royal mb-6 space-y-4"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                className="input-royal w-full pl-11"
                placeholder="Rechercher une ressource..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-royal"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Tous types</option>
              {Object.keys(TYPE_ICONS).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES_FILTER.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategorie(cat)}
                className="px-3.5 py-1.5 rounded-full text-xs font-inter font-medium transition-all duration-200"
                style={{
                  background: categorie === cat ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${categorie === cat ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: categorie === cat ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {filtered.length === 0 && (
          <div className="card-royal text-center py-16 mb-4">
            <FileText className="w-8 h-8 mx-auto mb-3 text-gold/40" />
            <p className="font-cinzel text-pearl/60">Aucune ressource disponible pour le moment</p>
            <p className="font-inter text-xs text-pearl/30 mt-1">Les ressources réelles apparaîtront ici.</p>
          </div>
        )}

        {/* Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((ressource, i) => {
            const typeColor = TYPE_COLORS[ressource.type] || '#6B7280'
            const typeIcon = TYPE_ICONS[ressource.type]
            return (
              <motion.div
                key={ressource.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i }}
                className="card-royal group relative flex flex-col"
              >
                {/* Type badge */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-inter"
                    style={{ background: `${typeColor}18`, color: typeColor }}
                  >
                    {typeIcon}
                    {ressource.type.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    {ressource.is_premium && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <Lock className="w-2.5 h-2.5" style={{ color: '#D4AF37' }} />
                        <span className="text-[9px] font-bold font-inter" style={{ color: '#D4AF37' }}>PREMIUM</span>
                      </div>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === ressource.id ? null : ressource.id)}
                        className="p-1 rounded-lg hover:bg-pearl/10 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-pearl/30" />
                      </button>
                      {openMenu === ressource.id && (
                        <div className="absolute right-0 top-7 z-20 bg-[#120023] border border-pearl/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                          {[
                            { icon: Eye, label: 'Voir' },
                            { icon: Edit, label: 'Modifier' },
                            { icon: ressource.is_premium ? Unlock : Lock, label: ressource.is_premium ? 'Rendre gratuit' : 'Mettre premium' },
                            { icon: Trash2, label: 'Supprimer' },
                          ].map((action) => (
                            <button
                              key={action.label}
                              onClick={() => setOpenMenu(null)}
                              className="w-full text-left px-4 py-2.5 text-xs font-inter text-pearl/70 hover:bg-pearl/10 hover:text-pearl transition-colors flex items-center gap-2"
                            >
                              <action.icon className="w-3 h-3" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thumbnail */}
                <div
                  className="w-full h-24 rounded-xl mb-4 flex items-center justify-center text-4xl"
                  style={{
                    background: `linear-gradient(135deg, ${typeColor}15, ${typeColor}05)`,
                    border: `1px solid ${typeColor}15`,
                  }}
                >
                  {ressource.emoji}
                </div>

                <h3 className="font-cinzel text-sm font-bold text-pearl mb-1 leading-tight">{ressource.titre}</h3>
                <p className="text-xs text-pearl/40 font-inter mb-4 line-clamp-2 flex-1">{ressource.description}</p>

                <div className="flex items-center justify-between text-[11px] text-pearl/30 font-inter">
                  <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {ressource.categorie}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {ressource.nb_telechargements.toLocaleString()}
                    </span>
                    {ressource.duree && <span className="flex items-center gap-1">{ressource.duree}</span>}
                    {ressource.nb_pages && <span className="flex items-center gap-1">{ressource.nb_pages}p.</span>}
                  </div>
                </div>
              </motion.div>
            )
          })}

          {/* Add card */}
          <motion.button
            onClick={() => setShowForm(true)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 * filtered.length }}
            className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-200 min-h-[200px]"
            style={{ border: '2px dashed rgba(212,175,55,0.15)', color: 'rgba(212,175,55,0.4)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212,175,55,0.35)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#D4AF37'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,175,55,0.04)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212,175,55,0.15)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(212,175,55,0.4)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <Upload className="w-8 h-8" />
            <span className="font-inter text-sm font-medium">Ajouter une ressource</span>
          </motion.button>
        </motion.div>

        {/* Upload Modal */}
        {showForm && (
          <div className="admin-modal-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-modal-box p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-cinzel text-lg font-bold text-pearl">Nouvelle Ressource</h2>
                <button onClick={() => setShowForm(false)} className="text-pearl/40 hover:text-pearl">✕</button>
              </div>
              <div className="space-y-4">
                <input className="input-royal w-full" placeholder="Titre de la ressource" />
                <textarea className="input-royal w-full h-24 resize-none" placeholder="Description..." />
                <div className="grid grid-cols-2 gap-3">
                  <select className="input-royal">
                    <option>Type</option>
                    {Object.keys(TYPE_ICONS).map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select className="input-royal">
                    <option>Catégorie</option>
                    {CATEGORIES_FILTER.slice(1).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div
                  className="h-32 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  style={{ border: '2px dashed rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.03)' }}
                >
                  <Upload className="w-6 h-6 text-gold/40" />
                  <span className="text-xs text-pearl/40 font-inter">Glisser un fichier ou cliquer</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="premium" className="w-4 h-4" />
                  <label htmlFor="premium" className="text-sm text-pearl/60 font-inter">Ressource Premium (membres payants uniquement)</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-3">Annuler</button>
                  <button onClick={() => setShowForm(false)} className="btn-gold flex-1 py-3">Publier</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
