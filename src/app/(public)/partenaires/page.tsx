'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check, Crown, Star, Gem, Globe, Heart, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { TunnelProgress } from '@/components/features/tunnel/TunnelProgress'
import { TunnelLeadForm } from '@/components/features/tunnel/TunnelLeadForm'

const NIVEAUX = [
  {
    icon: Star, nom: 'Partenaire', prix: '25 000 FCFA', detail: '/mois', color: '#0EA5E9', highlight: false,
    avantages: ['Soutien mensuel à l’œuvre', 'Lettre prophétique du mois', 'Accès événements partenaires', 'Badge Partenaire'],
    cta: 'Devenir partenaire', href: '/register?plan=partenaire',
  },
  {
    icon: Gem, nom: 'Partenaire Royal', prix: '75 000 FCFA', detail: '/mois', color: '#D4AF37', highlight: true,
    avantages: ['Tout Partenaire inclus', 'Mentorat mensuel en visio', 'Contenu leadership premium', 'Rencontres VIP annuelles', 'Accès anticipé aux formations'],
    cta: 'Rejoindre le cercle royal', href: '/register?plan=royal',
  },
  {
    icon: Crown, nom: 'Bâtisseur', prix: 'Sur mesure', detail: '', color: '#8B5CF6', highlight: false,
    avantages: ['Partenariat stratégique', 'Projets nommés & legs', 'Conseil de vision', 'Accompagnement personnel du pasteur'],
    cta: 'Échanger avec l’équipe', href: '#contact-leader',
  },
]

const IMPACT = [
  { icon: Globe, titre: 'Les nations', label: 'touchées par l’œuvre' },
  { icon: Heart, titre: 'L’intercession', label: 'soutenue jour et nuit' },
  { icon: TrendingUp, titre: 'Les formations', label: 'rendues accessibles' },
]

export default function PartenairesPage() {
  return (
    <div className="min-h-screen bg-cinematic-deep">
      {/* HERO */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'url(/images/tunnel/partenaires-hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }} />
        <div className="hero-image-overlay" />
        <div className="halo-gold w-[680px] h-[400px] -top-10 left-1/2 -translate-x-1/2" />
        <div className="container-royal relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="section-label-dark justify-center">Partenaires & Leaders</div>
            <h1 className="heading-cinematic-lg mb-5">Bâtir le Royaume,<br /><span className="text-cinematic-gold">ensemble</span></h1>
            <p className="font-inter text-pearl/55 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
              Le leader ne consomme plus : il porte. En devenant partenaire, vous démultipliez l&apos;impact
              de la Chapelle et entrez dans une relation de mentorat et de responsabilité.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="max-w-xl mx-auto card-cinematic p-5">
            <TunnelProgress current="leader" variant="compact" />
          </motion.div>
        </div>
      </section>

      {/* IMPACT */}
      <section className="py-10">
        <div className="container-royal grid grid-cols-3 gap-4 max-w-3xl mx-auto">
          {IMPACT.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="text-center">
              <s.icon className="w-5 h-5 text-gold mx-auto mb-2" />
              <div className="font-cinzel font-black text-lg md:text-xl text-cinematic-gold">{s.titre}</div>
              <div className="font-inter text-xs text-pearl/45">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* NIVEAUX */}
      <section className="py-14">
        <div className="container-royal">
          <div className="text-center mb-10">
            <div className="section-label-dark justify-center">Niveaux de partenariat</div>
            <h2 className="font-cinzel font-black text-pearl text-2xl md:text-3xl">Choisissez votre engagement</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 items-start">
            {NIVEAUX.map((n, i) => (
              <motion.div
                key={n.nom}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={n.highlight ? 'card-cinematic-gold p-7 relative md:-translate-y-3' : 'card-cinematic p-7 relative'}
              >
                {n.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-inter text-xs font-bold" style={{ background: '#D4AF37', color: '#1A0F00' }}>
                      <Crown className="w-3 h-3" /> Le plus choisi
                    </span>
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${n.color}1A`, border: `1px solid ${n.color}40` }}>
                  <n.icon className="w-6 h-6" style={{ color: n.color }} />
                </div>
                <h3 className="font-cinzel font-bold text-pearl text-lg mb-2">{n.nom}</h3>
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="font-cinzel font-black text-3xl text-cinematic-gold">{n.prix}</span>
                  {n.detail && <span className="font-inter text-sm text-pearl/40">{n.detail}</span>}
                </div>
                <ul className="space-y-2.5 mb-7">
                  {n.avantages.map((a) => (
                    <li key={a} className="flex items-start gap-2.5 font-inter text-sm text-pearl/65">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(212,175,55,0.18)' }}>
                        <Check className="w-2.5 h-2.5 text-gold" />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
                <Link href={n.href} className={n.highlight ? 'btn-gold-cinematic w-full py-3 text-sm' : 'btn-glass-cinematic w-full py-3 text-sm'}>
                  {n.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT LEADER */}
      <section id="contact-leader" className="py-14 scroll-mt-24">
        <div className="container-royal max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-cinematic p-6 md:p-9">
            <div className="text-center mb-6">
              <div className="section-label-dark justify-center"><Sparkles className="w-3 h-3" /> Parcours leadership</div>
              <h2 className="font-cinzel font-black text-pearl text-2xl">Appelé(e) à diriger ?</h2>
              <p className="font-inter text-sm text-pearl/50 mt-2">Parlez-nous de votre appel : l&apos;équipe leadership vous recontacte pour discerner ensemble.</p>
            </div>
            <TunnelLeadForm
              stage="leader"
              source="partenaires"
              cta="Demander un entretien"
              withPhone
              withMessage
              interets={['Mentorat', 'École de leaders', 'Implanter une cellule', 'Partenariat stratégique']}
              successText="Reçu ! L'équipe leadership vous contacte pour un entretien de discernement."
            />
          </motion.div>
        </div>
      </section>
    </div>
  )
}
