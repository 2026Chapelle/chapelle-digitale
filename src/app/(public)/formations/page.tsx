'use client'
import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, Clock, Users, Award, ChevronRight, Search, Star, Zap,
  ArrowRight, Play, GraduationCap, Sparkles, Lock, TrendingUp,
} from 'lucide-react'
import { FORMATIONS } from '@/lib/mock/formations'

const CATEGORIES = ['Tout', 'Prière', 'Leadership', 'Doctrine', 'Famille', 'Finances', 'Missions', 'Intercession'] as const
type Categorie = typeof CATEGORIES[number]

const NIVEAU_COLORS: Record<string, string> = {
  'Débutant': '#22C55E',
  'Intermédiaire': '#F59E0B',
  'Avancé': '#EF4444',
}

const STATS = [
  { value: '7', label: 'Formations', icon: BookOpen, color: '#D4AF37' },
  { value: '12', label: 'Instructeurs', icon: Star, color: '#EC4899' },
  { value: '2 193', label: 'Membres formés', icon: Users, color: '#0EA5E9' },
  { value: '5', label: 'Certifications', icon: Award, color: '#22C55E' },
]

const FEATURED = FORMATIONS[2]

function StatCard({ value, label, icon: Icon, color }: { value: string; label: string; icon: React.ElementType; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="card-cinematic p-5 text-center"
    >
      <div
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="font-cinzel font-black text-2xl text-white">{value}</div>
      <div className="font-inter text-[11px] uppercase tracking-wider mt-0.5"
        style={{ color: 'rgba(245,230,216,0.45)' }}>{label}</div>
    </motion.div>
  )
}

