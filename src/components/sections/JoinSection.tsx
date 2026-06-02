'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, Check, Crown, Sparkles, UserPlus, UserCircle2, Compass, Rocket,
  type LucideIcon,
} from 'lucide-react'
import { PLANS_MEMBRE } from '@/lib/constants'
import { HERO_IMAGES } from '@/lib/images'

type Step = { numero: string; titre: string; description: string; icon: LucideIcon; color: string }
const STEPS: Step[] = [
  { numero: '01', titre: 'Créez votre compte',         description: 'Inscription gratuite en 30 secondes. Votre voyage commence ici.',           icon: UserPlus,    color: '#D4AF37' },
  { numero: '02', titre: 'Profil spirituel',           description: 'Renseignez votre profil pour personnaliser votre expérience.',              icon: UserCircle2, color: '#8B5CF6' },
  { numero: '03', titre: 'Choisissez votre plateforme',description: 'Rejoignez la communauté qui correspond à votre appel et votre saison.',     icon: Compass,     color: '#0EA5E9' },
  { numero: '04', titre: 'Commencez à grandir',        description: 'Formations, live, prière, communauté — tout vous attend.',                  icon: Rocket,      color: '#22C55E' },
]

export function JoinSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* HOW IT WORKS */}
      <div className="section-cinematic">
        <div className="halo-gold w-[600px] h-[400px] -top-20 -right-40" />

        <div className="container-cinematic">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="section-label-dark justify-center">Comment ça marche</div>
            <h2 className="heading-cinematic-lg">
              Rejoignez la Chapelle
              <span className="block text-cinematic-gold">en 4 Étapes</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative">
            {/* Connector */}
            <div
              className="hidden lg:block absolute top-9 left-[12%] right-[12%] h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), rgba(212,175,55,0.6), rgba(212,175,55,0.4), transparent)' }}
            />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.numero}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                className="text-center card-cinematic p-6 relative group"
              >
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-500 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}25, ${step.color}08)`,
                      border: `1px solid ${step.color}35`,
                      boxShadow: `0 0 24px ${step.color}20`,
                    }}
                  >
                    <step.icon className="w-7 h-7" style={{ color: step.color }} />
                  </div>
                  <div
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black font-cinzel"
                    style={{
                      background: 'linear-gradient(135deg, #D4AF37, #92721A)',
                      color: '#1A0F00',
                      boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-cinzel font-bold text-sm text-white mb-2 tracking-wide">{step.titre}</h3>
                <p className="text-xs font-inter leading-relaxed"
                  style={{ color: 'rgba(245,230,216,0.55)' }}>
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="section-cinematic">
        <div className="halo-light w-[700px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="container-cinematic">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-center mb-12"
          >
            <div className="section-label-dark justify-center">Soutenir l'œuvre</div>
            <h2 className="heading-cinematic-lg mb-4">
              Soutenir l'œuvre &amp; accéder aux
              <span className="block text-cinematic-gold">ressources avancées</span>
            </h2>
            <p className="font-inter text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'rgba(245,230,216,0.55)' }}>
              Votre croissance spirituelle reste <span className="text-pearl/90 font-semibold">entièrement gratuite</span> :
              le parcours Visiteur → Contact → Intégration → Disciple → Membre → Serviteur → Leader est ouvert à tous.
              Ces formules ne sont pas une barrière — elles servent uniquement à soutenir l'œuvre et à débloquer
              certains contenus premium.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {Object.entries(PLANS_MEMBRE).map(([key, plan], i) => {
              const isHighlighted = key === 'disciple'
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 32 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                  className="relative rounded-3xl p-7 transition-all duration-500"
                  style={
                    isHighlighted
                      ? {
                          background: `
                            radial-gradient(circle at 50% 0%, rgba(212,175,55,0.25) 0%, transparent 60%),
                            linear-gradient(140deg, rgba(212,175,55,0.12) 0%, rgba(244,241,233,0.05) 100%)
                          `,
                          border: '1px solid rgba(212,175,55,0.4)',
                          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 60px rgba(212,175,55,0.2)',
                          transform: 'translateY(-8px) scale(1.02)',
                        }
                      : {
                          background: 'linear-gradient(140deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                        }
                  }
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-inter"
                        style={{
                          background: 'linear-gradient(135deg, #F5E6A7, #D4AF37)',
                          color: '#1A0F00',
                          boxShadow: '0 4px 16px rgba(212,175,55,0.5)',
                        }}
                      >
                        <Crown className="w-3 h-3" />
                        Recommandé
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="font-cinzel font-bold text-base mb-2"
                      style={{ color: isHighlighted ? '#FFFFFF' : 'rgba(245,230,216,0.85)' }}>
                      {plan.nom}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-cinzel text-4xl font-black"
                        style={{ color: isHighlighted ? '#F5E6A7' : '#FFFFFF' }}
                      >
                        {plan.prix === 0 ? 'Gratuit' : `${plan.prix.toLocaleString('fr-FR')} FCFA`}
                      </span>
                      {'devise' in plan && (
                        <span className="text-sm font-inter"
                          style={{ color: 'rgba(245,230,216,0.4)' }}>
                          /{plan.devise.split('/')[1]}
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-7">
                    {plan.fonctionnalites.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm font-inter">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: isHighlighted ? 'rgba(212,175,55,0.25)' : 'rgba(34,197,94,0.18)' }}
                        >
                          <Check className="w-2.5 h-2.5" style={{ color: isHighlighted ? '#F5E6A7' : '#86EFAC' }} />
                        </div>
                        <span style={{ color: isHighlighted ? 'rgba(255,255,255,0.85)' : 'rgba(245,230,216,0.65)' }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={key === 'gratuit' ? '/register' : `/register?plan=${key}`}
                    className="block w-full text-center py-3 rounded-xl font-inter font-semibold text-sm transition-all duration-300"
                    style={
                      isHighlighted
                        ? {
                            background: 'linear-gradient(135deg, #F5E6A7, #D4AF37)',
                            color: '#1A0F00',
                            boxShadow: '0 8px 24px rgba(212,175,55,0.4)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.06)',
                            color: '#F5E6D8',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }
                    }
                  >
                    {key === 'gratuit' ? 'Commencer Gratuitement' : 'Choisir ce Plan'}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* FINAL CTA — cinematic finale */}
      <div className="relative section-cinematic" style={{ paddingBottom: '8rem' }}>
        {/* Massive cathedral glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.22) 0%, rgba(236,232,222,0.10) 42%, transparent 72%)', filter: 'blur(40px)' }} />
        {/* Beam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full opacity-30"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.6) 30%, transparent 80%)' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Royal crest seal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -12 }}
            animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative inline-block mb-6"
          >
            <div className="absolute inset-0 rounded-full blur-3xl opacity-60"
              style={{ background: 'radial-gradient(circle, #D4AF37, transparent 65%)' }} />
            <Image
              src={HERO_IMAGES.crest.src}
              alt={HERO_IMAGES.crest.alt}
              width={140}
              height={140}
              className="relative drop-shadow-[0_8px_24px_rgba(212,175,55,0.4)]"
            />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold tracking-[0.25em] uppercase font-inter backdrop-blur-md"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#F5E6A7',
              boxShadow: '0 0 30px rgba(212,175,55,0.15)',
            }}>
            <Sparkles className="w-3 h-3" />
            Votre Destinée Vous Attend
            <Sparkles className="w-3 h-3" />
          </div>

          <h2 className="font-cinzel font-black mb-6 text-cinematic-gold drop-shadow-[0_4px_30px_rgba(212,175,55,0.3)]"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.0 }}>
            Rejoignez la Chapelle
          </h2>

          <p className="font-cormorant italic mb-10 mx-auto leading-relaxed"
            style={{
              fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)',
              color: 'rgba(245,230,216,0.65)',
              maxWidth: '720px',
            }}>
            « Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix
            et non de malheur, afin de vous donner un avenir et de l'espérance. »
            <span className="block mt-3 text-sm not-italic font-inter tracking-[0.3em] uppercase"
              style={{ color: '#D4AF37' }}>
              — Jérémie 29 : 11
            </span>
          </p>

          <Link
            href="/register"
            className="btn-gold-cinematic group inline-flex"
            style={{ padding: '18px 44px', fontSize: '1rem' }}
          >
            Rejoindre la Chapelle Maintenant
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
