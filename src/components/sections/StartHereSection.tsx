'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { Compass, GraduationCap, HeartHandshake, Gift, ArrowRight, type LucideIcon } from 'lucide-react'
import { events } from '@/lib/analytics'

/* ============================================================
   BLOC 3 — COMMENCEZ ICI
   Router de parcours : oriente le visiteur sans imposer le compte.
   Conversion par paliers (découvrir → se former → servir → donner).
   ============================================================ */

type Door = {
  key: string
  titre: string
  sous: string
  href: string
  icon: LucideIcon
  cta: string
}

const DOORS: Door[] = [
  { key: 'decouvrir', titre: 'Je découvre',   sous: 'Nouveau ici ? Découvrez notre histoire, notre vision et ce que nous croyons.', href: '/notre-histoire', icon: Compass,        cta: 'Découvrir la CIER' },
  { key: 'former',    titre: 'Je me forme',   sous: 'Grandissez par des formations bibliques et des parcours de disciple.',        href: '/formations',     icon: GraduationCap,   cta: 'Voir les formations' },
  { key: 'servir',    titre: 'Je veux servir',sous: 'Mettez vos dons au service du Royaume et rejoignez une équipe.',               href: '/servir',         icon: HeartHandshake,  cta: 'Servir avec nous' },
  { key: 'donner',    titre: 'Je soutiens',   sous: 'Participez à l’avancement de l’œuvre par un don ou un partenariat.',          href: '/dons',           icon: Gift,            cta: 'Faire un don' },
]

export function StartHereSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-cinematic">
      <div className="halo-gold w-[800px] h-[420px] -top-10 left-1/2 -translate-x-1/2" />

      <div className="container-cinematic">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14 md:mb-16"
        >
          <div className="section-label-dark justify-center">Par où commencer</div>
          <h2 className="heading-cinematic-lg mb-5">
            Vous êtes nouveau ?
            <span className="block text-cinematic-gold">Commencez ici</span>
          </h2>
          <p className="font-inter text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'rgba(245,230,216,0.55)' }}>
            Quatre chemins, une seule famille. Choisissez celui qui correspond à votre saison —
            chaque porte vous conduit plus près du cœur de Dieu.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOORS.map((door, i) => (
            <motion.div
              key={door.key}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={door.href}
                onClick={() => events.ctaClick(`start_${door.key}`)}
                className="group flex h-full flex-col card-cinematic p-6"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.06))',
                    border: '1px solid rgba(212,175,55,0.32)',
                    boxShadow: '0 0 24px rgba(212,175,55,0.14)',
                  }}>
                  <door.icon className="w-6 h-6" style={{ color: '#D4AF37' }} />
                </div>
                <h3 className="font-cinzel font-bold text-lg text-white mb-2">{door.titre}</h3>
                <p className="font-inter text-sm leading-relaxed mb-5 flex-1" style={{ color: 'rgba(245,230,216,0.55)' }}>
                  {door.sous}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold font-inter transition-all group-hover:gap-2.5"
                  style={{ color: '#D4AF37' }}>
                  {door.cta}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