export default function FormationsPublicPage() {
  const [activeCategorie, setActiveCategorie] = useState<Categorie>('Tout')
  const [search, setSearch] = useState('')

  const filtered = FORMATIONS.filter((f) => {
    const matchCat = activeCategorie === 'Tout' || f.categorie === activeCategorie
    const matchSearch =
      search === '' ||
      f.titre.toLowerCase().includes(search.toLowerCase()) ||
      f.instructeur.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Group by categorie for Netflix-style rows when "Tout" is active
  const showRows = activeCategorie === 'Tout' && search === ''
  const trending = [...FORMATIONS].sort((a, b) => b.nb_membres - a.nb_membres).slice(0, 5)
  const certifies = FORMATIONS.filter((f) => f.certifie)

  return (
    <div className="min-h-screen pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-16 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="halo-gold w-[1100px] h-[600px] -top-40 left-1/2 -translate-x-1/2" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="section-label-dark">
                <GraduationCap className="w-3 h-3" />
                Académie Spirituelle
              </div>
              <h1 className="heading-cinematic-xl mb-6">
                Grandissez dans
                <span className="block text-cinematic-gold">votre Foi</span>
              </h1>
              <p className="text-base md:text-lg font-inter leading-relaxed mb-8 max-w-lg"
                style={{ color: 'rgba(245,230,216,0.6)' }}>
                Des parcours structurés, des instructeurs consacrés, et une communauté qui marche
                ensemble vers la maturité spirituelle.
              </p>

              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'rgba(245,230,216,0.4)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une formation, un instructeur..."
                  className="input-cinematic pl-11"
                />
              </div>
            </motion.div>

            {/* Featured cinematic card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/formations/${FEATURED.slug}`}
                className="relative block rounded-3xl overflow-hidden group transition-all duration-500 hover:-translate-y-1"
                style={{
                  background: `
                    radial-gradient(circle at 30% 20%, ${FEATURED.couleur}45 0%, transparent 60%),
                    radial-gradient(circle at 70% 80%, ${FEATURED.couleur}25 0%, transparent 60%),
                    linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(75,0,130,0.10) 100%)
                  `,
                  border: `1px solid ${FEATURED.couleur}40`,
                  boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 60px ${FEATURED.couleur}15`,
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, ${FEATURED.couleur}, ${FEATURED.couleur}80)` }} />

                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="text-5xl w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${FEATURED.couleur}25`,
                        border: `1px solid ${FEATURED.couleur}50`,
                      }}>
                      {FEATURED.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <span className="chip-gold">
                          <Sparkles className="w-2.5 h-2.5" />
                          Vedette
                        </span>
                        <span className="text-[10px] font-inter font-bold tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: `${NIVEAU_COLORS[FEATURED.niveau]}25`,
                            color: NIVEAU_COLORS[FEATURED.niveau],
                            border: `1px solid ${NIVEAU_COLORS[FEATURED.niveau]}45`,
                          }}>
                          {FEATURED.niveau}
                        </span>
                      </div>
                      <h2 className="font-cinzel font-bold text-xl text-white leading-tight">{FEATURED.titre}</h2>
                      <p className="font-inter text-xs mt-1" style={{ color: 'rgba(245,230,216,0.5)' }}>
                        par {FEATURED.instructeur}
                      </p>
                    </div>
                  </div>

                  <p className="font-inter text-sm leading-relaxed mb-6"
                    style={{ color: 'rgba(245,230,216,0.65)' }}>
                    {FEATURED.description}
                  </p>

                  <div className="flex items-center gap-4 mb-6 text-xs font-inter"
                    style={{ color: 'rgba(245,230,216,0.45)' }}>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{FEATURED.duree}</span>
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{FEATURED.nb_modules} modules</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{FEATURED.nb_membres.toLocaleString('fr')} inscrits</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {['🇨🇩', '🇫🇷', '🇧🇯', '🇨🇲', '🇨🇮'].map((flag, i) => (
                        <div key={i}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderColor: '#0a0613',
                            zIndex: 5 - i,
                          }}>
                          {flag}
                        </div>
                      ))}
                    </div>
                    <span className="btn-gold-cinematic">
                      <Play className="w-3.5 h-3.5" fill="#1A0F00" />
                      Commencer
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {STATS.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </section>

      {/* Filter + grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        {/* Category pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2 flex-wrap mb-10 sticky top-20 z-30 py-3 -mx-4 px-4 backdrop-blur-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(5,3,8,0.7) 0%, rgba(5,3,8,0.3) 100%)',
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategorie === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategorie(cat)}
                className="px-4 py-2 rounded-full text-xs font-inter font-semibold transition-all duration-300"
                style={
                  active
                    ? {
                        background: 'linear-gradient(135deg, #F5E6A7, #D4AF37)',
                        color: '#1A0F00',
                        boxShadow: '0 4px 16px rgba(212,175,55,0.4)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(245,230,216,0.6)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }
                }
              >
                {cat}
              </button>
            )
          })}
        </motion.div>

        {search && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="font-inter text-sm mb-6"
            style={{ color: 'rgba(245,230,216,0.5)' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour &quot;{search}&quot;
          </motion.p>
        )}

        {/* Netflix-style rows when no filter */}
        {showRows && (
          <>
            <FormationRow title="Tendances" icon={TrendingUp} color="#EF4444" formations={trending} />
            <FormationRow title="Certifiantes" icon={Award} color="#D4AF37" formations={certifies} />
          </>
        )}

        {/* Main grid */}
        <h3 className="font-cinzel text-lg font-bold text-white mt-12 mb-6 flex items-center gap-3">
          <Sparkles className="w-4 h-4" style={{ color: '#D4AF37' }} />
          {showRows ? 'Toutes nos formations' : `Catégorie : ${activeCategorie}`}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + (i % 9) * 0.05 }}
            >
              <FormationCard f={f} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24 card-cinematic">
            <div className="text-5xl mb-4">📚</div>
            <p className="font-cinzel text-xl text-white mb-2">Aucune formation trouvée</p>
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.45)' }}>
              {search ? 'Essayez un autre terme de recherche' : 'Aucune formation dans cette catégorie'}
            </p>
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 card-cinematic-gold p-10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 60%)' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 backdrop-blur-md"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.35)' }}>
              <Star className="w-3.5 h-3.5" style={{ color: '#F5E6A7' }} fill="#F5E6A7" />
              <span className="font-inter text-xs font-bold tracking-widest uppercase" style={{ color: '#F5E6A7' }}>
                Accès Illimité
              </span>
            </div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-cinematic-gold mb-3 leading-tight">
              Accédez à toutes les formations
            </h2>
            <p className="font-inter text-base mb-8 max-w-md mx-auto"
              style={{ color: 'rgba(245,230,216,0.65)' }}>
              Rejoignez la CIER pour un accès illimité à l'ensemble du catalogue, les replays,
              et un parcours disciple personnalisé.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/rejoindre" className="btn-gold-cinematic">
                <Zap className="w-4 h-4" />
                Rejoindre la CIER
              </Link>
              <Link href="/login" className="btn-glass-cinematic">
                Déjà membre ? Se connecter
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

