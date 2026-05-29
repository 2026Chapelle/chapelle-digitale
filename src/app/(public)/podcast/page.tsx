'use client'
import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Headphones, Search, Mic, ChevronRight, Clock, Users, Filter,
  Sparkles, Bookmark, Heart, Share2, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useAudioPlayer, type AudioTrack } from '@/components/providers/AudioPlayerProvider'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'

const SERIES = [
  { id: 'all', label: 'Tous', count: 48, color: '#D4AF37', emoji: '✦' },
  { id: 'fondements', label: 'Fondements Spirituels', count: 12, color: '#D4AF37', emoji: '🌱' },
  { id: 'leaders', label: 'École de Leaders', count: 8, color: '#8B5CF6', emoji: '👑' },
  { id: 'famille', label: 'Vie de Famille', count: 9, color: '#22C55E', emoji: '💚' },
  { id: 'identite', label: 'Qui Suis-Je ?', count: 7, color: '#EC4899', emoji: '✨' },
  { id: 'prophetic', label: 'Voix Prophétique', count: 6, color: '#0EA5E9', emoji: '🔥' },
  { id: 'finance', label: 'Prospérité du Royaume', count: 6, color: '#F59E0B', emoji: '💰' },
]

const HOSTS = [
  { name: 'Pasteur Élias Mbeki', role: 'Pasteur Principal', avatar: 'EM', color: '#D4AF37', episodes: 18 },
  { name: 'Prophète Samuel Diallo', role: 'Voix Prophétique', avatar: 'SD', color: '#0EA5E9', episodes: 14 },
  { name: 'Pasteure Ruth Nguema', role: 'Vie de Famille', avatar: 'RN', color: '#22C55E', episodes: 12 },
  { name: 'Évangéliste Grace Osei', role: 'Missions', avatar: 'GO', color: '#EC4899', episodes: 4 },
]

const ALL_EPISODES: (AudioTrack & { ecoutes: string; date: string; serie: string })[] = [
  { id: 'ep-1', titre: 'La Prière qui Change Tout', auteur: 'Pasteur Élias Mbeki', serie: 'Fondements Spirituels', duree: '48min', dureeSecondes: 2880, emoji: '🙏', couleur: '#D4AF37', ecoutes: '12.4K', date: '5 mai 2026' },
  { id: 'ep-2', titre: 'Leadership Serviteur', auteur: 'Pasteur Élias Mbeki', serie: 'École de Leaders', duree: '35min', dureeSecondes: 2100, emoji: '👑', couleur: '#8B5CF6', ecoutes: '8.7K', date: '28 avr. 2026' },
  { id: 'ep-3', titre: "L'Identité en Christ", auteur: 'Prophète Samuel Diallo', serie: 'Qui Suis-Je ?', duree: '42min', dureeSecondes: 2520, emoji: '✨', couleur: '#EC4899', ecoutes: '9.2K', date: '21 avr. 2026' },
  { id: 'ep-4', titre: 'La Famille au Cœur de Dieu', auteur: 'Pasteure Ruth Nguema', serie: 'Vie de Famille', duree: '52min', dureeSecondes: 3120, emoji: '💚', couleur: '#22C55E', ecoutes: '7.1K', date: '14 avr. 2026' },
  { id: 'ep-5', titre: 'La Puissance du Jeûne', auteur: 'Pasteur Élias Mbeki', serie: 'Fondements Spirituels', duree: '61min', dureeSecondes: 3660, emoji: '⚡', couleur: '#D4AF37', ecoutes: '11.3K', date: '7 avr. 2026' },
  { id: 'ep-6', titre: 'Entendre la Voix de Dieu', auteur: 'Prophète Samuel Diallo', serie: 'Voix Prophétique', duree: '39min', dureeSecondes: 2340, emoji: '👂', couleur: '#0EA5E9', ecoutes: '6.8K', date: '31 mars 2026' },
  { id: 'ep-7', titre: 'Les Fondements du Mariage', auteur: 'Pasteure Ruth Nguema', serie: 'Vie de Famille', duree: '57min', dureeSecondes: 3420, emoji: '💍', couleur: '#22C55E', ecoutes: '8.1K', date: '24 mars 2026' },
  { id: 'ep-8', titre: "L'Excellence au Travail", auteur: 'Pasteur Élias Mbeki', serie: 'Prospérité du Royaume', duree: '44min', dureeSecondes: 2640, emoji: '💼', couleur: '#F59E0B', ecoutes: '5.9K', date: '17 mars 2026' },
  { id: 'ep-9', titre: 'Vision et Destinée', auteur: 'Prophète Samuel Diallo', serie: 'École de Leaders', duree: '38min', dureeSecondes: 2280, emoji: '🎯', couleur: '#8B5CF6', ecoutes: '7.4K', date: '10 mars 2026' },
  { id: 'ep-10', titre: "L'Armure de Dieu", auteur: 'Pasteur Élias Mbeki', serie: 'Fondements Spirituels', duree: '53min', dureeSecondes: 3180, emoji: '🛡️', couleur: '#D4AF37', ecoutes: '9.6K', date: '3 mars 2026' },
  { id: 'ep-11', titre: 'Guérison et Restauration', auteur: 'Prophète Samuel Diallo', serie: 'Voix Prophétique', duree: '46min', dureeSecondes: 2760, emoji: '💊', couleur: '#0EA5E9', ecoutes: '10.2K', date: '24 fév. 2026' },
  { id: 'ep-12', titre: 'Élever des Enfants Selon Dieu', auteur: 'Pasteure Ruth Nguema', serie: 'Vie de Famille', duree: '49min', dureeSecondes: 2940, emoji: '👶', couleur: '#22C55E', ecoutes: '6.3K', date: '17 fév. 2026' },
]

