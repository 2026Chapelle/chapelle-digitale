'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Globe, Users, Heart, BookOpen, Star, Crown, Flame } from 'lucide-react'

const TIMELINE = [
  {
    annee: '1998',
    titre: 'La Vision Reçue',
    desc: 'Le Révérend Docteur reçoit la vision d\'une église ouverte au monde, sans frontières géographiques ni barrières culturelles. La CIER naît dans la prière.',
    emoji: '✨',
    couleur: '#D4AF37',
  },
  {
    annee: '2003',
    titre: 'Premier Culte à Kinshasa',
    desc: 'Le tout premier culte de la Chapelle Internationale réunit 47 fidèles dans un salon à Kinshasa. La flamme est allumée.',
    emoji: '🕯️',
    couleur: '#F97316',
  },
  {
    annee: '2008',
    titre: 'Expansion en Europe',
    desc: 'Ouverture de la première cellule européenne à Paris. La vision transfrontalière devient réalité avec des membres en France, Belgique et Suisse.',
    emoji: '🌍',
    couleur: '#8B5CF6',
  },
  {
    annee: '2012',
    titre: 'Naissance des Plateformes',
    desc: 'Création des 8 plateformes ministérielles : Jeunesse, Femmes, Famille, Formation, Prière — chacune avec sa vision spécifique.',
    emoji: '🏛️',
    couleur: '#22C55E',
  },
  {
    annee: '2018',
    titre: 'L\'Église Digitale',
    desc: 'Lancement des cultes en streaming. La CIER devient pionnière de l\'église digitale francophone, rejoignant des milliers de fidèles dans 30+ pays.',
    emoji: '📡',
    couleur: '#0EA5E9',
  },
  {
    annee: '2024',
    titre: 'Convention des 25 ans',
    desc: 'La grande Convention du 25ème anniversaire réunit 15,000 participants en ligne et en présentiel à Kinshasa. Une étape historique.',
    emoji: '👑',
    couleur: '#EC4899',
  },
  {
    annee: '2026',
    titre: 'La Nouvelle Ère',
    desc: 'Lancement de la plateforme digitale unifiée CIER. 127,000 membres actifs dans 45 pays. Le Royaume s\'étend.',
    emoji: '🚀',
    couleur: '#D4AF37',
  },
]

const VALEURS = [
  { titre: 'Unité', desc: 'Un seul Corps, un seul Esprit, une seule vision mondiale', icon: Users, color: '#D4AF37' },
  { titre: 'Excellence', desc: 'Tout pour la gloire de Dieu, rien au-dessous du meilleur', icon: Crown, color: '#8B5CF6' },
  { titre: 'Amour', desc: 'L\'amour de Dieu comme fondement de tout ministère', icon: Heart, color: '#EC4899' },
  { titre: 'Feu', desc: 'Brûler pour Dieu en toutes circonstances, sans compromis', icon: Flame, color: '#F97316' },
  { titre: 'Formation', desc: 'Équiper les saints pour l\'œuvre du ministère', icon: BookOpen, color: '#22C55E' },
  { titre: 'Expansion', desc: 'Jusqu\'aux extrémités de la terre — sans exception', icon: Globe, color: '#0EA5E9' },
]

const LEADERS = [
  {
    nom: 'Révérend Docteur',
    titre: 'Fondateur & Pasteur Principal',
    desc: 'Visionnaire, prophète des nations, auteur de 12 ouvrages sur le Royaume de Dieu.',
    avatar: '👨‍💼',
    couleur: '#D4AF37',
  },
  {
    nom: 'Pasteure Associée',
    titre: 'Directrice Pastorale',
    desc: 'Leader des Femmes d\'Exceptions, responsable des relations interecclésiales.',
    avatar: '👩‍💼',
    couleur: '#EC4899',
  },
  {
    nom: 'Pasteur en Charge',
    titre: 'Directeur des Formations',
    desc: 'Fondateur du CFIC, formateur de 1,200+ leaders ministériels à travers l\'Afrique.',
    avatar: '👨‍🏫',
    couleur: '#8B5CF6',
  },
  {
    nom: 'Diacre Senior',
    titre: 'Responsable Europe',
    desc: 'Coordinateur des cellules européennes et directeur de la plateforme digitale.',
    avatar: '🧑‍💻',
    couleur: '#0EA5E9',
  },
]

const STATS = [
  { value: '127K+', label: 'Membres actifs', emoji: '👤' },
  { value: '45+', label: 'Pays représentés', emoji: '🌍' },
  { value: '28', label: 'Années de ministère', emoji: '📅' },
  { value: '1.2M', label: 'Vies transformées', emoji: '✨' },
]

