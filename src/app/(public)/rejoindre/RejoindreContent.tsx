'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronDown, Globe, BookOpen, Heart, Users, ArrowRight, Sparkles, LogIn, HeartHandshake, type LucideIcon } from 'lucide-react'
import { JourneyPath } from '@/components/conversion/JourneyPath'
import { LeadCaptureForm } from '@/components/conversion/LeadCaptureForm'
import { events } from '@/lib/analytics'
import { FAQ_ITEMS } from './faq-data'

const WHY_JOIN: { icon: LucideIcon; titre: string; desc: string }[] = [
  { icon: Globe, titre: 'Communauté Mondiale', desc: 'Des croyants engagés sur plusieurs continents, unis dans une même vision du Royaume.' },
  { icon: BookOpen, titre: 'Formations', desc: 'Des parcours structurés pour grandir dans la foi, le leadership et le ministère.' },
  { icon: Heart, titre: 'Prière 24/7', desc: 'Un mur de prière actif où la communauté intercède pour vos besoins à toute heure.' },
  { icon: Users, titre: 'Une Famille', desc: 'Une famille spirituelle bienveillante, prête à vous accueillir et vous accompagner.' },
]

export default function RejoindreContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="bg-charbon min-h-screen">
      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 pb-4 pt-3"
        style={{ background: 'rgba(8,8,10,0.92)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(212,175,55,0.18)' }}>
        <a href="#premier-pas"
          onClick={() => events.ctaClick('rejoindre_sticky')}
          className="btn-gold-cinematic w-full justify-center">
          Faire le premier pas
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* HERO */}
      <section className="section-cinematic pt-32 md:pt-36">
        <div className="halo-gold w-[800px] h-[420px] -top-10 left-1/2 -translate-x-1/2" />
        <div className="container-cinematic max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <div className="section-label-dark justify-center">
              <Sparkles className="w-3 h-3" />
              Rejoindre la Chapelle
            </div>
            <h1 className="heading-cinematic-xl mb-5">
              Votre parcours
              <span className="block text-cinematic-gold">commence ici</span>
            </h1>
            <p className="font-cormorant italic mb-4" style={{ fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)', color: 'rgba(245,230,216,0.6)' }}>
              « Où que tu sois sur la terre, tu as une maison dans le Royaume. »
            </p>
            <p className="font-inter text-base md:text-lg leading-relaxed mx-auto mb-9" style={{ color: 'rgba(245,230,216,0.55)', maxWidth: '600px' }}>
              Pas besoin d&apos;être prêt à tout engager. Faites simplement le premier pas —
              nous vous accueillons personnellement et vous accompagnons, étape après étape.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#premier-pas" onClick={() => events.ctaClick('rejoindre_hero_primary')}
                className="btn-gold-cinematic w-full sm:w-auto" style={{ padding: '15px 36px' }}>
                Faire le premier pas
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/login" className="btn-glass-cinematic w-full sm:w-auto">
                <LogIn className="w-4 h-4" />
                Déjà membre — Se connecter
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LE CHEMIN — JourneyPath */}
      <section className="section-cinematic pt-0">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <div className="section-label-dark justify-center">Le chemin de transformation</div>
            <h2 className="heading-cinematic-lg mb-4">
              De Visiteur
              <span className="text-cinematic-gold"> à Responsable</span>
            </h2>
            <p className="font-inter text-base max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(245,230,216,0.55)' }}>
              Sept étapes, un seul appel. Vous avancez à votre rythme — chaque pas est accompagné.
            </p>
          </div>
          <JourneyPath />
        </div>
      </section>

      {/* LE PREMIER PAS — capture */}
      <section id="premier-pas" className="section-cinematic scroll-mt-nav pt-0">
        <div className="halo-light w-[600px] h-[400px] top-0 left-1/2 -translate-x-1/2" />
        <div className="container-cinematic max-w-2xl">
          <div className="text-center mb-8">
            <div className="section-label-dark justify-center">Sans engagement</div>
            <h2 className="heading-cinematic-lg mb-4">Faites le premier pas</h2>
            <p className="font-inter text-base leading-relaxed mx-auto" style={{ color: 'rgba(245,230,216,0.55)', maxWidth: '520px' }}>
              Laissez-nous vos coordonnées : vous recevez un mot de bienvenue et un accompagnement personnel.
              Vous pourrez créer votre compte complet quand vous le souhaitez.
            </p>
          </div>

          <LeadCaptureForm
            stage="contact"
            source="rejoindre"
            title="Je veux être accueilli"
            subtitle="Premier contact — nous revenons vers vous personnellement."
            ctaLabel="Faire le premier pas"
            askMessage
            successMessage="Bienvenue dans la famille ! Vous recevez un mot de notre part très vite. 🙏"
          />

          <div className="text-center mt-6">
            <p className="font-inter text-sm mb-3" style={{ color: 'rgba(245,230,216,0.45)' }}>Vous préférez aller directement plus loin ?</p>
            <Link href="/register" onClick={() => events.ctaClick('rejoindre_register')} className="btn-glass-cinematic group">
              Créer mon compte complet — gratuit
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* POURQUOI NOUS REJOINDRE */}
      <section className="section-cinematic pt-0">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <div className="section-label-dark justify-center">Pourquoi nous rejoindre</div>
            <h2 className="heading-cinematic-lg">Ce que vous trouverez ici</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHY_JOIN.map((w, i) => (
              <motion.div key={w.titre}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.07 }}
                className="card-cinematic p-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <w.icon className="w-6 h-6" style={{ color: '#D4AF37' }} />
                </div>
                <h3 className="font-cinzel font-bold text-white mb-2 text-sm">{w.titre}</h3>
                <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(245,230,216,0.5)' }}>{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-cinematic pt-0">
        <div className="container-cinematic max-w-3xl">
          <div className="text-center mb-10">
            <div className="section-label-dark justify-center">FAQ</div>
            <h2 className="heading-cinematic-lg">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, i) => (
              <div key={i} className="card-cinematic overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                  aria-expanded={openFaq === i}>
                  <span className="font-inter font-semibold text-white text-sm pr-4">{faq.q}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{ background: openFaq === i ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)' }}>
                    <ChevronDown className="w-4 h-4 transition-transform duration-300"
                      style={{ color: openFaq === i ? '#D4AF37' : 'rgba(245,230,216,0.5)', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-5 pb-5">
                        <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(245,230,216,0.6)' }}>{faq.r}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Soutenir l'œuvre — pricing déplacé vers /partenariat */}
          <div className="card-cinematic-gold mt-8 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.3)' }}>
                <HeartHandshake className="w-5 h-5" style={{ color: '#D4AF37' }} />
              </div>
              <div>
                <p className="font-cinzel font-bold text-white text-sm">Soutenir l&apos;œuvre &amp; aller plus loin</p>
                <p className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.55)' }}>Formules de partenariat, contenus avancés, reçu annuel.</p>
              </div>
            </div>
            <Link href="/partenariat" className="btn-glass-cinematic flex-shrink-0">
              Découvrir le partenariat
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="h-20 md:hidden" aria-hidden />
    </div>
  )
}
