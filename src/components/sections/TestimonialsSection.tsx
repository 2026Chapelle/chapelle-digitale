'use client'
import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Quote, Star, ChevronLeft, ChevronRight, Globe } from 'lucide-react'

const TESTIMONIALS = [
  {
    id: 1, nom: 'Marie-Claire K.', ville: 'Paris, France', emoji: '🇫🇷',
    message: "La CIER a complètement transformé ma vie spirituelle. Je pensais ne jamais trouver une église aussi profonde en ligne. Les formations, le live du dimanche, la communauté… c'est une vraie famille. Dieu a tout prévu !",
    formation: 'Parcours Disciple', note: 5, avatar: 'MC', couleur: '#EC4899',
  },
  {
    id: 2, nom: 'David M.', ville: 'Kinshasa, RDC', emoji: '🇨🇩',
    message: "Depuis que j'ai rejoint la Chapelle, ma vie de prière a explosé. Le ministère Mahanaïm m'a appris à vraiment intercéder. Je suis devenu leader de cellule en 8 mois. La plateforme est incroyable pour se former.",
    formation: 'Formation Intercession', note: 5, avatar: 'DM', couleur: '#0EA5E9',
  },
  {
    id: 3, nom: 'Esther L.', ville: "Abidjan, Côte d'Ivoire", emoji: '🇨🇮',
    message: "Le ministère Femmes d'Exceptions m'a révélé mon identité. Je ne savais pas que je valais autant aux yeux de Dieu. Aujourd'hui je forme d'autres femmes. La CIER n'est pas un site, c'est une école de vie.",
    formation: "Femmes d'Exceptions", note: 5, avatar: 'EL', couleur: '#EC4899',
  },
  {
    id: 4, nom: 'Samuel B.', ville: 'Montréal, Canada', emoji: '🇨🇦',
    message: "Le CFIC m'a donné une formation théologique solide que je n'aurais jamais pu avoir autrement. J'avais quitté l'église depuis 3 ans. La CIER m'a ramené à Dieu de façon concrète et puissante.",
    formation: 'CFIC — Théologie', note: 5, avatar: 'SB', couleur: '#8B5CF6',
  },
  {
    id: 5, nom: 'Nadège T.', ville: 'Bruxelles, Belgique', emoji: '🇧🇪',
    message: "En tant que mère de famille et femme active, la CIER s'adapte à mon rythme. Je peux suivre les enseignements quand je veux, prier avec la communauté, et mes enfants ont leurs propres espaces. Merci Pasteur !",
    formation: 'Chapelle Familiale', note: 5, avatar: 'NT', couleur: '#F97316',
  },
  {
    id: 6, nom: 'Jonathan A.', ville: 'Lagos, Nigeria', emoji: '🇳🇬',
    message: "I joined the CIER French community and even as an English speaker, the content is so rich. The live streams, the prayer wall, the formations — this is not a website. This is a real digital church. God is here.",
    formation: 'CIER International', note: 5, avatar: 'JA', couleur: '#22C55E',
  },
]

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [activeIndex, setActiveIndex] = useState(0)

  const prev = () => setActiveIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setActiveIndex((i) => (i + 1) % TESTIMONIALS.length)

  const current = TESTIMONIALS[activeIndex]

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
            Des milliers de croyants à travers le monde témoignent de la puissance de Dieu à travers la Chapelle.
          </p>

          <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full backdrop-blur-md"
            style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <Globe className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
            <span className="font-inter text-xs font-semibold" style={{ color: '#F5E6A7' }}>
              120+ nations représentées
            </span>
          </div>
        </motion.div>

        {/* Featured testimonial */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl mx-auto mb-10"
        >
          <div
            className="relative rounded-3xl p-8 md:p-12 overflow-hidden"
            style={{
              background: `
                radial-gradient(circle at 20% 0%, ${current.couleur}18 0%, transparent 60%),
                linear-gradient(140deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)
              `,
              border: `1px solid ${current.couleur}35`,
              boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 40px ${current.couleur}15`,
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              className="absolute -top-5 left-8 w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${current.couleur}, ${current.couleur}AA)`,
                boxShadow: `0 8px 24px ${current.couleur}50`,
              }}
            >
              <Quote className="w-5 h-5 text-white" fill="white" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex gap-1 mb-6 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4" style={{ color: '#F59E0B' }} fill="#F59E0B" />
                  ))}
                </div>

                <p
                  className="font-cormorant italic leading-relaxed mb-8"
                  style={{ fontSize: 'clamp(1.15rem, 2vw, 1.5rem)', color: 'rgba(245,230,216,0.85)', lineHeight: 1.7 }}
                >
                  « {current.message} »
                </p>

                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-cinzel font-bold text-base text-white flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${current.couleur}, ${current.couleur}AA)`,
                      boxShadow: `0 8px 24px ${current.couleur}40`,
                    }}
                  >
                    {current.avatar}
                  </div>
                  <div>
                    <p className="font-cinzel font-bold text-white text-sm mb-0.5">
                      {current.nom} <span>{current.emoji}</span>
                    </p>
                    <p className="text-xs font-inter mb-1.5" style={{ color: 'rgba(245,230,216,0.45)' }}>
                      {current.ville}
                    </p>
                    <span
                      className="inline-block text-[11px] font-semibold font-inter px-2.5 py-0.5 rounded-full"
                      style={{ background: `${current.couleur}20`, color: current.couleur, border: `1px solid ${current.couleur}40` }}
                    >
                      {current.formation}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 px-1">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(245,230,216,0.5)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,55,0.15)'
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'
                e.currentTarget.style.color = '#F5E6A7'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = 'rgba(245,230,216,0.5)'
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className="rounded-full transition-all duration-400"
                  style={{
                    width: i === activeIndex ? '28px' : '8px',
                    height: '8px',
                    background: i === activeIndex
                      ? 'linear-gradient(90deg, #D4AF37, #F5E6A7)'
                      : 'rgba(255,255,255,0.15)',
                    boxShadow: i === activeIndex ? '0 0 12px rgba(212,175,55,0.5)' : 'none',
                  }}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(245,230,216,0.5)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,55,0.15)'
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'
                e.currentTarget.style.color = '#F5E6A7'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = 'rgba(245,230,216,0.5)'
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Mini grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 + i * 0.07 }}
              onClick={() => setActiveIndex(i)}
              className="card-cinematic p-3 text-left transition-all duration-300"
              style={i === activeIndex ? {
                borderColor: `${t.couleur}50`,
                background: `linear-gradient(140deg, ${t.couleur}10 0%, rgba(255,255,255,0.02) 100%)`,
                boxShadow: `0 0 24px ${t.couleur}25, 0 16px 40px rgba(0,0,0,0.5)`,
              } : undefined}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.couleur}, ${t.couleur}AA)` }}
                >
                  {t.avatar}
                </div>
                <span className="text-xs font-inter font-medium truncate"
                  style={{ color: 'rgba(245,230,216,0.85)' }}>
                  {t.nom.split(' ')[0]} {t.emoji}
                </span>
              </div>
              <p className="text-[11px] font-inter leading-relaxed line-clamp-2"
                style={{ color: 'rgba(245,230,216,0.45)' }}>
                {t.message.substring(0, 65)}…
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}
