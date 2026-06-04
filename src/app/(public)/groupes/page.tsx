'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, MapPin, Globe, Search, ArrowRight, Video, MessageCircle, Calendar, Lock, Unlock } from 'lucide-react'
import Link from 'next/link'

// Groupes & cellules réels — à publier depuis l'administration (aucune donnée fictive).
// Tant qu'aucun groupe n'est publié, la page affiche un état vide honnête et invite
// à créer ou rejoindre une cellule.
type Groupe = {
  id: string; nom: string; plateforme: string; emoji: string; couleur: string
  type: string; ville: string; membres: number; maxMembres: number; jour: string
  heure: string; berger: string; description: string; public: boolean; tags: string[]
}
const GROUPES: Groupe[] = []

const TYPE_FILTERS = ['Tous', 'Présentiel', 'En ligne', 'Hybride']

export default function GroupesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = GROUPES.filter(g =>
    (typeFilter === 'Tous' || g.type === typeFilter) &&
    (!searchQuery || `${g.nom} ${g.ville} ${g.plateforme} ${g.tags.join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedGroup = GROUPES.find(g => g.id === selectedId)

  return (
    <div className="min-h-screen bg-abyss">
      {/* Hero */}
      <div className="relative pt-32 pb-16 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />
        <div className="relative container-royal text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-label justify-center mb-4">Communauté</div>
            <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
              Groupes &
              <span className="text-gradient-gold block">Cellules</span>
            </h1>
            <p className="font-inter text-pearl/50 max-w-xl mx-auto mb-8">
              Rejoignez une cellule près de chez vous ou en ligne. La communauté chrétienne se vit aussi en petit groupe.
            </p>

            {/* Présentation (sans chiffres fictifs) */}
            <div className="flex items-center justify-center gap-6 text-xs text-pearl/40 flex-wrap">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold" /> En présentiel</span>
              <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5 text-gold" /> En ligne</span>
              <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-gold" /> Partout dans le monde</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-12">
        {/* Filters — affichés uniquement quand des groupes sont publiés */}
        {GROUPES.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par ville, plateforme, thème…"
              className="input-royal pl-11 w-full"
            />
          </div>
          <div className="flex gap-2">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className="px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all whitespace-nowrap"
                style={{
                  background: typeFilter === f ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                  color: typeFilter === f ? '#D4AF37' : 'rgba(255,255,255,0.45)',
                  border: `1px solid ${typeFilter === f ? 'rgba(212,175,55,0.3)' : 'transparent'}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </motion.div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {filtered.map((groupe, i) => {
            const pct = Math.round((groupe.membres / groupe.maxMembres) * 100)
            return (
              <motion.div
                key={groupe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedId(groupe.id === selectedId ? null : groupe.id)}
                className="card-royal cursor-pointer group hover:-translate-y-1 transition-all duration-300"
                style={{ borderColor: `${groupe.couleur}15` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: `${groupe.couleur}15` }}>
                      {groupe.emoji}
                    </div>
                    <div>
                      <div className="text-[10px] font-inter" style={{ color: groupe.couleur }}>{groupe.plateforme}</div>
                      <div className="font-cinzel text-xs font-bold text-pearl leading-tight">{groupe.nom}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-inter"
                    style={{ color: groupe.type === 'En ligne' ? '#0EA5E9' : groupe.type === 'Hybride' ? '#F59E0B' : '#22C55E' }}>
                    {groupe.type === 'En ligne' ? <Video className="w-3 h-3" /> : groupe.type === 'Hybride' ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {groupe.type}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-pearl/40 font-inter mb-3">
                  <MapPin className="w-3 h-3" />
                  {groupe.ville}
                </div>

                {/* Description */}
                <p className="font-inter text-xs text-pearl/45 leading-relaxed mb-4 line-clamp-2">
                  {groupe.description}
                </p>

                {/* Schedule */}
                <div className="flex items-center gap-1.5 text-[11px] text-pearl/35 font-inter mb-4">
                  <Calendar className="w-3 h-3" />
                  {groupe.jour} · {groupe.heure}
                </div>

                {/* Capacity */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] font-inter mb-1.5">
                    <span className="text-pearl/35 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {groupe.membres} membres
                    </span>
                    <span style={{ color: groupe.couleur }}>{pct}%</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: groupe.couleur }} />
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {groupe.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-inter px-2 py-0.5 rounded-full"
                      style={{ background: `${groupe.couleur}10`, color: groupe.couleur }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button className="w-full py-2 rounded-xl text-xs font-inter font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: `${groupe.couleur}12`,
                    color: groupe.couleur,
                    border: `1px solid ${groupe.couleur}25`,
                  }}>
                  {groupe.public ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {groupe.public ? 'Rejoindre ce groupe' : 'Groupe sur invitation'}
                </button>
              </motion.div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 card-royal mb-12">
            <div className="text-4xl mb-4">🏠</div>
            <p className="font-cinzel text-lg text-pearl/50">
              {GROUPES.length === 0 ? 'Les groupes seront bientôt publiés ici' : 'Aucun groupe trouvé'}
            </p>
            <p className="font-inter text-sm text-pearl/30 mt-2">
              {GROUPES.length === 0
                ? 'Nos cellules et groupes de croissance sont en cours de référencement. Vous pouvez déjà rejoindre la communauté ou initier un groupe.'
                : 'Essayez avec d\'autres critères ou créez votre propre groupe.'}
            </p>
          </div>
        )}

        {/* Create your group CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl p-8 md:p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(15,8,32,0.9) 0%, rgba(26,5,53,0.9) 100%)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <div className="text-4xl mb-5">🏠</div>
          <h2 className="font-cinzel text-2xl md:text-3xl font-black text-pearl mb-4">
            Pas encore de groupe <span className="text-gradient-gold">près de vous ?</span>
          </h2>
          <p className="font-inter text-pearl/50 mb-8 max-w-lg mx-auto">
            Vous pouvez devenir l'initiateur d'une cellule dans votre ville ou en ligne. Notre équipe vous accompagne dans la création et la gestion de votre groupe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="btn-gold px-8 py-3.5 text-sm">
              Créer un groupe
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/rejoindre" className="btn-ghost px-8 py-3.5 text-sm">
              Rejoindre la CIER
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
