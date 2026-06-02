'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { Heart, Clock, Globe, ArrowRight, Send, Shield, Flame } from 'lucide-react'

export function PrayerSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="section-cinematic" ref={ref}>
      <div className="halo-gold w-[600px] h-[400px] -top-10 -left-40" />
      <div className="halo-light w-[500px] h-[400px] bottom-0 -right-32" />

      <div className="container-cinematic">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="section-label-dark">
              <Heart className="w-3 h-3" />
              Mur de Prière
            </div>
            <h2 className="heading-cinematic-lg mb-5">
              Priez avec
              <span className="block text-cinematic-gold">le Monde Entier</span>
            </h2>
            <p className="font-inter text-base md:text-lg leading-relaxed mb-8 max-w-md"
              style={{ color: 'rgba(245,230,216,0.55)' }}>
              Notre mur de prière mondial connecte les intercesseurs aux besoins.
              Priez, soyez prié, rejoignez la chaîne d'intercession 24/7.
            </p>

            {/* Valeurs — formulation qualitative */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { value: '24/7', label: 'Intercession', icon: Clock, color: '#D4AF37' },
                { value: 'Mondial', label: 'Mur de prière', icon: Globe, color: '#0EA5E9' },
                { value: 'Ensemble', label: 'En communion', icon: Heart, color: '#EC4899' },
              ].map((stat) => (
                <div key={stat.label} className="card-cinematic text-center p-4">
                  <div
                    className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center"
                    style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30` }}
                  >
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div className="font-cinzel font-black text-xl text-white mb-0.5">{stat.value}</div>
                  <div className="text-[10px] font-inter uppercase tracking-wider"
                    style={{ color: 'rgba(245,230,216,0.45)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Prayer form */}
            <div className="card-cinematic p-6">
              <h4 className="font-cinzel text-[11px] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2"
                style={{ color: '#D4AF37' }}>
                <Shield className="w-3.5 h-3.5" />
                Soumettre une demande de prière
              </h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Votre nom (ou rester anonyme)"
                  className="input-cinematic"
                />
                <textarea
                  placeholder="Décrivez votre demande de prière..."
                  rows={3}
                  className="input-cinematic resize-none"
                />
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm font-inter cursor-pointer select-none"
                    style={{ color: 'rgba(245,230,216,0.55)' }}>
                    <input type="checkbox" className="rounded w-4 h-4 accent-amber-500" />
                    <Flame className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
                    Demande urgente
                  </label>
                  <Link href="/priere" className="btn-gold-cinematic">
                    <Send className="w-3.5 h-3.5" />
                    Soumettre
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Mur de prière (état vide propre) */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2.5"
          >
            <div className="card-cinematic flex flex-col items-center text-center gap-4 p-10">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                <Heart className="w-6 h-6" style={{ color: '#D4AF37' }} />
              </div>
              <div>
                <p className="font-cinzel font-bold text-white text-base mb-1.5">
                  Aucune demande de prière pour le moment
                </p>
                <p className="font-inter text-sm leading-relaxed max-w-sm"
                  style={{ color: 'rgba(245,230,216,0.5)' }}>
                  Soyez le premier à partager un sujet de prière avec la communauté.
                  Chaque demande est portée par les intercesseurs.
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.85 }}
              className="text-center pt-3"
            >
              <Link href="/priere" className="btn-glass-cinematic group">
                Voir tout le Mur de Prière
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
