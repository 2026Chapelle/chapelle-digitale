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

// Nations où des drapeaux apparaissent réellement (MovementSection + Contact).
// V2.7-A.4 : de vrais PNG locaux (public/images/flags) — sur Windows les emojis 🇨🇩
// tombaient en abréviations « CD FR… ». Aucun chargement CDN au runtime.
const NATIONS: { code: string; pays: string }[] = [
  { code: 'cd', pays: 'République démocratique du Congo' },
  { code: 'fr', pays: 'France' },
  { code: 'be', pays: 'Belgique' },
  { code: 'ca', pays: 'Canada' },
  { code: 'ci', pays: "Côte d'Ivoire" },
  { code: 'cm', pays: 'Cameroun' },
  { code: 'gh', pays: 'Ghana' },
  { code: 'sn', pays: 'Sénégal' },
  { code: 'ch', pays: 'Suisse' },
  { code: 'gb', pays: 'Royaume-Uni' },
  { code: 'us', pays: 'États-Unis' },
  { code: 'de', pays: 'Allemagne' },
]

// Flottement léger des drapeaux — uniquement `transform` (translateY + micro-rotation).
// Durée/décalage variés par drapeau (voir style inline) ; coupé en reduced-motion.
// Aucun blur, aucun backdrop-filter, aucune ombre animée.
const FLAG_CSS = `
  @keyframes citadelleFlagFloat {
    0%, 100% { transform: translateY(-5px) rotate(-1.5deg); }
    50%      { transform: translateY(5px)  rotate(1.5deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .citadelle-flag { animation: none !important; }
  }
`

export function MovementSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-cinematic">
      <style dangerouslySetInnerHTML={{ __html: FLAG_CSS }} />
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
          <h2 className="heading-cinematic-lg mb-6">
            Une famille
            <span className="block text-cinematic-gold">de ministères</span>
          </h2>
          <p className="font-cormorant italic text-xl md:text-2xl leading-relaxed mb-2"
            style={{ color: 'rgba(245,230,216,0.72)' }}>
            « Allez, faites de toutes les nations des disciples. »
          </p>
          <p className="font-inter text-xs tracking-[0.28em] uppercase mb-8" style={{ color: 'rgba(212,175,55,0.7)' }}>
            Matthieu 28 : 19
          </p>
          <p className="font-inter text-base md:text-lg leading-relaxed mx-auto max-w-2xl" style={{ color: 'rgba(245,230,216,0.48)' }}>
            Huit plateformes. Une vision. Pour prier, apprendre, servir et grandir.
          </p>

          {/* Une seule rangée de nations — vrais drapeaux PNG locaux (rendu identique sur
              Windows/desktop et mobile ; wrap propre ; aucune abréviation, aucun emoji). */}
          <div className="flex flex-wrap gap-2.5 justify-center mt-7">
            {NATIONS.map((n, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={n.code}
                src={`/images/flags/${n.code}.png`}
                alt={`Drapeau de ${n.pays}`}
                title={n.pays}
                loading="lazy"
                decoding="async"
                width={34}
                className="citadelle-flag w-[34px] h-auto rounded-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  animation: `citadelleFlagFloat ${(4 + (i % 4) * 0.9).toFixed(1)}s ease-in-out infinite`,
                  animationDelay: `-${(i * 0.7).toFixed(1)}s`,
                }}
              />
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
          <Link href="/plateformes" className="text-sm font-inter text-pearl/60 hover:text-gold inline-flex items-center gap-1.5 transition-colors group">
            Découvrir toutes les plateformes
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