const PLATFORMS = [
  { name: 'Spotify', emoji: '🟢', url: '#' },
  { name: 'Apple Podcasts', emoji: '🎵', url: '#' },
  { name: 'YouTube', emoji: '▶️', url: '#' },
  { name: 'Google', emoji: '🎙️', url: '#' },
  { name: 'Deezer', emoji: '🎧', url: '#' },
]

export default function PodcastPage() {
  const { toggle, isPlaying } = useAudioPlayer()
  const [selectedSerie, setSelectedSerie] = useState('all')
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const filtered = ALL_EPISODES.filter((ep) => {
    const matchesSerie = selectedSerie === 'all' || ep.serie.toLowerCase().includes(selectedSerie)
    const matchesQuery =
      !query ||
      ep.titre.toLowerCase().includes(query.toLowerCase()) ||
      ep.auteur?.toLowerCase().includes(query.toLowerCase())
    return matchesSerie && matchesQuery
  })

  const featured = ALL_EPISODES[0]
  const trending = [...ALL_EPISODES].sort((a, b) =>
    parseFloat(b.ecoutes) - parseFloat(a.ecoutes)
  ).slice(0, 6)

  return (
    <div className="min-h-screen pb-32">
      {/* HERO — cinematic */}
      <section className="relative overflow-hidden pt-32 pb-12 px-4">
        {/* Real podcast studio backdrop */}
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <PremiumImage
            image={HERO_IMAGES.podcast}
            fill
            priority
            overlay="heavy"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="halo-gold w-[1000px] h-[600px] -top-20 left-1/2 -translate-x-1/2" />
          <div className="halo-royal w-[800px] h-[500px] top-1/2 -right-40" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-inter text-xs font-bold tracking-[0.25em] uppercase mb-6 backdrop-blur-md"
              style={{
                background: 'rgba(212,175,55,0.10)',
                border: '1px solid rgba(212,175,55,0.3)',
                color: '#F5E6A7',
              }}>
              <Mic className="w-3.5 h-3.5" />
              Podcast CIER · {ALL_EPISODES.length}+ épisodes
            </div>
            <h1 className="heading-cinematic-xl mb-5">
              Des Enseignements qui
              <span className="block text-cinematic-gold">Transforment les Vies</span>
            </h1>
            <p className="font-inter text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'rgba(245,230,216,0.6)' }}>
              Accédez à des centaines d'heures d'enseignements bibliques profonds —
              disponibles sur toutes les plateformes, à toute heure.
            </p>

            <div className="flex items-center justify-center gap-6 flex-wrap mb-10">
              {[
                { icon: Headphones, label: '48+ épisodes', color: '#D4AF37' },
                { icon: Clock, label: '180h de contenu', color: '#8B5CF6' },
                { icon: Users, label: '127K écoutes/mois', color: '#22C55E' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-sm font-inter"
                  style={{ color: 'rgba(245,230,216,0.65)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${s.color}15`,
                      border: `1px solid ${s.color}30`,
                    }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <span className="font-semibold">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Platforms */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {PLATFORMS.map((p) => (
                <a key={p.name} href={p.url}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-inter font-medium transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(245,230,216,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                  <span>{p.emoji}</span>
                  {p.name}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURED HERO EPISODE */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="card-cinematic-gold relative overflow-hidden p-8 md:p-12"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(212,175,55,0.22) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold font-inter mb-5 tracking-widest uppercase"
                style={{
                  background: 'rgba(212,175,55,0.15)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: '#F5E6A7',
                }}>
                <Sparkles className="w-3 h-3" />
                Épisode à la une
              </div>
              <div className="text-6xl mb-4 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">{featured.emoji}</div>
              <div className="text-xs font-inter font-bold mb-1 tracking-widest uppercase"
                style={{ color: featured.couleur }}>{featured.serie}</div>
              <h2 className="font-cinzel text-2xl md:text-3xl font-black text-white mb-2">{featured.titre}</h2>
              <p className="text-sm font-inter mb-6" style={{ color: 'rgba(245,230,216,0.55)' }}>
                {featured.auteur} · {featured.duree}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => toggle(featured)}
                  className="btn-gold-cinematic"
                >
                  {isPlaying(featured.id)
                    ? <><Pause className="w-4 h-4" /> En cours…</>
                    : <><Play className="w-4 h-4" fill="#1A0F00" /> Écouter maintenant</>}
                </button>
                <button className="btn-glass-cinematic">
                  <Bookmark className="w-4 h-4" />
                  Sauvegarder
                </button>
              </div>
            </div>

            {/* Animated Waveform */}
            <div className="flex items-center gap-[3px] h-32">
              {[...Array(72)].map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${20 + Math.sin(i * 0.4) * 18 + Math.cos(i * 0.25) * 14}px`,
                    background: isPlaying(featured.id)
                      ? `rgba(212,175,55,${0.5 + Math.sin(i * 0.3) * 0.3})`
                      : 'rgba(245,230,167,0.18)',
                    minWidth: '2px',
                  }}
                  animate={isPlaying(featured.id) ? {
                    scaleY: [1, 0.3 + (i % 3) * 0.4, 1.3, 0.7, 1]
                  } : {}}
                  transition={{
                    duration: 0.8 + (i % 5) * 0.15,
                    repeat: Infinity,
                    delay: i * 0.02,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* HOSTS */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-16">
        <h3 className="font-cinzel text-lg font-bold text-white mb-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
            <Mic className="w-4 h-4" style={{ color: '#D4AF37' }} />
          </div>
          Vos prédicateurs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {HOSTS.map((host, i) => (
            <motion.div
              key={host.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card-cinematic p-5 text-center group cursor-pointer"
            >
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center font-cinzel font-bold text-lg text-white transition-transform group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${host.color}, ${host.color}AA)`,
                  boxShadow: `0 8px 24px ${host.color}40`,
                }}
              >
                {host.avatar}
              </div>
              <p className="font-inter text-sm font-bold text-white mb-0.5 truncate">{host.name}</p>
              <p className="font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
                {host.role}
              </p>
              <div className="mt-3 pt-3 inline-flex items-center gap-1 text-[10px] font-inter uppercase tracking-wider"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: host.color }}>
                {host.episodes} épisodes
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TRENDING ROW */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-16">
        <h3 className="font-cinzel text-lg font-bold text-white mb-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <TrendingUp className="w-4 h-4" style={{ color: '#EF4444' }} />
          </div>
          Tendances de la semaine
        </h3>
        <div className="row-scroller">
          {trending.map((ep) => (
            <div key={ep.id} className="flex-shrink-0 w-[260px]">
              <EpisodeCard ep={ep} toggle={toggle} isPlaying={isPlaying} />
            </div>
          ))}
        </div>
      </div>

      {/* FILTERS + LIST */}
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        {/* Search + filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'rgba(245,230,216,0.3)' }} />
            <input
              type="text"
              placeholder="Rechercher un épisode ou un prédicateur…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-cinematic pl-11"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-inter px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(245,230,216,0.5)',
            }}>
            <Filter className="w-3.5 h-3.5" />
            {filtered.length} épisode{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Series tabs */}
        <div className="flex gap-2 flex-wrap mb-10 sticky top-20 z-30 py-3 -mx-4 px-4 backdrop-blur-xl"
          style={{ background: 'linear-gradient(180deg, rgba(5,3,8,0.7) 0%, rgba(5,3,8,0.3) 100%)' }}>
          {SERIES.map((s) => {
            const active = selectedSerie === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSerie(s.id)}
                className="px-4 py-2 rounded-full text-xs font-inter font-semibold transition-all flex items-center gap-1.5"
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${s.color}, ${s.color}AA)`,
                        color: '#FFFFFF',
                        boxShadow: `0 4px 16px ${s.color}40`,
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(245,230,216,0.6)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }
                }
              >
                <span>{s.emoji}</span>
                {s.label}
                <span className="opacity-70">({s.count})</span>
              </button>
            )
          })}
        </div>

        {/* Episode grid */}
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((ep, i) => (
              <motion.div
                key={ep.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
              >
                <EpisodeCard ep={ep} toggle={toggle} isPlaying={isPlaying} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="card-cinematic text-center py-20">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="font-cinzel text-xl text-white mb-2">Aucun épisode trouvé</p>
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.45)' }}>
              {query ? `Pas de résultat pour "${query}"` : 'Essayez une autre série'}
            </p>
          </div>
        )}

        {/* Member CTA */}
        {filtered.length > 0 && (
          <div className="text-center mt-12">
            <Link href="/rejoindre" className="btn-gold-cinematic">
              Devenir membre pour accéder à l'intégralité
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function EpisodeCard({
  ep,
  toggle,
  isPlaying,
}: {
  ep: AudioTrack & { ecoutes: string; date: string; serie: string }
  toggle: (t: AudioTrack) => void
  isPlaying: (id: string) => boolean
}) {
  const playing = isPlaying(ep.id)
  return (
    <div
      className="group card-cinematic p-5 cursor-pointer relative"
      style={playing ? {
        borderColor: `${ep.couleur}50`,
        boxShadow: `0 0 24px ${ep.couleur}25, 0 16px 40px rgba(0,0,0,0.5)`,
      } : undefined}
      onClick={() => toggle(ep)}
    >
      {playing && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-end gap-[3px] h-4">
            {[0, 1, 2].map((b) => (
              <motion.div key={b} className="w-[3px] rounded-full"
                style={{ background: ep.couleur }}
                animate={{ height: ['6px', '14px', '8px', '12px', '6px'] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: b * 0.15, ease: 'easeInOut' }} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 relative"
          style={{
            background: `${ep.couleur}18`,
            border: `1px solid ${ep.couleur}30`,
          }}>
          {ep.emoji}
          <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: `${ep.couleur}45`, backdropFilter: 'blur(4px)' }}>
            {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" fill="white" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-inter font-bold mb-1 truncate tracking-widest uppercase"
            style={{ color: ep.couleur }}>{ep.serie}</div>
          <h3 className="font-inter text-sm font-bold text-white mb-1 leading-snug line-clamp-2">{ep.titre}</h3>
          <div className="text-[11px] font-inter truncate"
            style={{ color: 'rgba(245,230,216,0.5)' }}>
            {ep.auteur}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 text-[10px] font-inter"
          style={{ color: 'rgba(245,230,216,0.4)' }}>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ep.duree}</span>
          <span>·</span>
          <span>{ep.ecoutes}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation() }} className="opacity-50 hover:opacity-100 transition-opacity">
            <Heart className="w-3.5 h-3.5" style={{ color: 'rgba(245,230,216,0.5)' }} />
          </button>
          <button onClick={(e) => { e.stopPropagation() }} className="opacity-50 hover:opacity-100 transition-opacity">
            <Share2 className="w-3.5 h-3.5" style={{ color: 'rgba(245,230,216,0.5)' }} />
          </button>
          <span className="text-[10px] font-inter ml-1"
            style={{ color: 'rgba(245,230,216,0.3)' }}>{ep.date}</span>
        </div>
      </div>
    </div>
  )
}
