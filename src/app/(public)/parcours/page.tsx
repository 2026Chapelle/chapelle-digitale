'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, Eye, Sprout, Users, Send, type LucideIcon } from 'lucide-react'
import { GROWTH_LADDER_FR } from '@/lib/canonical/validation-service'

/**
 * LE PARCOURS DU ROYAUME (page publique).
 *
 * On ne présente PAS une échelle canonique unique « Du Visiteur au Leader » : ce
 * serait fondre appartenance, croissance, pédagogie et ministère. La vision est
 * exprimée en QUATRE MOUVEMENTS, puis — si utile — une frise de CROISSANCE seule.
 * `Pasteur` relève du ministère, jamais de la dernière marche de croissance.
 */

const MOUVEMENTS: {
  cle: string; titre: string; sous: string; desc: string; icon: LucideIcon; color: string
}[] = [
  {
    cle: 'accueillir',
    titre: 'Accueillir',
    sous: 'Visiteur · Contact',
    desc: 'Être touché dès le premier regard et accueilli personnellement — jamais comme un numéro.',
    icon: Eye,
    color: '#0EA5E9',
  },
  {
    cle: 'faire-grandir',
    titre: 'Faire grandir',
    sous: 'Nouveau croyant · Disciple + formations',
    desc: 'Être affermi par la Parole et la formation, poser des fondations solides et porter du fruit.',
    icon: Sprout,
    color: '#D4AF37',
  },
  {
    cle: 'accompagner',
    titre: 'Accompagner',
    sous: 'Intégration · Membre + suivi pastoral',
    desc: 'Trouver sa place, être rattaché à une cellule et cheminer entouré, jamais seul.',
    icon: Users,
    color: '#22C55E',
  },
  {
    cle: 'envoyer',
    titre: 'Envoyer',
    sous: 'Service · responsabilité · ministères',
    desc: 'Mettre ses dons au service du Royaume et être envoyé pour élever les autres à son tour.',
    icon: Send,
    color: '#8B5CF6',
  },
]

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
              Grandir, s&apos;intégrer, servir et <span className="text-cinematic-gold">être envoyé</span>
            </h1>
            <p className="font-inter text-pearl/55 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
              Un chemin pour grandir dans le Royaume. Pas une échelle unique à gravir, mais quatre
              mouvements dans lesquels la Chapelle vous accompagne — personne n&apos;est laissé seul.
            </p>
          </motion.div>
        </div>
      </section>

      {/* LES 4 MOUVEMENTS */}
      <section className="py-8">
        <div className="container-royal">
          <div className="grid gap-5 md:gap-6 md:grid-cols-2">
            {MOUVEMENTS.map((m, i) => (
              <motion.div
                key={m.cle}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.06 }}
                className="card-cinematic p-6 md:p-8 flex items-start gap-5"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${m.color}1A`, border: `1px solid ${m.color}40` }}
                >
                  <m.icon className="w-6 h-6" style={{ color: m.color }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-cinzel font-bold text-pearl text-xl">{m.titre}</h3>
                  <p className="font-inter text-xs font-semibold mb-2" style={{ color: m.color }}>{m.sous}</p>
                  <p className="font-inter text-sm text-pearl/55 leading-relaxed">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FRISE DE CROISSANCE (axe unique — jamais mêlée à l'appartenance ou au ministère) */}
      <section className="py-12">
        <div className="container-royal">
          <div className="card-cinematic p-6 md:p-8">
            <div className="section-label-dark mb-4">Un seul axe : la croissance spirituelle</div>
            <p className="font-inter text-sm text-pearl/50 mb-6 max-w-2xl">
              La croissance se reconnaît, elle ne s&apos;achète pas et ne se déduit pas automatiquement de
              l&apos;activité. Elle est confirmée par les bergers. Le statut communautaire, la formation et
              les ministères sont des axes <span className="text-pearl/75 font-semibold">distincts</span>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {GROWTH_LADDER_FR.map((g, i) => (
                <div key={g.key} className="flex items-center gap-2">
                  <span
                    className="font-inter text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)', color: '#F5E6A7' }}
                  >
                    {g.label}
                  </span>
                  {i < GROWTH_LADDER_FR.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-pearl/25" />}
                </div>
              ))}
            </div>
            <p className="font-inter text-[11px] text-pearl/35 mt-5">
              « Pasteur », « leader de cellule » et « formateur » sont des <span className="text-pearl/60 font-semibold">fonctions / ministères</span>, pas des niveaux de croissance.
            </p>
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
