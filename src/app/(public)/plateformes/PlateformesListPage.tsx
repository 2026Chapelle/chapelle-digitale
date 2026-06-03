'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { PLATEFORMES } from '@/lib/constants'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { getPlatformImage } from '@/lib/images'

export default function PlateformesListPage() {
  const plateformes = Object.values(PLATEFORMES)

  return (
    <div className="min-h-screen bg-charbon">

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 text-center relative overflow-hidden">
        <div className="halo-gold w-[800px] h-[420px] -top-10 left-1/2 -translate-x-1/2" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10">
          <div className="section-label-dark justify-center">
            <Sparkles className="w-3 h-3" />
            Nos Ministères
          </div>
          <h1 className="heading-cinematic-xl mb-6 max-w-3xl mx-auto">
            8 Plateformes,
            <span className="block text-cinematic-gold">Une Seule Vision</span>
          </h1>
          <p className="font-inter text-base md:text-lg max-w-2xl mx-auto mb-7 leading-relaxed" style={{ color: 'rgba(245,230,216,0.55)' }}>
            La Chapelle est un écosystème de 8 ministères <span className="text-pearl/80">autonomes et complémentaires</span> —
            aucun supérieur à l&apos;autre. Chacun répond à un appel spirituel précis, au service d&apos;une seule vision.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm font-inter" style={{ color: 'rgba(245,230,216,0.4)' }}>
            <span>8 ministères actifs</span>
            <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.5)' }} />
            <span>Une famille internationale</span>
          </div>
        </motion.div>
      </section>

      {/* Grid */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plateformes.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/plateformes/${p.id}`}
                  className="group relative block h-full rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(244,241,233,0.10)', boxShadow: '0 18px 50px rgba(0,0,0,0.45)' }}
                >
                  {/* Image de couverture (fallback dégradé auto si absente) */}
                  <div className="relative aspect-[4/5]">
                    <div className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]">
                      <PremiumImage
                        image={getPlatformImage(p.id)}
                        fill
                        overlay="none"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>

                    {/* Overlay sombre premium + teinte d'accent pour la lisibilité */}
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(180deg, rgba(8,8,10,0.25) 0%, rgba(8,8,10,0.55) 55%, rgba(8,8,10,0.92) 100%)` }} />
                    <div className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                      style={{ background: `radial-gradient(ellipse at 50% 120%, ${p.couleur_primaire}40 0%, transparent 60%)` }} />

                    {/* Badge état */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-inter font-bold tracking-widest uppercase backdrop-blur-md"
                        style={{ background: `${p.couleur_primaire}30`, color: '#FFFFFF', border: `1px solid ${p.couleur_primaire}55` }}>
                        {p.actif ? 'Actif' : 'Bientôt'}
                      </span>
                    </div>

                    {/* Texte par-dessus l'image */}
                    <div className="absolute inset-x-0 bottom-0 p-5 z-10">
                      <h3 className="font-cinzel text-base font-bold text-white mb-1 leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">{p.nom}</h3>
                      <p className="text-xs font-cormorant italic mb-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" style={{ color: '#F5E6A7' }}>{p.slogan}</p>
                      <div className="flex items-center gap-1 text-xs font-inter font-semibold group-hover:gap-2 transition-all" style={{ color: p.couleur_primaire }}>
                        Découvrir
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Barre d'accent bas */}
                    <div className="absolute bottom-0 inset-x-0 h-0.5 transition-all duration-300 group-hover:h-1 z-10"
                      style={{ background: `linear-gradient(90deg, ${p.couleur_primaire}, ${p.couleur_secondaire})` }} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