export default function NotreHistoirePage() {
  return (
    <div className="min-h-screen bg-abyss">

      {/* Hero cinématique */}
      <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(212,175,55,0.12) 0%, transparent 70%)' }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold/40"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 20}%` }}
            animate={{ y: [-10, 10, -10], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}

        <div className="relative container-royal text-center px-4 py-32">
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <div className="section-label justify-center mb-5">Notre Histoire & Vision</div>
            <h1 className="font-cinzel text-5xl md:text-6xl lg:text-7xl font-black text-pearl mb-6 leading-[0.95]">
              Une Église
              <span className="text-gradient-gold block">Sans Frontières</span>
            </h1>
            <p className="font-cormorant text-xl md:text-2xl text-pearl/60 italic max-w-3xl mx-auto mb-4">
              « Allez, faites de toutes les nations des disciples… »
            </p>
            <p className="font-inter text-xs text-pearl/25 tracking-widest uppercase mb-12">— Matthieu 28:19</p>

            {/* Stats row */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl mb-1">{stat.emoji}</div>
                  <div className="font-cinzel text-3xl font-black text-gradient-gold">{stat.value}</div>
                  <div className="text-xs text-pearl/35 font-inter mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Vision & Mission */}
      <section className="py-20 border-y border-pearl/5">
        <div className="container-royal">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="card-royal"
              style={{ borderColor: 'rgba(212,175,55,0.2)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-gold/15 flex items-center justify-center">
                  <Star className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <div className="text-[10px] text-gold/60 font-inter uppercase tracking-widest">Qui nous sommes</div>
                  <div className="font-cinzel text-sm font-bold text-pearl">Notre Vision</div>
                </div>
              </div>
              <p className="font-inter text-pearl/60 leading-relaxed mb-4">
                La Chapelle Internationale des Élus du Royaume (CIER) est une église mondiale, ancrée dans la Parole de Dieu, ouverte à toutes les nations et toutes les cultures.
              </p>
              <p className="font-inter text-pearl/60 leading-relaxed">
                Nous croyons que l'Église n'a pas de frontières géographiques. Notre vision est de rejoindre chaque croyant là où il se trouve — en Afrique, en Europe, dans les Amériques ou en Asie — pour l'équiper, le fortifier et l'envoyer.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}
              className="card-royal"
              style={{ borderColor: 'rgba(139,92,246,0.2)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-[10px] text-purple-400/60 font-inter uppercase tracking-widest">Ce que nous faisons</div>
                  <div className="font-cinzel text-sm font-bold text-pearl">Notre Mission</div>
                </div>
              </div>
              <p className="font-inter text-pearl/60 leading-relaxed mb-4">
                Notre mission est triple : Évangéliser, Édifier, Envoyer. Nous formons des disciples, équipons des leaders ministériels et envoyons des missionnaires dans toutes les nations.
              </p>
              <p className="font-inter text-pearl/60 leading-relaxed">
                À travers nos 8 plateformes spécialisées, nous couvrons tous les aspects de la vie chrétienne : la famille, la jeunesse, la prière, les femmes, la formation, et l'action sociale.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="container-royal">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="section-label justify-center mb-3">Notre Parcours</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-pearl">
              28 Ans d'Histoire
            </h2>
          </motion.div>

          <div className="relative">
            {/* Central line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.3), transparent)' }} />

            <div className="space-y-10">
              {TIMELINE.map((item, i) => {
                const isRight = i % 2 !== 0
                return (
                  <motion.div
                    key={item.annee}
                    initial={{ opacity: 0, x: isRight ? 24 : -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className={`relative flex items-center gap-6 md:gap-0 ${isRight ? 'md:flex-row-reverse' : 'md:flex-row'} pl-16 md:pl-0`}
                  >
                    {/* Content */}
                    <div className={`flex-1 ${isRight ? 'md:pl-10' : 'md:pr-10 md:text-right'}`}>
                      <div className="card-royal max-w-md" style={{ marginLeft: isRight ? 0 : 'auto', marginRight: isRight ? 'auto' : 0 }}>
                        <div className="flex items-center gap-2 mb-2" style={{ justifyContent: isRight ? 'flex-start' : 'flex-end' }}>
                          <span className="text-lg">{item.emoji}</span>
                          <span className="font-cinzel text-xs font-bold" style={{ color: item.couleur }}>{item.annee}</span>
                        </div>
                        <h3 className="font-cinzel text-sm font-bold text-pearl mb-2">{item.titre}</h3>
                        <p className="font-inter text-xs text-pearl/50 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                    {/* Dot */}
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-current z-10 flex-shrink-0"
                      style={{ borderColor: item.couleur, background: `${item.couleur}30` }} />

                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="py-20 border-y border-pearl/5">
        <div className="container-royal">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="section-label justify-center mb-3">Ce en Quoi Nous Croyons</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-pearl">Nos Valeurs Fondamentales</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {VALEURS.map((v, i) => (
              <motion.div
                key={v.titre}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="card-royal text-center group hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${v.color}15` }}>
                  <v.icon className="w-5 h-5" style={{ color: v.color }} />
                </div>
                <h3 className="font-cinzel text-sm font-bold text-pearl mb-2">{v.titre}</h3>
                <p className="font-inter text-xs text-pearl/45 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section id="leadership" className="py-20 scroll-mt-24">
        <div className="container-royal">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="section-label justify-center mb-3">Ceux Qui Nous Guident</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-pearl">Notre Leadership</h2>
            <p className="text-pearl/40 font-inter mt-3 max-w-xl mx-auto">
              Des serviteurs de Dieu passionnés, formés pour guider le troupeau avec sagesse, intégrité et amour.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {LEADERS.map((leader, i) => (
              <motion.div
                key={leader.nom}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="card-royal text-center"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
                  style={{ background: `${leader.couleur}15`, border: `2px solid ${leader.couleur}20` }}>
                  {leader.avatar}
                </div>
                <h3 className="font-cinzel text-xs font-bold text-pearl mb-1">{leader.nom}</h3>
                <div className="text-[10px] font-inter mb-3" style={{ color: leader.couleur }}>{leader.titre}</div>
                <p className="font-inter text-[11px] text-pearl/40 leading-relaxed">{leader.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-pearl/5">
        <div className="container-royal text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-4xl mb-5">🙏</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-pearl mb-4">
              Faites Partie de <span className="text-gradient-gold">l'Histoire</span>
            </h2>
            <p className="font-inter text-pearl/50 mb-8 max-w-xl mx-auto">
              L'histoire de la CIER est écrite par chaque membre, chaque famille, chaque nation rejointe.
              Rejoignez-nous et devenez un chapitre de cette aventure avec Dieu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/rejoindre" className="btn-gold px-8 py-4 text-base">
                Rejoindre la Chapelle
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="btn-ghost px-8 py-4 text-base">
                Nous Contacter
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
