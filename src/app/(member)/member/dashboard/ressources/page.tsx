'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Heart, Download, Star, Mic, Film, FileText, BookOpen, Headphones, BookMarked,
  Folder, BookOpenCheck, Library, ArrowDownUp, Crown, Sparkles, Clock,
  type LucideIcon,
} from 'lucide-react'
import { RESSOURCES, RessourceMock } from '@/lib/mock/ressources'
import { PageHeader } from '@/components/ui/PageHeader'

const TYPES = ['Tout', 'Audio', 'Vidéo', 'PDF', 'Livre', 'Podcast', 'Dévotionnel'] as const
type FilterType = typeof TYPES[number]

const SORTS = [
  { key: 'recent', label: 'Plus récent' },
  { key: 'popular', label: 'Populaires' },
  { key: 'az', label: 'A → Z' },
] as const
type SortKey = typeof SORTS[number]['key']

const TYPE_ICONS: Record<string, LucideIcon> = {
  Audio: Mic,
  'Vidéo': Film,
  PDF: FileText,
  Livre: BookOpen,
  Podcast: Headphones,
  'Dévotionnel': BookMarked,
}

const TYPE_COLORS: Record<string, string> = {
  Audio: '#0EA5E9',
  'Vidéo': '#D4AF37',
  PDF: '#22C55E',
  Livre: '#8B5CF6',
  Podcast: '#F59E0B',
  'Dévotionnel': '#EC4899',
}

