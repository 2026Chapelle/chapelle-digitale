'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'
import { PLATEFORMES } from '@/lib/constants'

const MEMBRES_MAP: Record<string, number> = {
  cier: 1840,
  jeunesse: 892,
  'chapelle-familiale': 524,
  'femmes-exceptions': 743,
  'cite-refuge': 312,
  cfic: 1240,
  mahanaim: 248,
  'familles-chapelle': 567,
}

export default function PlateformesListPage() {
  const plateformes = Object.values(PLATEFORMES)

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F3' }}>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] blur-[100px] opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse, #D4AF37, transparent 70%)' }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="relative z-10">
          <div className="section-label-light justify-center mb-6">8 Ministères · 1 Famille</div>
          <h1 className="font-cinzel text-4xl md:text-6xl font-black text-gray-900 mb-6 leading-tight max-w-3xl mx-auto">
            Nos Plateformes
            <br />
            <span style={{ color: '#92721A' }}>Ministérielles</span>
          </h1>
          <p className="text-gray-500 font-inter text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            La Chapelle Internationale des Élus du Royaume est un écosystème de 8 ministères complémentaires, chacun répondant à un appel spirituel spécifique.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm font-inter text-gray-400">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />4 127+ membres</span>
            <span>·</span>
            <span>86 pays représentés</span>
            <span>·</span>
            <span>8 ministères actifs</span>
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
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.6 }}
              >
                <Link
                  href={`/plateformes/${p.id}`}
                  className="block card-elevated p-6 group h-full"
                  style={{ cursor: 'pointer' }}
                >
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${p.couleur_primaire}20, ${p.couleur_primaire}08)`,
                      border: `1px solid ${p.couleur_primaire}25`,
                    }}
                  >
                    {p.icone}
                  </div>

                  {/* Info */}
                  <h3 className="font-cinzel text-base font-bold text-gray-900 mb-1 leading-tight group-hover:text-opacity-80 transition-colors">
                    {p.nom}
                  </h3>
                  <p className="text-xs font-cormorant italic mb-3" style={{ color: p.couleur_primaire }}>
                    {p.slogan}
                  </p>
                  <p className="text-xs font-inter text-gray-500 leading-relaxed mb-4 line-clamp-3">
                    {p.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs font-inter text-gray-400">
                      <Users className="w-3 h-3" />
                      {(MEMBRES_MAP[p.id] || 0).toLocaleString()} membres
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs font-inter font-semibold group-hover:gap-2 transition-all"
                      style={{ color: p.couleur_primaire }}
                    >
                      Découvrir
                      <ArrowRight className="w-3 h-3" />
                    </div>
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
