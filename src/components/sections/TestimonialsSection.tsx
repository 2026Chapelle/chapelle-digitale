'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Quote } from 'lucide-react'

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="section-cinematic" ref={ref}>
      <div className="halo-gold w-[1100px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="container-cinematic">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <div className="section-label-dark justify-center">Témoignages</div>
          <h2 className="heading-cinematic-lg mb-4">
            Des Vies
            <span className="block text-cinematic-gold">Transformées</span>
          </h2>
          <p className="font-inter text-base md:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: 'rgba(245,230,216,0.55)' }}>
            La Chapelle existe pour voir Dieu transformer des vies. Vos témoignages,
            à venir, raconteront cette histoire.
          </p>
        </motion.div>

        {/* État vide propre */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <div
            className="relative rounded-3xl p-10 md:p-14 overflow-hidden text-center"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 60%), linear-gradient(140deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
              border: '1px solid rgba(212,175,55,0.25)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
              style={{
                background: 'linear-gradient(135deg, #D4AF37, #92721A)',
                boxShadow: '0 8px 24px rgba(212,175,55,0.4)',
              }}
            >
              <Quote className="w-6 h-6 text-white" fill="white" />
            </div>
            <p className="font-cinzel font-bold text-white text-lg md:text-xl mb-3">
              Aucun témoignage disponible pour le moment
            </p>
            <p className="font-inter text-sm md:text-base leading-relaxed max-w-md mx-auto"
              style={{ color: 'rgba(245,230,216,0.55)' }}>
              Les témoignages de la communauté seront bientôt partagés ici.
              Vivez votre rencontre avec Dieu et soyez de ceux qui le raconteront.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
