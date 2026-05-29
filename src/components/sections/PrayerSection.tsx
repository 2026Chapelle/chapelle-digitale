'use client'
import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { Heart, Clock, Globe, ArrowRight, Send, Shield, Flame } from 'lucide-react'

const PRAYER_REQUESTS = [
  { id: '1', nom: 'Sœur Aïda', ville: 'Dakar, Sénégal', sujet: 'Guérison et restauration', priants: 247, urgent: false, color: '#EC4899' },
  { id: '2', nom: 'Frère Patrick', ville: 'Paris, France', sujet: 'Emploi et provision divine', priants: 183, urgent: false, color: '#0EA5E9' },
  { id: '3', nom: 'Famille Mwamba', ville: 'Kinshasa, RDC', sujet: 'Réconciliation familiale', priants: 312, urgent: true, color: '#8B5CF6' },
  { id: '4', nom: 'Sœur Grace', ville: 'Londres, UK', sujet: 'Réussite scolaire et direction', priants: 156, urgent: false, color: '#22C55E' },
  { id: '5', nom: 'Frère Emmanuel', ville: 'Douala, Cameroun', sujet: 'Protection et direction divine', priants: 220, urgent: false, color: '#F97316' },
  { id: '6', nom: 'Anonyme', ville: 'Montréal, Canada', sujet: 'Délivrance et liberté totale', priants: 399, urgent: true, color: '#D4AF37' },
]

export function PrayerSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [prayedFor, setPrayedFor] = useState<Set<string>>(new Set())

  const handlePray = (id: string) =>
    setPrayedFor((prev) => new Set(Array.from(prev).concat(id)))

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

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { value: '24/7', label: 'Intercession', icon: Clock, color: '#D4AF37' },
                { value: '120+', label: 'Nations', icon: Globe, color: '#0EA5E9' },
                { value: '50K+', label: 'Prières', icon: Heart, color: '#EC4899' },
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

          {/* RIGHT — Prayer cards */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2.5"
          >
            {PRAYER_REQUESTS.map((req, i) => {
              const prayed = prayedFor.has(req.id)
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="card-cinematic flex items-center gap-4 p-4 group"
                  style={prayed ? {
                    borderColor: `${req.color}40`,
                    boxShadow: `0 0 24px ${req.color}25, 0 24px 60px rgba(0,0,0,0.5)`,
                  } : undefined}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-cinzel font-bold text-sm text-white"
                    style={{
                      background: `linear-gradient(135deg, ${req.color}, ${req.color}AA)`,
                      boxShadow: `0 4px 16px ${req.color}40`,
                    }}
                  >
                    {req.nom.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white font-inter truncate">{req.nom}</span>
                      {req.urgent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-inter flex-shrink-0"
                          style={{
                            background: 'rgba(239,68,68,0.18)',
                            color: '#FCA5A5',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}>
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-inter truncate" style={{ color: 'rgba(245,230,216,0.6)' }}>
                      {req.sujet}
                    </p>
                    <p className="text-[11px] font-inter" style={{ color: 'rgba(245,230,216,0.35)' }}>
                      {req.ville}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handlePray(req.id)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: prayed ? `${req.color}25` : 'rgba(255,255,255,0.05)',
                        color: prayed ? req.color : 'rgba(245,230,216,0.5)',
                        transform: prayed ? 'scale(1.1)' : 'scale(1)',
                        border: `1px solid ${prayed ? `${req.color}50` : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <Heart className="w-4 h-4" fill={prayed ? 'currentColor' : 'none'} />
                    </button>
                    <span className="text-[10px] font-inter tabular-nums"
                      style={{ color: prayed ? req.color : 'rgba(245,230,216,0.4)' }}>
                      {req.priants + (prayed ? 1 : 0)}
                    </span>
                  </div>
                </motion.div>
              )
            })}

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
