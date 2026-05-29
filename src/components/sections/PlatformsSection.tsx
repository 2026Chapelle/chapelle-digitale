'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Users, Sparkles } from 'lucide-react'
import { PLATEFORMES } from '@/lib/constants'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { getPlatformImage } from '@/lib/images'

const PLATFORM_LIST = Object.values(PLATEFORMES)

export function PlatformsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-cinematic">
      {/* Halos */}
      <div className="halo-gold w-[700px] h-[500px] top-1/2 -right-40 -translate-y-1/2" />
      <div className="halo-light w-[600px] h-[400px] -top-20 -left-40" />

      <div className="container-cinematic">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14 md:mb-16"
        >
          <div className="section-label-dark justify-center">
            <Sparkles className="w-3 h-3" />
            Nos Ministères
          </div>
          <h2 className="heading-cinematic-lg mb-5">
            8 Plateformes,
            <span className="block text-cinematic-gold">Une Seule Vision</span>
          </h2>
          <p className="font-inter text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'rgba(245,230,216,0.55)' }}>
            La Chapelle est une famille de ministères complémentaires. Chaque plateforme a une identité unique,
            une mission précise et un espace dédié pour grandir.
          </p>
        </motion.div>

        {/* Grid */}
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
                className="block h-full group rounded-2xl overflow-hidden card-cinematic"
              >
                {/* Real cinematic image header */}
                <div className="relative h-36 overflow-hidden">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                    <PremiumImage
                      image={getPlatformImage(platform.id)}
                      fill
                      overlay="subtle"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  {/* Top badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <div className="text-[9px] px-2 py-0.5 rounded-full font-inter font-bold tracking-widest uppercase backdrop-blur-md"
                      style={{
                        background: `${platform.couleur_primaire}30`,
                        color: '#FFFFFF',
                        border: `1px solid ${platform.couleur_primaire}50`,
                      }}>
                      {platform.actif ? 'Actif' : 'Bientôt'}
                    </div>
                  </div>
                  {/* Floating emoji watermark */}
                  <motion.span
                    className="absolute bottom-2 right-3 text-2xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] z-10 opacity-80"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden
                  >
                    {platform.icone}
                  </motion.span>
                </div>

                {/* Color bar */}
                <div
                  className="h-0.5 w-full transition-all duration-400 group-hover:h-1"
                  style={{ background: `linear-gradient(90deg, ${platform.couleur_primaire}, ${platform.couleur_secondaire})` }}
                />

                <div className="p-5">
                  <h3 className="font-cinzel font-bold text-sm mb-1.5 tracking-wide text-white">
                    {platform.nom}
                  </h3>
                  <p className="text-xs font-inter leading-relaxed mb-4 line-clamp-2"
                    style={{ color: 'rgba(245,230,216,0.5)' }}>
                    {platform.slogan}
                  </p>

                  <div className="flex items-center justify-between pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-1.5 text-[11px]"
                      style={{ color: 'rgba(245,230,216,0.4)' }}>
                      <Users className="w-3 h-3" />
                      <span>{platform.membres_count > 0 ? platform.membres_count.toLocaleString() : 'Rejoindre'}</span>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 transition-all duration-300 group-hover:translate-x-1"
                      style={{ color: platform.couleur_primaire }}
                    />
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
          transition={{ duration: 0.6, delay: 0.55 }}
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
