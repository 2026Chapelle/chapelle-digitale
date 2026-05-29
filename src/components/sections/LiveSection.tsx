'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  Play, Clock, Calendar, ArrowRight, Radio, Globe, Volume2,
  Church, BookOpen, Heart, GraduationCap, Wifi, MessageCircle, Film,
  type LucideIcon,
} from 'lucide-react'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'

type ScheduleItem = { jour: string; heure: string; type: string; icon: LucideIcon; color: string }
const SCHEDULE: ScheduleItem[] = [
  { jour: 'Dimanche', heure: '10h00', type: 'Culte Principal',    icon: Church,         color: '#D4AF37' },
  { jour: 'Mercredi', heure: '20h00', type: 'Étude Biblique',     icon: BookOpen,       color: '#0EA5E9' },
  { jour: 'Vendredi', heure: '22h00', type: 'Veillée de Prière',  icon: Heart,          color: '#8B5CF6' },
  { jour: 'Samedi',   heure: '10h00', type: 'Formation CFIC',     icon: GraduationCap,  color: '#22C55E' },
]

const UPCOMING = [
  { titre: 'Culte Principal — Dimanche', speaker: 'Pasteur Principal', date: 'Dimanche 10h00', type: 'Culte', color: '#D4AF37' },
  { titre: 'Étude Biblique — Mercredi', speaker: 'Berger Enseignant', date: 'Mercredi 20h00', type: 'Enseignement', color: '#0EA5E9' },
  { titre: 'Veillée de Prière — Vendredi', speaker: 'Ministère Mahanaïm', date: 'Vendredi 22h00', type: 'Prière', color: '#8B5CF6' },
]

export function LiveSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="section-cinematic" ref={ref}>
      {/* Halos */}
      <div className="halo-gold w-[700px] h-[400px] -top-20 -left-40" />
      <div className="halo-light w-[600px] h-[500px] bottom-0 -right-40" />

      <div className="container-cinematic">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="section-label-dark">
              <Radio className="w-3 h-3" />
              Live & Streaming
            </div>
            <h2 className="heading-cinematic-lg mb-6">
              L'Église
              <span className="block text-cinematic-gold">
                Ne S'arrête Jamais
              </span>
            </h2>
            <p className="font-inter text-base md:text-lg leading-relaxed mb-8 max-w-md"
              style={{ color: 'rgba(245,230,216,0.55)' }}>
              Rejoignez-nous en direct depuis n'importe où dans le monde. Cultes, enseignements, veillées —
              une expérience immersive 24/7 pour grandir partout, à chaque heure.
            </p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {([
                { icon: Wifi,           text: 'Streaming HD multi-plateformes',     color: '#0EA5E9' },
                { icon: MessageCircle,  text: 'Chat en direct + demandes de prière',color: '#22C55E' },
                { icon: Film,           text: 'Replay automatique disponible',      color: '#D4AF37' },
                { icon: Globe,          text: 'Accessible depuis 120+ pays',        color: '#8B5CF6' },
              ] as const).map((f) => (
                <div key={f.text} className="flex items-center gap-3 group">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}
                  >
                    <f.icon className="w-4 h-4" style={{ color: f.color }} />
                  </div>
                  <span className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.75)' }}>{f.text}</span>
                </div>
              ))}
            </div>

            {/* Schedule card */}
            <div className="card-cinematic p-5 md:p-6 mb-8">
              <h4 className="font-cinzel text-[11px] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2"
                style={{ color: '#D4AF37' }}>
                <Calendar className="w-3.5 h-3.5" />
                Programme hebdomadaire
              </h4>
              <div className="space-y-3">
                {SCHEDULE.map((item) => (
                  <div key={item.jour}
                    className="flex items-center justify-between py-1.5 border-b last:border-0"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${item.color}15`, border: `1px solid ${item.color}28` }}
                      >
                        <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      </div>
                      <div>
                        <span className="font-inter text-sm font-semibold text-white">{item.jour}</span>
                        <span className="font-inter text-xs ml-2" style={{ color: 'rgba(245,230,216,0.4)' }}>
                          {item.heure}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-bold font-inter px-2.5 py-1 rounded-full"
                      style={{ background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30` }}
                    >
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/live" className="btn-gold-cinematic">
                <Radio className="w-4 h-4" />
                Rejoindre le Direct
              </Link>
              <Link href="/live?tab=replays" className="btn-glass-cinematic">
                Voir les Replays
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Cinematic preview card */}
            <div className="relative rounded-3xl overflow-hidden mb-5 group cursor-pointer"
              style={{
                aspectRatio: '16/10',
                border: '1px solid rgba(212,175,55,0.2)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.08)',
              }}>
              {/* Real worship-crowd backdrop image */}
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                <PremiumImage
                  image={HERO_IMAGES.worship}
                  fill
                  overlay="cinematic"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>

              {/* Top live badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="chip-live">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
                  </span>
                  EN DIRECT
                </div>
                <div className="chip-gold">
                  <Volume2 className="w-2.5 h-2.5" />
                  HD
                </div>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-inter"
                style={{ color: 'rgba(245,230,216,0.7)' }}>
                <Globe className="w-3.5 h-3.5" />
                <span className="tabular-nums">2 847</span> en ligne
              </div>

              {/* Play */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer mb-4 transition-transform group-hover:scale-110"
                  style={{
                    background: 'rgba(212,175,55,0.18)',
                    border: '2px solid rgba(212,175,55,0.5)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 0 40px rgba(212,175,55,0.4)',
                  }}
                >
                  <Play className="w-7 h-7 ml-1" style={{ color: '#FFFFFF' }} fill="#FFFFFF" />
                </motion.div>
                <p className="font-cinzel text-sm tracking-wider uppercase font-semibold"
                  style={{ color: 'rgba(245,230,216,0.7)' }}>
                  Veillée Mahanaïm
                </p>
                <p className="font-inter text-xs mt-1"
                  style={{ color: 'rgba(245,230,216,0.4)' }}>
                  Prochain culte : Dimanche 10h00
                </p>
              </div>

              {/* Bottom info bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4"
                style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-cinzel text-sm font-bold text-white truncate">Veillée d'Intercession Mondiale</h3>
                    <p className="font-inter text-[11px] mt-0.5" style={{ color: 'rgba(245,230,216,0.55)' }}>
                      Ministère Mahanaïm · 120+ nations connectées
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="font-cinzel font-bold text-sm" style={{ color: '#D4AF37' }}>02:48:11</div>
                    <p className="font-inter text-[10px] uppercase tracking-wider"
                      style={{ color: 'rgba(245,230,216,0.4)' }}>en cours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming list */}
            <div className="space-y-2.5">
              {UPCOMING.map((live, i) => (
                <motion.div
                  key={live.titre}
                  initial={{ opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  whileHover={{ x: 4 }}
                  className="card-cinematic flex items-center gap-3 p-3.5 cursor-pointer group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: `${live.color}15`, border: `1px solid ${live.color}25` }}
                  >
                    <Play className="w-4 h-4" style={{ color: live.color }} fill={live.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter text-sm font-semibold text-white truncate">{live.titre}</p>
                    <p className="font-inter text-xs flex items-center gap-1 mt-0.5"
                      style={{ color: 'rgba(245,230,216,0.4)' }}>
                      <Clock className="w-3 h-3" />{live.date}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold font-inter px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: `${live.color}18`, color: live.color, border: `1px solid ${live.color}25` }}
                  >
                    {live.type}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