export default function RessourcesPage() {
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<FilterType>('Tout')
  const [sort, setSort] = useState<SortKey>('recent')
  const [premiumOnly, setPremiumOnly] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(RESSOURCES.filter((r) => r.is_favori).map((r) => r.id)),
  )

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    const out = RESSOURCES.filter((r) => {
      const matchType = activeType === 'Tout' || r.type === activeType
      const matchSearch =
        r.titre.toLowerCase().includes(search.toLowerCase()) ||
        r.auteur.toLowerCase().includes(search.toLowerCase()) ||
        r.categorie.toLowerCase().includes(search.toLowerCase())
      const matchPremium = !premiumOnly || r.is_premium
      return matchType && matchSearch && matchPremium
    })

    if (sort === 'recent') {
      out.sort((a, b) => new Date(b.date_ajout).getTime() - new Date(a.date_ajout).getTime())
    } else if (sort === 'popular') {
      out.sort((a, b) => b.nb_telechargements - a.nb_telechargements)
    } else if (sort === 'az') {
      out.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'))
    }
    return out
  }, [search, activeType, sort, premiumOnly])

  const favResources = filtered.filter((r) => favorites.has(r.id))
  const otherResources = filtered.filter((r) => !favorites.has(r.id))

  // Stats
  const totalRes = RESSOURCES.length
  const totalDownloads = RESSOURCES.reduce((s, r) => s + r.nb_telechargements, 0)
  const totalPremium = RESSOURCES.filter((r) => r.is_premium).length
  const totalFav = favorites.size

  // Featured: most downloaded non-premium
  const featured = useMemo(
    () =>
      [...RESSOURCES]
        .filter((r) => !r.is_premium)
        .sort((a, b) => b.nb_telechargements - a.nb_telechargements)[0],
    [],
  )

  const ResourceCard = ({ r, i }: { r: RessourceMock; i: number }) => {
    const color = TYPE_COLORS[r.type] ?? r.couleur
    const Icon = TYPE_ICONS[r.type] ?? Folder
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 + i * 0.04 }}
        className="card-royal hover:border-gold/20 transition-all group flex flex-col relative overflow-hidden"
      >
        {r.is_premium && (
          <div
            className="absolute -top-px right-3 px-2 py-0.5 rounded-b-md inline-flex items-center gap-1 text-[9px] font-inter font-semibold uppercase tracking-wider"
            style={{ background: 'linear-gradient(180deg, #D4AF37, #92721A)', color: '#0B0717' }}
          >
            <Crown className="w-2.5 h-2.5" /> Premium
          </div>
        )}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}35` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <button
            onClick={() => toggleFav(r.id)}
            className="p-2 rounded-xl hover:bg-pearl/10 transition-colors"
            aria-label="Favori"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                favorites.has(r.id) ? 'fill-red-500 text-red-500' : 'text-pearl/30'
              }`}
            />
          </button>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span
              className="text-[10px] font-inter font-medium px-2 py-0.5 rounded-full"
              style={{ background: `${color}20`, color }}
            >
              {r.type}
            </span>
            <span className="text-[10px] text-pearl/40 border border-pearl/10 rounded-full px-2 py-0.5 font-inter">
              {r.categorie}
            </span>
          </div>
          <h3 className="font-cinzel font-bold text-pearl text-sm mb-1 group-hover:text-gold transition-colors leading-tight line-clamp-2">
            {r.titre}
          </h3>
          <p className="text-xs text-pearl/40 font-inter mb-2">par {r.auteur}</p>
          <p className="text-xs text-pearl/35 font-inter leading-relaxed line-clamp-2">{r.description}</p>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-pearl/5">
          <div className="flex items-center gap-3 text-[10px] text-pearl/40 font-inter">
            {r.duree && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {r.duree}
              </span>
            )}
            {r.nb_pages && <span>{r.nb_pages} pages</span>}
            <span className="inline-flex items-center gap-1">
              <Download className="w-3 h-3" /> {r.nb_telechargements.toLocaleString('fr-FR')}
            </span>
          </div>
          <button className="btn-royal text-xs px-3 py-1.5 flex items-center gap-1">
            <Download className="w-3 h-3" />
            Accéder
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Espace Membre"
          title={<>Ma <span className="text-cinematic-gold">Bibliothèque</span></>}
          description="Tous vos contenus spirituels — audio, vidéo, livres, dévotionnels."
        />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8"
        >
          {[
            { icon: Library, label: 'Ressources', value: totalRes, color: '#D4AF37' },
            { icon: Download, label: 'Téléchargements', value: totalDownloads.toLocaleString('fr-FR'), color: '#0EA5E9' },
            { icon: Crown, label: 'Premium', value: totalPremium, color: '#8B5CF6' },
            { icon: Heart, label: 'Mes favoris', value: totalFav, color: '#EC4899' },
          ].map((s) => (
            <div key={s.label} className="card-royal py-4 md:py-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
                >
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <div className="font-cinzel text-lg md:text-xl font-bold text-pearl leading-none truncate">
                    {s.value}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-pearl/40 font-inter mt-1 truncate">
                    {s.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Featured */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-royal mb-8 relative overflow-hidden"
            style={{
              background: `linear-gradient(120deg, ${TYPE_COLORS[featured.type]}10 0%, rgba(15,8,32,0.6) 60%)`,
              borderColor: `${TYPE_COLORS[featured.type]}30`,
            }}
          >
            <div
              className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-25"
              style={{ background: TYPE_COLORS[featured.type] }}
            />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 self-start md:self-auto"
                style={{
                  background: `${TYPE_COLORS[featured.type]}20`,
                  border: `1px solid ${TYPE_COLORS[featured.type]}40`,
                }}
              >
                {(() => {
                  const Icon = TYPE_ICONS[featured.type] ?? Folder
                  return <Icon className="w-7 h-7" style={{ color: TYPE_COLORS[featured.type] }} />
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold font-inter font-semibold">
                    <Sparkles className="w-3 h-3" /> À la une
                  </span>
                  <span
                    className="text-[10px] font-inter font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${TYPE_COLORS[featured.type]}25`, color: TYPE_COLORS[featured.type] }}
                  >
                    {featured.type}
                  </span>
                  <span className="text-[10px] text-pearl/40 font-inter">{featured.categorie}</span>
                </div>
                <h2 className="font-cinzel text-lg md:text-2xl font-bold text-pearl mb-1.5 leading-tight">
                  {featured.titre}
                </h2>
                <p className="text-sm text-pearl/55 font-inter leading-relaxed mb-3 line-clamp-2">
                  {featured.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-pearl/45 font-inter">
                  <span>par {featured.auteur}</span>
                  {featured.duree && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {featured.duree}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {featured.nb_telechargements.toLocaleString('fr-FR')} téléchargements
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Accéder
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search + sort */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col lg:flex-row gap-3 mb-5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
            <input
              className="input-royal w-full pl-11"
              placeholder="Rechercher une ressource, un auteur, une catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-pearl/5 border border-pearl/10">
              <ArrowDownUp className="w-3.5 h-3.5 text-pearl/40 ml-2" />
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-inter font-medium transition-all whitespace-nowrap ${
                    sort === s.key ? 'bg-gold text-black' : 'text-pearl/50 hover:text-pearl'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPremiumOnly((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-medium transition-all border ${
                premiumOnly
                  ? 'bg-gold/15 border-gold/40 text-gold'
                  : 'bg-pearl/5 border-pearl/10 text-pearl/50 hover:text-pearl'
              }`}
            >
              <Crown className="w-3.5 h-3.5" /> Premium
            </button>
          </div>
        </motion.div>

        {/* Type filter pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 flex-wrap mb-8"
        >
          {TYPES.map((t) => {
            const Icon = t !== 'Tout' ? TYPE_ICONS[t] : null
            const isActive = activeType === t
            const color = t !== 'Tout' ? TYPE_COLORS[t] : '#D4AF37'
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-inter font-medium transition-all border ${
                  isActive
                    ? 'text-black border-transparent'
                    : 'bg-pearl/5 text-pearl/55 border-pearl/10 hover:bg-pearl/10 hover:text-pearl/80'
                }`}
                style={isActive ? { background: color } : undefined}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {t}
              </button>
            )
          })}
        </motion.div>

        {/* Favorites */}
        {favResources.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gold" />
                <h2 className="font-cinzel text-base font-bold text-pearl">Mes Favoris</h2>
              </div>
              <span className="text-xs text-pearl/40 font-inter">{favResources.length}</span>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
              {favResources.map((r, i) => (
                <ResourceCard key={r.id} r={r} i={i} />
              ))}
            </div>
            {otherResources.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cinzel text-base font-bold text-pearl">Toutes les ressources</h2>
                <span className="text-xs text-pearl/40 font-inter">{otherResources.length}</span>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(favResources.length > 0 ? otherResources : filtered).map((r, i) => (
            <ResourceCard key={r.id} r={r} i={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 card-royal">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <BookOpenCheck className="w-7 h-7 text-gold" />
            </div>
            <p className="font-cinzel text-lg text-pearl/60">Aucune ressource trouvée</p>
            <p className="font-inter text-sm text-pearl/30 mt-1">
              Essayez d&apos;élargir vos critères de recherche.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
