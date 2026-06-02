'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Mic2, Music, Camera, Heart, Baby, Coffee, HandHeart, Laptop,
  Sparkles, ArrowRight, type LucideIcon,
} from 'lucide-react'
import { TunnelProgress } from '@/components/features/tunnel/TunnelProgress'
import { TunnelLeadForm } from '@/components/features/tunnel/TunnelLeadForm'

type Equipe = { icon: LucideIcon; nom: string; desc: string; color: string }
const EQUIPES: Equipe[] = [
  { icon: Music, nom: 'Louange & Musique', desc: 'Conduire l’assemblée dans l’adoration.', color: '#8B5CF6' },
  { icon: Camera, nom: 'Média & Streaming', desc: 'Porter le message au monde entier.', color: '#0EA5E9' },
  { icon: HandHeart, nom: 'Accueil & Intégration', desc: 'Faire que chacun se sente attendu.', color: '#22C55E' },
  { icon: Heart, nom: 'Intercession', desc: 'Soutenir l’œuvre par la prière.', color: '#EC4899' },
  { icon: Baby, nom: 'Enfance & Jeunesse', desc: 'Bâtir la prochaine génération.', color: '#F59E0B' },
  { icon: Mic2, nom: 'Enseignement', desc: 'Affermir les disciples par la Parole.', color: '#D4AF37' },
  { icon: Coffee, nom: 'Hospitalité', desc: 'Servir la famille avec excellence.', color: '#F97316' },
  { icon: Laptop, nom: 'Technique & Digital', desc: 'Faire tourner la plateforme.', color: '#14B8A6' },
]

const POURQUOI = [
  { chiffre: '01', titre: 'Vos dons prennent vie', desc: 'Servir révèle et muscle les talents que Dieu a déposés en vous.' },
  { chiffre: '02', titre: 'Vous tissez des liens forts', desc: 'C’est dans le service côte à côte que naissent les amitiés les plus profondes.' },
  { chiffre: '03', titre: 'Vous laissez une empreinte', desc: 'Chaque heure donnée transforme des vies, ici et à travers les nations.' },
]

export default function ServirPage() {
  return (
    <div className="min-h-screen bg-cinematic-deep">
      {/* HERO */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'url(/images/tunnel/servir-hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }} />
        <div className="hero-image-overlay" />
        <div className="halo-gold w-[640px] h-[380px] -top-10 right-0" />
        <div className="container-royal relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="section-label-dark justify-center">Servir · Équipes</div>
            <h1 className="heading-cinematic-lg mb-5">Vous avez reçu.<br /><span className="text-cinematic-gold">À votre tour de donner.</span></h1>
            <p className="font-inter text-pearl/55 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
              Le serviteur n&apos;est pas un bénévole de plus : c&apos;est un membre qui a compris sa destinée.
              Trouvez l&apos;équipe où vos dons feront la différence.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="max-w-xl mx-auto card-cinematic p-5">
            <TunnelProgress current="serviteur" variant="compact" />
          </motion.div>
        </div>
      </section>

      {/* ÉQUIPES */}
      <section className="py-14">
        <div className="container-royal">
          <div className="text-center mb-10">
            <div className="section-label-dark justify-center">8 Équipes de service</div>
            <h2 className="font-cinzel font-black text-pearl text-2xl md:text-3xl">Où voulez-vous servir ?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EQUIPES.map((e, i) => (
              <motion.div key={e.nom} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.05 }} className="card-cinematic p-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${e.color}1A`, border: `1px solid ${e.color}33` }}>
                  <e.icon className="w-5 h-5" style={{ color: e.color }} />
                </div>
                <h3 className="font-cinzel font-bold text-pearl text-sm mb-1.5">{e.nom}</h3>
                <p className="font-inter text-xs text-pearl/45 leading-relaxed">{e.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI SERVIR */}
      <section className="py-14">
        <div className="container-royal grid md:grid-cols-3 gap-6">
          {POURQUOI.map((p, i) => (
            <motion.div key={p.chiffre} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="relative">
              <div className="font-cinzel font-black text-5xl mb-3 text-cinematic-gold opacity-90">{p.chiffre}</div>
              <h3 className="font-cinzel font-bold text-pearl text-lg mb-2">{p.titre}</h3>
              <p className="font-inter text-sm text-pearl/50 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FORMULAIRE */}
      <section className="py-14">
        <div className="container-royal max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-cinematic-gold p-6 md:p-9">
            <div className="text-center mb-6">
              <div className="section-label-dark justify-center"><Sparkles className="w-3 h-3" /> Candidature service</div>
              <h2 className="font-cinzel font-black text-pearl text-2xl">Rejoindre une équipe</h2>
              <p className="font-inter text-sm text-pearl/50 mt-2">Un responsable d&apos;équipe vous contacte pour un premier échange.</p>
            </div>
            <TunnelLeadForm
              stage="serviteur"
              source="servir"
              cta="Proposer mon service"
              withPhone
              withMessage
              interets={['Louange', 'Média', 'Accueil', 'Intercession', 'Enfance', 'Enseignement', 'Hospitalité', 'Technique']}
              successText="Merci ! Un responsable d'équipe vous écrit très vite pour vous accueillir."
            />
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="container-royal max-w-2xl">
          <p className="font-inter text-pearl/45 text-sm mb-4">Appelé à aller plus loin ?</p>
          <Link href="/partenaires" className="btn-gold-cinematic px-8 py-3.5 text-sm">Devenir partenaire & leader <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>
    </div>
  )
}
