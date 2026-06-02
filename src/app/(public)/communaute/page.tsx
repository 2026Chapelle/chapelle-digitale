'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Church, Home, Flame, Crown, Shield, GraduationCap, Sparkles, HeartHandshake,
  Users, Globe, Calendar, MessageCircle, ArrowRight, type LucideIcon,
} from 'lucide-react'
import { TunnelProgress } from '@/components/features/tunnel/TunnelProgress'

type Plateforme = { label: string; href: string; Icon: LucideIcon; color: string; desc: string }
const PLATEFORMES: Plateforme[] = [
  { label: 'CIER — Corps Principal', href: '/plateformes/cier', Icon: Church, color: '#D4AF37', desc: 'Le cœur de la Chapelle : cultes, enseignements, vision.' },
  { label: 'Chapelle Familiale', href: '/plateformes/chapelle-familiale', Icon: Home, color: '#22C55E', desc: 'Couples, parents et familles édifiés ensemble.' },
  { label: 'Jeunesse', href: '/plateformes/jeunesse', Icon: Flame, color: '#9333EA', desc: 'Une génération en feu pour le Royaume.' },
  { label: "Femmes d'Exceptions", href: '/plateformes/femmes-exceptions', Icon: Crown, color: '#EC4899', desc: 'Des femmes qui marchent dans leur appel.' },
  { label: 'Cité du Refuge', href: '/plateformes/cite-refuge', Icon: Shield, color: '#14B8A6', desc: 'Accompagnement, délivrance et restauration.' },
  { label: 'CFIC — Formation', href: '/plateformes/cfic', Icon: GraduationCap, color: '#8B5CF6', desc: 'Le centre de formation et de certification.' },
  { label: 'Mahanaïm — Prière', href: '/plateformes/mahanaim', Icon: Sparkles, color: '#A855F7', desc: "L'armée d'intercession, active 24/7." },
  { label: 'Familles de la Chapelle', href: '/plateformes/familles-chapelle', Icon: HeartHandshake, color: '#F5E6A7', desc: 'Les cellules de maison, près de chez vous.' },
]

const PILIERS = [
  { icon: Users, titre: 'Cellules de maison', desc: 'De petits groupes où l’on se connaît par son prénom et où l’on grandit ensemble.', color: '#22C55E' },
  { icon: Calendar, titre: 'Rendez-vous réguliers', desc: 'Cultes, veillées, études bibliques et événements tout au long de la semaine.', color: '#0EA5E9' },
  { icon: MessageCircle, titre: 'Groupes & entraide', desc: 'Des espaces d’échange par affinité, ministère et région.', color: '#EC4899' },
  { icon: Globe, titre: 'Une famille mondiale', desc: 'Une famille connectée à travers les nations, du Congo au Canada.', color: '#D4AF37' },
]

export default function CommunautePage() {
  return (
    <div className="min-h-screen bg-cinematic-deep">
      {/* HERO */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'url(/images/tunnel/communaute-hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }} />
        <div className="hero-image-overlay" />
        <div className="halo-royal w-[640px] h-[400px] -top-10 left-0" />
        <div className="container-royal relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="section-label-dark justify-center">La Communauté</div>
            <h1 className="heading-cinematic-lg mb-5">Vous n&apos;êtes pas un spectateur,<br /><span className="text-cinematic-gold">vous êtes de la famille</span></h1>
            <p className="font-inter text-pearl/55 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
              La foi ne se vit pas seul. Découvrez les plateformes, les cellules et les rendez-vous qui font
              battre le cœur de la Chapelle.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="max-w-xl mx-auto card-cinematic p-5">
            <TunnelProgress current="membre" variant="compact" />
          </motion.div>
        </div>
      </section>

      {/* PILIERS */}
      <section className="py-14">
        <div className="container-royal grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILIERS.map((p, i) => (
            <motion.div key={p.titre} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="card-cinematic p-6 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${p.color}1A`, border: `1px solid ${p.color}33` }}>
                <p.icon className="w-6 h-6" style={{ color: p.color }} />
              </div>
              <h3 className="font-cinzel font-bold text-pearl text-base mb-2">{p.titre}</h3>
              <p className="font-inter text-xs text-pearl/50 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PLATEFORMES */}
      <section className="py-14">
        <div className="container-royal">
          <div className="text-center mb-10">
            <div className="section-label-dark justify-center">8 Plateformes</div>
            <h2 className="font-cinzel font-black text-pearl text-2xl md:text-3xl mb-3">Trouvez votre maison spirituelle</h2>
            <p className="font-inter text-sm text-pearl/45 max-w-xl mx-auto">Chaque plateforme est une porte d&apos;entrée vers une communauté qui vous ressemble.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATEFORMES.map((pf, i) => (
              <motion.div key={pf.href} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.05 }}>
                <Link href={pf.href} className="card-cinematic p-5 block h-full group">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${pf.color}1A`, border: `1px solid ${pf.color}33` }}>
                    <pf.Icon className="w-5 h-5" style={{ color: pf.color }} />
                  </div>
                  <h3 className="font-cinzel font-bold text-pearl text-sm mb-1.5 group-hover:text-gold transition-colors">{pf.label}</h3>
                  <p className="font-inter text-xs text-pearl/45 leading-relaxed">{pf.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden text-center">
        <div className="halo-gold w-[560px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="container-royal relative z-10 max-w-2xl">
          <h2 className="font-cinzel font-black text-pearl text-2xl md:text-3xl mb-5">Prêt à passer du service ?</h2>
          <p className="font-inter text-sm text-pearl/50 mb-8">Quand on a trouvé sa famille, on a envie d&apos;y contribuer. Découvrez comment servir.</p>
          <Link href="/servir" className="btn-gold-cinematic px-8 py-3.5 text-sm">Voir les équipes de service <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>
    </div>
  )
}
