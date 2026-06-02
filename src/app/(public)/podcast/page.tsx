'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Search, Mic, ChevronRight, Clock, Filter,
} from 'lucide-react'
import Link from 'next/link'
import { useAudioPlayer, type AudioTrack } from '@/components/providers/AudioPlayerProvider'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'

const SERIES = [
  { id: 'all', label: 'Tous', color: '#D4AF37', emoji: '✨' },
  { id: 'fondements', label: 'Fondements Spirituels', color: '#D4AF37', emoji: '🌱' },
  { id: 'leaders', label: 'École de Leaders', color: '#8B5CF6', emoji: '👑' },
  { id: 'famille', label: 'Vie de Famille', color: '#22C55E', emoji: '💚' },
  { id: 'identite', label: 'Qui Suis-Je ?', color: '#EC4899', emoji: '✨' },
  { id: 'prophetic', label: 'Voix Prophétique', color: '#0EA5E9', emoji: '🔥' },
  { id: 'finance', label: 'Prospérité du Royaume', color: '#F59E0B', emoji: '💰' },
]

type PodcastEpisode = AudioTrack & { ecoutes?: string; date?: string; serie: string }

// Liens plateformes RÉELS via l'env (aucun faux lien '#'). Masqués si non configurés.
const PLATFORMS = [
  { name: 'Spotify', emoji: '🟢', url: process.env.NEXT_PUBLIC_SPOTIFY_URL || '' },
  { name: 'Apple Podcasts', emoji: '🎵', url: process.env.NEXT_PUBLIC_APPLE_PODCAST_URL || '' },
  { name: 'YouTube', emoji: '▶️', url: process.env.NEXT_PUBLIC_YOUTUBE_URL || '' },
  { name: 'Deezer', emoji: '🎧', url: process.env.NEXT_PUBLIC_DEEZER_URL || '' },
].filter((p) => p.url)

export default function PodcastPage() {
  const { toggle, isPlaying } = useAudioPlayer()
  const [selectedSerie, setSelectedSerie] = useState('all')
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([])

  // Épisodes RÉELS publiés (cms_podcasts). Aucun mock.
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_podcasts')
          .select('id, title, description, audio_url, cover_url, duration, published_at')
          .eq('status', 'published').order('published_at', { ascending: false }).limit(100)
        if (!cancelled && data) setEpisodes(data.map((p: any) => ({
          id: p.id, titre: p.title || 'Épisode', auteur: '', serie: 'all',
          duree: p.duration || '', emoji: '🎙️', couleur: '#D4AF37',
          audioUrl: p.audio_url || undefined, date: (p.published_at || '').slice(0, 10),
        })))
      } catch { /* liste vide */ }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = episodes.filter((ep) => {
    const matchesSerie = selectedSerie === 'all' || ep.serie.toLowerCase().includes(selectedSerie)
    const matchesQuery =
      !query ||
      ep.titre.toLowerCase().includes(query.toLowerCase()) ||
      ep.auteur?.toLowerCase().includes(query.toLowerCase())
    return matchesSerie && matchesQuery
  })

  // Onglets de séries affichés uniquement si les épisodes réels portent plusieurs séries.
  const realSeries = Array.from(new Set(episodes.map((e) => e.serie).filter((s) => s && s !== 'all')))
  const showSeries = realSeries.length > 0

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
              Podcast CIER
            </div>
            <h1 className="heading-cinematic-xl mb-5">
              Des Enseignements qui
              <span className="block text-cinematic-gold">Transforment les Vies</span>
            </h1>
            <p className="font-inter text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'rgba(245,230,216,0.6)' }}>
              Des enseignements bibliques profonds —
              disponibles sur toutes les plateformes, à toute heure.
            </p>

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

      {/* FILTERS + LIST */}
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mt-8">
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

        {/* Series tabs — affichés seulement si des séries réelles existent */}
        {showSeries && (
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
              </button>
            )
          })}
        </div>
        )}

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
            <p className="font-cinzel text-xl text-white mb-2">
              {query ? 'Aucun épisode trouvé' : 'Aucun épisode disponible pour le moment'}
            </p>
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.45)' }}>
              {query ? `Pas de résultat pour "${query}"` : 'Les premiers épisodes du podcast arrivent bientôt.'}
            </p>
          </div>
        )}

        {/* Member CTA */}
        <div className="text-center mt-12">
          <Link href="/rejoindre" className="btn-gold-cinematic">
            Devenir membre pour accéder à l'intégralité
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function EpisodeCard({
  ep,
  toggle,
  isPlaying,
}: {
  ep: PodcastEpisode
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
        </div>
        {ep.date && (
          <span className="text-[10px] font-inter"
            style={{ color: 'rgba(245,230,216,0.3)' }}>{ep.date}</span>
        )}
      </div>
    </div>
  )
}
