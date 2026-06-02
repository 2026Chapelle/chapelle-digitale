'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Check, ChevronDown, Globe, BookOpen, Heart, Users, ArrowRight, Crown, Sparkles } from 'lucide-react'

const PLANS = [
  {
    emoji: '🌱',
    nom: 'Membre Gratuit',
    prix: 'Gratuit',
    prixDetail: null,
    highlight: false,
    color: '#22C55E',
    features: [
      'Accès aux cultes en direct',
      'Communauté de base',
      '5 formations gratuites',
      'Mur de prière',
      'Profil spirituel',
    ],
    cta: 'Créer un compte gratuit',
    href: '/register',
  },
  {
    emoji: '🌟',
    nom: 'Disciple Premium',
    prix: '5 000 FCFA',
    prixDetail: '/mois',
    highlight: true,
    color: '#D4AF37',
    features: [
      'Tout ce qui est gratuit +',
      'Accès illimité aux formations',
      'Certifications officielles',
      'Coaching personnel',
      'Groupe dédié',
      'Replays illimités',
      'Ressources premium',
      'Support prioritaire',
    ],
    cta: 'Devenir Disciple Premium',
    href: '/register?plan=disciple',
  },
  {
    emoji: '👑',
    nom: 'Partenaire du Royaume',
    prix: '25 000 FCFA',
    prixDetail: '/mois',
    highlight: false,
    color: '#8B5CF6',
    features: [
      'Tout Premium +',
      'Masterclass exclusives',
      'Accès pasteurs en direct',
      'Prière personnelle mensuelle',
      'Badge Partenaire',
      'Accès anticipé nouveautés',
      'Reçu fiscal annuel',
    ],
    cta: 'Devenir Partenaire',
    href: '/register?plan=partenaire',
  },
]

const WHY_JOIN = [
  { icon: Globe, titre: 'Communauté Mondiale', desc: 'Une communauté de croyants engagés dans la transformation spirituelle.', color: '#D4AF37' },
  { icon: BookOpen, titre: 'Formations', desc: 'Des parcours structurés pour grandir dans la foi, le leadership et le ministère.', color: '#8B5CF6' },
  { icon: Heart, titre: 'Prière 24/7', desc: "Un mur de prière actif où la communauté intercède pour vos besoins à toute heure.", color: '#EC4899' },
  { icon: Users, titre: 'Une Famille', desc: 'Une famille spirituelle bienveillante prête à vous accueillir et vous accompagner.', color: '#22C55E' },
]

const FAQ = [
  { q: "Est-ce vraiment gratuit pour commencer ?", r: "Oui ! Le niveau Visiteur est totalement gratuit et vous donne accès aux cultes en direct, au mur de prière public et aux ressources de base. Aucune carte bancaire requise." },
  { q: "Puis-je annuler mon abonnement à tout moment ?", r: "Absolument. Aucun engagement. Vous pouvez annuler votre abonnement Premium ou Partenaire à tout moment depuis votre espace membre, sans frais ni pénalité." },
  { q: "La plateforme est-elle disponible dans mon pays ?", r: "Oui ! CIER est une église numérique accessible partout dans le monde. Notre contenu est principalement en français et disponible à toute heure." },
  { q: "Qu'est-ce qu'un Partenaire CIER ?", r: "Les Partenaires sont des membres engagés qui soutiennent l'œuvre financièrement et bénéficient d'accès exclusifs : mentorat mensuel, événements VIP et contenus prophétiques." },
  { q: "Comment accéder aux formations ?", r: "Les Visiteurs accèdent à des formations gratuites de base. Les abonnés Disciple bénéficient de l'accès illimité à toutes nos formations avec certification officielle reconnue." },
]

