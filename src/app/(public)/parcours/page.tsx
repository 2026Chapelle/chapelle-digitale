'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { TUNNEL_STAGES } from '@/lib/tunnel'
import { TunnelProgress } from '@/components/features/tunnel/TunnelProgress'

export default function ParcoursPage() {
  return (
    <div className="min-h-screen bg-cinematic-deep">
      {/* HERO */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/tunnel/parcours-hero.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.22,
          }}
        />
        <div className="hero-image-overlay" />
        <div className="halo-gold w-[700px] h-[420px] -top-10 left-1/2 -translate-x-1/2" />

        <div className="container-royal relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="section-label-dark justify-center">Le Parcours du Royaume</div>
            <h1 className="heading-cinematic-lg mb-5">
              Du Visiteur au <span className="text-cinematic-gold">Leader</span>
            </h1>
            <p className="font-inter text-pearl/55 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
              Sept étapes pour passer du premier regard à une vie qui élève les autres. Personne n&apos;est
              laissé seul : à chaque étape, la Chapelle vous accompagne.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="max-w-4xl mx-auto card-cinematic p-6 md:p-8"
          >
            <TunnelProgress current="visiteur" variant="horizontal" linked />
          </motion.div>
        </div>
      </section>

      {/* LES 7 ÉTAPES */}
      <section className="py-16">
        <div className="container-royal">
          <div className="grid gap-5 md:gap-6">
            {TUNNEL_STAGES.map((stage, i) => (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
                className="card-cinematic p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6"
              >
                {/* Numéro + icône */}
                <div className="flex items-center gap-5 md:w-72 flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
                    style={{ background: `${stage.color}1A`, border: `1px solid ${stage.color}40` }}
                  >
                    <stage.icon className="w-7 h-7" style={{ color: stage.color }} />
                    <span
                      className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center font-cinzel text-[11px] font-black"
                      style={{ background: 'linear-gradient(135deg,#F5E6A7,#D4AF37)', color: '#1A0F00' }}
                    >
                      {stage.index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-cinzel font-bold text-pearl text-lg">{stage.nom}</h3>
                    <p className="font-inter text-xs text-pearl/40">{stage.role}</p>
                  </div>
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className="font-cormorant italic text-lg" style={{ color: stage.color }}>
                    « {stage.promesse} »
                  </p>
                  <p className="font-inter text-sm text-pearl/55 mt-1.5 leading-relaxed">{stage.declencheur}</p>
                </div>

                {/* CTA */}
                <Link
                  href={stage.href}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full font-inter text-sm font-semibold flex-shrink-0 transition-all hover:-translate-y-px self-start md:self-center"
                  style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#F5E6A7' }}
                >
                  {stage.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative py-24 overflow-hidden">
        <div className="halo-gold w-[600px] h-[320px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="container-royal relative z-10 text-center max-w-3xl">
          <div className="section-label-dark justify-center">
            <Sparkles className="w-3 h-3" /> Votre destinée vous attend
          </div>
          <h2 className="heading-cinematic-lg mb-6">
            Tout commence par un <span className="text-cinematic-gold">premier pas</span>
          </h2>
          <p className="font-cormorant italic text-xl text-pearl/50 mb-10 max-w-xl mx-auto leading-relaxed">
            « Car je connais les projets que j&apos;ai formés sur vous… projets de paix et non de malheur. »
            <span className="block mt-2 text-sm not-italic font-inter text-pearl/30">— Jérémie 29:11</span>
          </p>
          <Link href="/rejoindre" className="btn-gold-cinematic px-9 py-4 text-base">
            Entrer dans le parcours <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