function FormationRow({
  title,
  icon: Icon,
  color,
  formations,
}: {
  title: string
  icon: React.ElementType
  color: string
  formations: typeof FORMATIONS
}) {
  return (
    <section className="mb-12">
      <h3 className="font-cinzel text-lg font-bold text-white mb-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {title}
      </h3>
      <div className="row-scroller">
        {formations.map((f) => (
          <div key={f.id} className="flex-shrink-0 w-[280px] sm:w-[320px]">
            <FormationCard f={f} />
          </div>
        ))}
      </div>
    </section>
  )
}

function FormationCard({ f }: { f: typeof FORMATIONS[0] }) {
  return (
    <Link
      href={`/formations/${f.slug}`}
      className="block h-full card-cinematic overflow-hidden group"
    >
      {/* Cover */}
      <div className="relative h-44 overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, ${f.couleur}55 0%, transparent 60%),
              radial-gradient(circle at 70% 70%, ${f.couleur}30 0%, transparent 60%),
              linear-gradient(135deg, ${f.couleur}25 0%, #050308 100%)
            `,
          }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(5,3,8,0.85) 100%)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]">{f.emoji}</span>
        </div>

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] font-inter font-bold tracking-widest uppercase px-2 py-0.5 rounded-full backdrop-blur-md"
              style={{
                background: `${NIVEAU_COLORS[f.niveau]}30`,
                color: '#FFFFFF',
                border: `1px solid ${NIVEAU_COLORS[f.niveau]}50`,
              }}>
              {f.niveau}
            </span>
            {f.certifie && (
              <span className="chip-gold backdrop-blur-md">
                <Award className="w-2.5 h-2.5" />
                Certifié
              </span>
            )}
          </div>
        </div>

        {/* Hover play */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(212,175,55,0.25)',
              border: '2px solid rgba(212,175,55,0.6)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 40px rgba(212,175,55,0.5)',
            }}>
            <Play className="w-5 h-5 ml-0.5" fill="#FFFFFF" color="#FFFFFF" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="text-[10px] font-inter font-bold tracking-widest uppercase block mb-1"
            style={{ color: f.couleur }}>{f.categorie}</span>
          <h3 className="font-cinzel font-bold text-base text-white leading-tight">{f.titre}</h3>
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-inter mb-1"
          style={{ color: 'rgba(245,230,216,0.45)' }}>
          par <span className="font-semibold" style={{ color: 'rgba(245,230,216,0.7)' }}>{f.instructeur}</span>
        </p>
        <p className="text-xs font-inter leading-relaxed line-clamp-2 mb-4"
          style={{ color: 'rgba(245,230,216,0.5)' }}>
          {f.description}
        </p>

        {f.progression !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5 font-inter">
              <span className="flex items-center gap-1" style={{ color: 'rgba(245,230,216,0.4)' }}>
                <Zap className="w-3 h-3" /> Progression
              </span>
              <span className="font-bold" style={{ color: f.couleur }}>{f.progression}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${f.progression}%` }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${f.couleur}, ${f.couleur}DD)` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 text-xs font-inter"
            style={{ color: 'rgba(245,230,216,0.4)' }}>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.duree}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{f.nb_membres}</span>
          </div>
          <span
            className="inline-flex items-center gap-1 text-xs font-inter font-bold transition-all group-hover:gap-2"
            style={{ color: f.couleur }}
          >
            {f.progression === 100 ? 'Revoir' : f.progression !== undefined ? 'Reprendre' : 'Commencer'}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
