'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Play, Pause, Headphones, ChevronRight, Mic } from 'lucide-react'
import Link from 'next/link'
import { useAudioPlayer, type AudioTrack } from '@/components/providers/AudioPlayerProvider'

const EPISODES: AudioTrack[] = [
  { id: 'ep-1', titre: 'La Prière qui Change Tout', auteur: 'Pasteur Élias Mbeki', serie: 'Fondements Spirituels', duree: '48min', dureeSecondes: 2880, emoji: '🙏', couleur: '#D4AF37' },
  { id: 'ep-2', titre: 'Leadership Serviteur', auteur: 'Pasteur Élias Mbeki', serie: 'École de Leaders', duree: '35min', dureeSecondes: 2100, emoji: '👑', couleur: '#8B5CF6' },
  { id: 'ep-3', titre: "L'Identité en Christ", auteur: 'Prophète Samuel Diallo', serie: 'Qui Suis-Je ?', duree: '42min', dureeSecondes: 2520, emoji: '✨', couleur: '#EC4899' },
  { id: 'ep-4', titre: 'La Famille au Cœur de Dieu', auteur: 'Pasteure Ruth Nguema', serie: 'Vie de Famille', duree: '52min', dureeSecondes: 3120, emoji: '💚', couleur: '#22C55E' },
]

const ECOUTES = ['12.4K', '8.7K', '9.2K', '7.1K']
const DATES = ['5 mai 2026', '28 avr. 2026', '21 avr. 2026', '14 avr. 2026']

const PLATFORMS = [
  { name: 'Spotify', emoji: '🟢', url: '#' },
  { name: 'Apple', emoji: '🎵', url: '#' },
  { name: 'YouTube', emoji: '▶️', url: '#' },
  { name: 'Google', emoji: '🎙️', url: '#' },
]

export function PodcastSection() {
  const { toggle, isPlaying } = useAudioPlayer()
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const featured = EPISODES[0]
  const others = EPISODES.slice(1)

  return (
    <section ref={ref} className="section-cinematic">
      <div className="halo-gold w-[600px] h-[400px] -top-20 right-0" />
      <div className="halo-light w-[500px] h-[400px] bottom-0 -left-32" />

      <div className="container-cinematic">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6"
        >
          <div>
            <div className="section-label-dark">
              <Mic className="w-3 h-3" />
              Podcast CIER
            </div>
            <h2 className="heading-cinematic-lg">
              Écoutez, Grandissez,
              <span className="block text-cinematic-gold">Soyez Transformés</span>
            </h2>
            <p className="font-inter text-sm md:text-base mt-3 max-w-md"
              style={{ color: 'rgba(245,230,216,0.55)' }}>
              Des enseignements puissants disponibles où que vous soyez —
              dans les transports, chez vous, en marchant.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-inter uppercase tracking-[0.25em] mb-1"
              style={{ color: 'rgba(245,230,216,0.4)' }}>
              Disponible sur
            </div>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((p) => (
                <a key={p.name} href={p.url}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-medium transition-all hover:-translate-y-0.5"
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
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Featured */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-3 card-cinematic-gold relative overflow-hidden p-8 md:p-10"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(212,175,55,0.25) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(236,232,222,0.10) 0%, transparent 70%)' }} />

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-inter mb-6 tracking-widest uppercase"
                style={{
                  background: 'rgba(212,175,55,0.15)',
                  border: '1px solid rgba(212,175,55,0.35)',
                  color: '#F5E6A7',
                }}>
                <Headphones className="w-3 h-3" />
                Épisode à la une
              </div>

              {/* Waveform */}
              <div className="flex items-center gap-[2px] h-12 mb-8">
                {[...Array(60)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${14 + Math.sin(i * 0.45 + 1) * 14 + Math.cos(i * 0.3) * 8}px`,
                      background: isPlaying(featured.id) ? '#D4AF37' : 'rgba(245,230,167,0.18)',
                      minWidth: '2px',
                    }}
                    animate={isPlaying(featured.id) ? {
                      scaleY: [1, 0.4 + Math.random() * 1.2, 0.7, 1.1, 1],
                    } : { scaleY: 1 }}
                    transition={isPlaying(featured.id) ? {
                      duration: 0.6 + (i % 5) * 0.12,
                      repeat: Infinity,
                      delay: i * 0.02,
                      ease: 'easeInOut',
                    } : {}}
                  />
                ))}
              </div>

              <div className="text-5xl mb-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">{featured.emoji}</div>
              <div className="text-xs font-inter font-bold mb-1 tracking-widest uppercase"
                style={{ color: featured.couleur }}>
                {featured.serie}
              </div>
              <h3 className="font-cinzel text-2xl md:text-3xl font-black text-white mb-1.5">{featured.titre}</h3>
              <div className="text-sm font-inter mb-6"
                style={{ color: 'rgba(245,230,216,0.5)' }}>
                {featured.auteur}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <button
                  onClick={() => toggle(featured)}
                  className="btn-gold-cinematic group"
                >
                  {isPlaying(featured.id)
                    ? <><Pause className="w-4 h-4" /> En cours…</>
                    : <><Play className="w-4 h-4" fill="#1A0F00" /> Écouter</>}
                </button>
                <div className="text-right">
                  <div className="text-sm font-inter font-bold text-white">{featured.duree}</div>
                  <div className="text-[10px] font-inter uppercase tracking-wider"
                    style={{ color: 'rgba(245,230,216,0.4)' }}>
                    {ECOUTES[0]} écoutes
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Episode list */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-2 space-y-3"
          >
            {others.map((ep, i) => (
              <motion.div
                key={ep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="card-cinematic flex items-center gap-4 p-4 cursor-pointer group"
                style={isPlaying(ep.id) ? {
                  borderColor: `${ep.couleur}50`,
                  boxShadow: `0 0 24px ${ep.couleur}25, 0 16px 40px rgba(0,0,0,0.5)`,
                } : undefined}
                onClick={() => toggle(ep)}
              >
                <div className="flex-shrink-0 relative">
                  <div className="w-13 h-13 w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{
                      background: `${ep.couleur}18`,
                      border: `1px solid ${ep.couleur}30`,
                    }}>
                    {ep.emoji}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `${ep.couleur}50`, backdropFilter: 'blur(4px)' }}>
                    {isPlaying(ep.id) ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" fill="white" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-inter font-bold mb-0.5 tracking-widest uppercase"
                    style={{ color: ep.couleur }}>
                    {ep.serie}
                  </div>
                  <h4 className="font-inter text-sm font-bold text-white truncate">{ep.titre}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-inter mt-0.5"
                    style={{ color: 'rgba(245,230,216,0.4)' }}>
                    <span>{ep.duree}</span>
                    <span>·</span>
                    <span>{ECOUTES[i + 1]}</span>
                    <span>·</span>
                    <span>{DATES[i + 1]}</span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 flex-shrink-0 transition-all group-hover:translate-x-0.5"
                  style={{ color: 'rgba(245,230,216,0.3)' }} />
              </motion.div>
            ))}

            <Link href="/podcast"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-inter text-sm font-medium transition-all group"
              style={{
                border: '1px dashed rgba(212,175,55,0.3)',
                color: 'rgba(245,230,167,0.6)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'
                e.currentTarget.style.color = '#F5E6A7'
                e.currentTarget.style.background = 'rgba(212,175,55,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'
                e.currentTarget.style.color = 'rgba(245,230,167,0.6)'
                e.currentTarget.style.background = 'transparent'
              }}>
              Voir tous les épisodes
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
