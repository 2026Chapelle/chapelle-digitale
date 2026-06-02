'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, UserCheck, MessageCircle, BookOpen, Calendar, Heart, ArrowRight } from 'lucide-react'
import { TunnelProgress } from '@/components/features/tunnel/TunnelProgress'
import { TunnelLeadForm } from '@/components/features/tunnel/TunnelLeadForm'

const ETAPES = [
  { icon: UserCheck, titre: 'Vous êtes accueilli', desc: 'Un mentor de bienvenue vous écrit personnellement sous 48h.', color: '#0EA5E9' },
  { icon: MapPin, titre: 'Vous trouvez votre place', desc: 'Nous vous orientons vers la cellule et la plateforme qui vous correspondent.', color: '#22C55E' },
  { icon: BookOpen, titre: 'Vous démarrez le parcours', desc: 'Le mini-parcours « Premiers Pas » (3 modules) pose des fondations solides.', color: '#D4AF37' },
]

const ATTENTES = [
  { icon: MessageCircle, label: 'Un mot de bienvenue personnel' },
  { icon: Calendar, label: 'Un agenda des prochains rendez-vous' },
  { icon: Heart, label: 'Une équipe qui prie pour vous' },
  { icon: BookOpen, label: 'Vos 3 premières ressources offertes' },
]

export default function IntegrationPage() {
  return (
    <div className="min-h-screen bg-cinematic-deep">
      {/* HERO */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'url(/images/tunnel/integration-hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }}
        />
        <div className="hero-image-overlay" />
        <div className="halo-gold w-[640px] h-[380px] -top-10 right-0" />
        <div className="container-royal relative z-10">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="section-label-dark">Intégration · Nouveaux arrivants</div>
              <h1 className="heading-cinematic-lg mb-5">
                Vous venez d&apos;arriver ?<br /><span className="text-cinematic-gold">Vous êtes déjà chez vous.</span>
              </h1>
              <p className="font-inter text-pearl/55 text-base md:text-lg leading-relaxed mb-8 max-w-2xl">
                L&apos;intégration n&apos;est pas un formulaire de plus : c&apos;est une main tendue. En quelques jours,
                vous passez d&apos;inconnu à membre attendu et accompagné.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-cinematic p-5 max-w-xl">
              <TunnelProgress current="integration" variant="compact" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3 ÉTAPES */}
      <section className="py-14">
        <div className="container-royal">
          <div className="text-center mb-10">
            <div className="section-label-dark justify-center">Comment ça se passe</div>
            <h2 className="font-cinzel font-black text-pearl text-2xl md:text-3xl">3 pas pour ne plus jamais être seul</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {ETAPES.map((e, i) => (
              <motion.div
                key={e.titre}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card-cinematic p-7"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${e.color}1A`, border: `1px solid ${e.color}33` }}>
                  <e.icon className="w-6 h-6" style={{ color: e.color }} />
                </div>
                <div className="font-cinzel text-xs font-bold tracking-widest mb-2" style={{ color: e.color }}>ÉTAPE {i + 1}</div>
                <h3 className="font-cinzel font-bold text-pearl text-lg mb-2">{e.titre}</h3>
                <p className="font-inter text-sm text-pearl/50 leading-relaxed">{e.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULAIRE + ATTENTES */}
      <section className="py-14">
        <div className="container-royal grid lg:grid-cols-2 gap-8 items-start">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 className="font-cinzel font-black text-pearl text-2xl md:text-3xl mb-4">Lancez votre intégration</h2>
            <p className="font-inter text-sm text-pearl/55 leading-relaxed mb-6">
              Laissez-nous vos coordonnées : un mentor vous contacte et vous recevez immédiatement votre kit de bienvenue.
            </p>
            <ul className="space-y-3">
              {ATTENTES.map((a) => (
                <li key={a.label} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <a.icon className="w-4 h-4 text-gold" />
                  </span>
                  <span className="font-inter text-sm text-pearl/70">{a.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="card-cinematic-gold p-6 md:p-8">
            <h3 className="font-cinzel font-bold text-pearl text-lg mb-5">Kit de bienvenue offert</h3>
            <TunnelLeadForm
              stage="integration"
              source="integration"
              cta="Recevoir mon kit de bienvenue"
              withPhone
              interets={['Cellule près de chez moi', 'Formations', 'Prière', 'Servir']}
              successText="Bienvenue ! Un mentor vous écrit sous 48h et votre kit arrive par email."
            />
          </motion.div>
        </div>
      </section>

      {/* SUITE DU PARCOURS */}
      <section className="py-16 text-center">
        <div className="container-royal max-w-2xl">
          <p className="font-inter text-pearl/45 text-sm mb-4">Une fois intégré, la suite vous attend</p>
          <Link href="/communaute" className="btn-gold-cinematic px-8 py-3.5 text-sm">
            Découvrir la communauté <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