export default function RejoindreePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 pb-4 pt-3"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <Link href="/register"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-inter font-bold text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00', boxShadow: '0 4px 16px rgba(212,175,55,0.35)' }}>
          Commencer — C&apos;est gratuit
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Hero */}
      <section
        className="relative pt-32 pb-20 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F5F5F3 0%, #FFFFFF 100%)' }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 65%)' }}
        />

        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="section-label-light justify-center mb-5">Rejoindre la Chapelle</div>
            <h1
              className="font-cinzel font-black mb-5 tracking-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', color: '#111827', lineHeight: 1.05 }}
            >
              Une Église Ouverte
              <span
                className="block"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #92721A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                au Monde Entier
              </span>
            </h1>
            <p className="font-inter text-gray-500 text-lg mb-10 leading-relaxed mx-auto" style={{ maxWidth: '580px' }}>
              Rejoignez des milliers de croyants dans une expérience spirituelle digitale unique. Formations, prière, communauté mondiale — commencez gratuitement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-inter font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-px"
                style={{ background: '#111827', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
              >
                Créer mon compte — C'est gratuit
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-inter font-medium text-sm transition-all duration-200 border"
                style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#4B5563', background: 'rgba(255,255,255,0.8)' }}
              >
                Déjà membre — Se connecter
              </Link>
            </div>
            <p className="font-inter text-sm text-gray-400">
              Une communauté mondiale · Gratuit pour commencer
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why join */}
      <section className="py-16" style={{ background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHY_JOIN.map((w, i) => (
              <motion.div
                key={w.titre}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="bg-white rounded-2xl p-6 text-center transition-all duration-300"
                style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${w.color}12` }}
                >
                  <w.icon className="w-6 h-6" style={{ color: w.color }} />
                </div>
                <h3 className="font-cinzel font-bold text-gray-900 mb-2 text-sm">{w.titre}</h3>
                <p className="font-inter text-xs text-gray-400 leading-relaxed">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, #ECEAE6 0%, #F5F5F3 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-14"
          >
            <div className="section-label-light justify-center mb-5">Plans & Tarifs</div>
            <h2
              className="font-cinzel font-black tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#111827', lineHeight: 1.05 }}
            >
              Choisissez votre
              <span
                className="block"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #92721A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Niveau d'Engagement
              </span>
            </h2>
            <p className="font-inter text-gray-400 max-w-xl mx-auto text-base leading-relaxed">
              Commencez gratuitement et évoluez à votre rythme selon votre appel et votre saison.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.nom}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="relative rounded-2xl p-7"
                style={
                  plan.highlight
                    ? {
                        background: '#111827',
                        boxShadow: '0 16px 48px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.12)',
                        transform: 'translateY(-4px)',
                      }
                    : {
                        background: '#FFFFFF',
                        border: '1px solid rgba(0,0,0,0.07)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                      }
                }
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-inter text-xs font-bold"
                      style={{ background: '#D4AF37', color: '#1A0F00' }}
                    >
                      <Crown className="w-3 h-3" />
                      Recommandé
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <div className="text-3xl mb-3">{plan.emoji}</div>
                  <h3
                    className="font-cinzel font-bold text-base mb-2"
                    style={{ color: plan.highlight ? '#FFFFFF' : '#111827' }}
                  >
                    {plan.nom}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-cinzel text-3xl font-black"
                      style={{ color: plan.highlight ? '#D4AF37' : '#111827' }}
                    >
                      {plan.prix}
                    </span>
                    {plan.prixDetail && (
                      <span className="font-inter text-sm" style={{ color: plan.highlight ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>
                        {plan.prixDetail}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-7">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 font-inter text-sm">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: plan.highlight ? 'rgba(212,175,55,0.2)' : 'rgba(34,197,94,0.1)' }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: plan.highlight ? '#D4AF37' : '#22C55E' }} />
                      </div>
                      <span style={{ color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className="block w-full text-center py-3 rounded-xl font-inter font-semibold text-sm transition-all duration-200"
                  style={
                    plan.highlight
                      ? { background: '#D4AF37', color: '#1A0F00' }
                      : { background: '#111827', color: '#FFFFFF' }
                  }
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-12"
          >
            <div className="section-label-light justify-center mb-5">FAQ</div>
            <h2
              className="font-cinzel font-black tracking-tight"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', color: '#111827', lineHeight: 1.05 }}
            >
              Questions Fréquentes
            </h2>
          </motion.div>

          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="rounded-2xl overflow-hidden bg-white transition-all duration-300"
                style={{
                  border: `1px solid ${openFaq === i ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.07)'}`,
                  boxShadow: openFaq === i ? '0 4px 20px rgba(212,175,55,0.06)' : '0 1px 4px rgba(0,0,0,0.03)',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-inter font-semibold text-gray-800 text-sm pr-4">{faq.q}</span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: openFaq === i ? '#111827' : 'rgba(0,0,0,0.05)',
                      color: openFaq === i ? '#FFFFFF' : '#9CA3AF',
                    }}
                  >
                    <ChevronDown
                      className="w-4 h-4 transition-transform duration-300"
                      style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <p className="font-inter text-sm text-gray-500 leading-relaxed">{faq.r}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="relative py-24 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D0D1A 0%, #080010 50%, #0D0D1A 100%)' }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 max-w-3xl mx-auto px-4 text-center"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 font-inter text-xs font-bold tracking-[0.15em] uppercase"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}
          >
            <Sparkles className="w-3 h-3" />
            Votre Destinée Vous Attend
          </div>

          <h2
            className="font-cinzel font-black mb-6"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 3.5rem)',
              lineHeight: 1.05,
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A7 50%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Prêt(e) à Rejoindre<br />la Famille ?
          </h2>

          <p
            className="font-cormorant text-xl italic mb-10 mx-auto"
            style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '560px', lineHeight: 1.6 }}
          >
            « Car je connais les projets que j'ai formés sur vous… projets de paix et non de malheur. »
            <span className="block mt-2 text-sm not-italic font-inter" style={{ color: 'rgba(255,255,255,0.25)' }}>— Jérémie 29:11</span>
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-3 font-inter font-semibold text-base rounded-full group transition-all duration-300 hover:-translate-y-px"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #C49A20 100%)',
              color: '#1A0F00',
              padding: '16px 40px',
              boxShadow: '0 8px 32px rgba(212,175,55,0.4)',
            }}
          >
            Rejoindre la Chapelle — C'est Gratuit
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
