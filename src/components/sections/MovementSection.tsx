'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Users, Globe } from 'lucide-react'
import { PLATEFORMES } from '@/lib/constants'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { getPlatformImage } from '@/lib/images'
import { events } from '@/lib/analytics'

/* ============================================================
   BLOC 4 — NOTRE MOUVEMENT (fusion Vision + Plateformes)
   Vision mondiale + écriture compacte, puis la famille de ministères.
   Une seule rangée de nations. Aucun globe gadget.
   ============================================================ */

const PLATFORM_LIST = Object.values(PLATEFORMES)
const NATIONS = ['🇨🇩', '🇫🇷', '🇧🇪', '🇨🇦', '🇨🇮', '🇨🇲', '🇬🇭', '🇸🇳', '🇨🇭', '🇬🇧', '🇺🇸', '🇩🇪']

export function MovementSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-cinematic">
      <div className="halo-gold w-[900px] h-[520px] -top-10 left-1/2 -translate-x-1/2" />
      <div className="halo-light w-[600px] h-[400px] bottom-0 -right-40" />

      <div className="container-cinematic">
        {/* Vision + écriture */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <div className="section-label-dark justify-center">
            <Globe className="w-3 h-3" />
            Nos Ministères
          </div>
          <h2 className="heading-cinematic-lg mb-5">
            8 Plateformes,
            <span className="block text-cinematic-gold">Une Seule Vision</span>
          </h2>
          <p className="font-cormorant italic text-xl md:text-2xl leading-relaxed mb-3"
            style={{ color: 'rgba(245,230,216,0.82)' }}>
            « Allez, faites de toutes les nations des disciples. »
          </p>
          <p className="font-inter text-xs tracking-[0.3em] uppercase mb-7" style={{ color: '#D4AF37' }}>
            — Matthieu 28 : 19
          </p>
          <p className="font-inter text-base md:text-lg leading-relaxed mx-auto" style={{ color: 'rgba(245,230,216,0.55)' }}>
            La Chapelle est une famille de ministères <span className="text-pearl/80">autonomes et complémentaires</span> —
            aucun supérieur à l&apos;autre. Huit plateformes, présentes sur plusieurs continents,
            portées par une même vision : faire des disciples, pour toutes les nations.
          </p>

          {/* Une seule rangée de nations */}
          <div className="flex flex-wrap gap-2 justify-center mt-7">
            {NATIONS.map((flag) => (
              <span key={flag} className="text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">{flag}</span>
            ))}
          </div>
        </motion.div>

        {/* Grille des 8 plateformes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {PLATFORM_LIST.map((platform, i) => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/plateformes/${platform.id}`}
                onClick={() => events.ctaClick(`platform_${platform.id}`)}
                className="block h-full group rounded-2xl overflow-hidden card-cinematic"
              >
                <div className="relative h-36 overflow-hidden">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                    <PremiumImage
                      image={getPlatformImage(platform.id)}
                      fill
                      overlay="cinematic"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                </div>

                <div className="h-0.5 w-full transition-all duration-300 group-hover:h-1"
                  style={{ background: `linear-gradient(90deg, ${platform.couleur_primaire}, ${platform.couleur_secondaire})` }} />

                <div className="p-5">
                  <h3 className="font-cinzel font-bold text-sm mb-1.5 tracking-wide text-white">{platform.nom}</h3>
                  <p className="text-xs font-inter leading-relaxed mb-4 line-clamp-2" style={{ color: 'rgba(245,230,216,0.5)' }}>
                    {platform.slogan}
                  </p>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(245,230,216,0.4)' }}>
                      <Users className="w-3 h-3" />
                      <span>{platform.membres_count > 0 ? platform.membres_count.toLocaleString('fr-FR') : 'Rejoindre'}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 transition-all duration-300 group-hover:translate-x-1" style={{ color: platform.couleur_primaire }} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <Link href="/plateformes" className="btn-glass-cinematic group">
            Découvrir toutes les plateformes
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
