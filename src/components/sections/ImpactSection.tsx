'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Globe, Users, Heart, BookOpen, Tv, Star } from 'lucide-react'
import Link from 'next/link'

const STATS = [
  { value: 127000, suffix: '+', label: 'Membres actifs', icon: Users, color: '#D4AF37', format: 'k' },
  { value: 120, suffix: '+', label: 'Nations', icon: Globe, color: '#0EA5E9', format: 'n' },
  { value: 15000, suffix: '+', label: 'Étudiants formés', icon: BookOpen, color: '#8B5CF6', format: 'k' },
  { value: 500, suffix: '+', label: 'Cultes en direct', icon: Tv, color: '#22C55E', format: 'n' },
  { value: 89000, suffix: '', label: 'Vies touchées', icon: Heart, color: '#EC4899', format: 'k' },
  { value: 8, suffix: '', label: 'Plateformes actives', icon: Star, color: '#F97316', format: 'n' },
]

function useCounter(target: number, isInView: boolean, duration = 2200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!isInView) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isInView, target, duration])
  return count
}

function StatCard({ stat, delay }: { stat: typeof STATS[0]; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const count = useCounter(stat.value, isInView)

  const displayValue =
    stat.format === 'k' && count >= 1000
      ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`
      : count.toLocaleString('fr')

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative text-center group p-5 rounded-2xl card-cinematic"
    >
      <div className="relative inline-flex mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${stat.color}25, ${stat.color}08)`,
            border: `1px solid ${stat.color}30`,
            boxShadow: `0 0 24px ${stat.color}20`,
          }}
        >
          <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"
          style={{ background: stat.color }}
        />
      </div>

      <div
        className="font-cinzel font-black mb-1.5 text-white"
        style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1 }}
      >
        {displayValue}
        <span style={{ color: stat.color }}>{stat.suffix}</span>
      </div>

      <div className="font-inter text-xs uppercase tracking-wider"
        style={{ color: 'rgba(245,230,216,0.45)' }}>
        {stat.label}
      </div>
    </motion.div>
  )
}

const QUOTE = {
  text: '« Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit »',
  ref: '— Matthieu 28 : 19',
}

export function ImpactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="section-cinematic">
      {/* Halos */}
      <div className="halo-gold w-[1000px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="container-cinematic">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="section-label-dark justify-center">Notre Impact Mondial</div>
          <h2 className="heading-cinematic-lg mb-4">
            Des Chiffres
            <span className="block text-cinematic-gold">Qui Témoignent</span>
          </h2>
          <p className="font-inter text-base md:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: 'rgba(245,230,216,0.55)' }}>
            Chaque nombre représente une vie, une famille, une nation touchée par la grâce de Dieu à travers la CIER.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 mb-20">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} delay={i * 0.08} />
          ))}
        </div>

        {/* Scripture quote */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-center mb-16"
        >
          <div className="relative inline-block max-w-3xl mx-auto px-4">
            <div
              className="absolute -top-8 -left-2 font-cormorant text-9xl leading-none"
              style={{ color: '#D4AF37', opacity: 0.15 }}
            >
              "
            </div>
            <p className="font-cormorant italic text-xl md:text-3xl leading-relaxed relative z-10"
              style={{ color: 'rgba(245,230,216,0.85)' }}>
              {QUOTE.text}
            </p>
            <p className="font-inter text-xs mt-4 tracking-[0.3em] uppercase"
              style={{ color: '#D4AF37' }}>
              {QUOTE.ref}
            </p>
          </div>
        </motion.div>

        {/* Globe panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="card-cinematic-gold relative overflow-hidden p-8 md:p-12"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(212,175,55,0.18) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(236,232,222,0.10) 0%, transparent 70%)' }} />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            {/* Animated globe */}
            <div className="flex-shrink-0">
              <div className="relative w-48 h-48">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-dashed"
                  style={{ borderColor: 'rgba(212,175,55,0.3)' }}
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-5 rounded-full border border-dashed"
                  style={{ borderColor: 'rgba(245,230,167,0.3)' }}
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-10 rounded-full border border-dashed"
                  style={{ borderColor: 'rgba(212,175,55,0.2)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(244,241,233,0.18))',
                      boxShadow: '0 0 60px rgba(212,175,55,0.4)',
                    }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Globe className="w-12 h-12" style={{ color: '#F5E6A7' }} />
                  </motion.div>
                </div>
                {/* Orbiting flags */}
                {['🇫🇷', '🇨🇩', '🇨🇦', '🇬🇭'].map((flag, i) => (
                  <motion.div
                    key={flag}
                    className="absolute text-base"
                    style={{ top: '50%', left: '50%', transformOrigin: '0 0' }}
                    animate={{ rotate: [i * 90, i * 90 + 360] }}
                    transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <span style={{ display: 'block', transform: `translate(-50%, -50%) translateX(86px)` }}>
                      {flag}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-cinzel text-2xl md:text-4xl font-black text-white mb-3 leading-tight">
                Une Présence sur
                <span className="block text-cinematic-gold"> 5 Continents</span>
              </h3>
              <p className="font-inter text-sm md:text-base leading-relaxed mb-6 max-w-lg"
                style={{ color: 'rgba(245,230,216,0.55)' }}>
                De Kinshasa à Paris, de Montréal à Dubaï — la CIER est l'église de votre quartier,
                dans le monde entier. Rejoignez la plus grande communauté chrétienne francophone digitale.
              </p>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                {['🇨🇩', '🇫🇷', '🇧🇪', '🇨🇦', '🇨🇮', '🇨🇲', '🇬🇭', '🇸🇳', '🇨🇭', '🇬🇧', '🇺🇸', '🇩🇪'].map((flag) => (
                  <span key={flag} className="text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">{flag}</span>
                ))}
                <span className="text-xs font-inter self-center ml-2"
                  style={{ color: 'rgba(245,230,216,0.4)' }}>+108 nations</span>
              </div>

              <Link href="/rejoindre" className="btn-gold-cinematic group">
                Rejoindre le Mouvement
                <Globe className="w-4 h-4 transition-transform group-hover:rotate-12" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
