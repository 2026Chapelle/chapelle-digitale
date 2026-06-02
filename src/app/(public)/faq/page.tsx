'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, MessageCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const FAQ_CATEGORIES = [
  {
    id: 'adhesion',
    label: 'Adhésion & Inscription',
    emoji: '✝️',
    color: '#D4AF37',
    questions: [
      {
        q: 'Comment rejoindre la Chapelle Internationale des Élus du Royaume ?',
        a: 'Pour rejoindre la CIER, cliquez sur « Rejoindre la Chapelle » depuis notre page d\'accueil. Remplissez le formulaire d\'inscription, participez au culte d\'accueil en ligne, et un berger prendra contact avec vous sous 48h pour votre intégration.',
      },
      {
        q: 'L\'adhésion à la CIER est-elle payante ?',
        a: 'Non. L\'adhésion à la CIER est entièrement gratuite. L\'accès aux cultes, aux formations de base et aux prières est offert à tous. Certaines formations avancées ou contenus premium peuvent être accessibles via un abonnement optionnel.',
      },
      {
        q: 'Peut-on être membre de la CIER et d\'une autre église locale ?',
        a: 'Oui, absolument. La CIER est une église digitale conçue pour compléter votre vie d\'église locale, pas pour la remplacer. Nous vous encourageons à rester fidèles à votre assemblée locale tout en bénéficiant des ressources de la CIER.',
      },
      {
        q: 'Y a-t-il une condition pour rejoindre la CIER ?',
        a: 'La seule condition est d\'être croyant en Jésus-Christ et de partager notre vision d\'une église globale au service du Royaume. Nous accueillons des croyants de tous horizons, de toutes dénominations et de tous pays.',
      },
    ],
  },
  {
    id: 'live',
    label: 'Cultes & Lives',
    emoji: '📡',
    color: '#EF4444',
    questions: [
      {
        q: 'À quels horaires ont lieu les cultes en direct ?',
        a: 'Le culte principal a lieu chaque dimanche à 10h00 CET (heure de Paris). Une soirée de prière se tient chaque mercredi à 21h CET. Des réunions spéciales sont organisées selon les saisons ministérielles.',
      },
      {
        q: 'Comment accéder aux cultes en direct ?',
        a: 'Les cultes en direct sont accessibles depuis la page « Live & Cultes » de notre site, notre chaîne YouTube, et notre groupe Facebook. Pour les membres, l\'espace membre offre une expérience enrichie avec chat, archives et contenus exclusifs.',
      },
      {
        q: 'Les replays des cultes sont-ils disponibles ?',
        a: 'Oui. Tous les cultes sont archivés et accessibles en replay. Pour les membres, l\'accès aux archives complètes est disponible depuis l\'espace membre sous « Mes Lives ». Sur YouTube, les 90 derniers jours sont disponibles gratuitement.',
      },
      {
        q: 'La CIER organise-t-elle des événements en présentiel ?',
        a: 'Oui. La CIER organise une Convention Annuelle, des camps de jeunesse, des conférences thématiques et des retraites spirituelles. Ces événements se tiennent principalement à Kinshasa, Paris et Montréal, avec une diffusion en direct pour les membres à distance.',
      },
    ],
  },
  {
    id: 'formations',
    label: 'Formations & Enseignements',
    emoji: '📖',
    color: '#8B5CF6',
    questions: [
      {
        q: 'Quelles formations sont disponibles sur la CIER ?',
        a: 'La CIER propose des formations en théologie de base, leadership ministériel, prière et intercession, vie de famille, évangélisation et missions. Le CFIC (Centre de Formation et d\'Institut Chrétien) offre des cursus structurés avec certification.',
      },
      {
        q: 'Les formations sont-elles diplômantes ?',
        a: 'Le CFIC délivre des certificats et des diplômes reconnus par notre réseau d\'institutions partenaires. Les formations spirituelles courtes donnent lieu à des attestations de completion disponibles depuis votre espace membre.',
      },
      {
        q: 'Peut-on suivre les formations à son rythme ?',
        a: 'Absolument. Toutes nos formations sont en format e-learning, accessibles 24h/24 depuis n\'importe quel appareil. Vous progressez à votre propre rythme, sans contrainte de temps.',
      },
    ],
  },
  {
    id: 'priere',
    label: 'Prière & Soutien Pastoral',
    emoji: '🙏',
    color: '#EC4899',
    questions: [
      {
        q: 'Comment soumettre une demande de prière ?',
        a: 'Rendez-vous sur la page « Mur de Prière » et soumettez votre requête. Notre équipe d\'intercesseurs Mahanaïm reçoit chaque demande et prie pour vous. Vous recevrez une notification quand d\'autres membres prient pour votre requête.',
      },
      {
        q: 'Y a-t-il un soutien pastoral disponible ?',
        a: 'Oui. Les membres peuvent demander un entretien pastoral via leur espace membre. Notre équipe de bergers répond sous 48-72h pour organiser un rendez-vous (visio, téléphone, ou en présentiel selon la localisation).',
      },
      {
        q: 'Les demandes de prière sont-elles confidentielles ?',
        a: 'Oui. Vous pouvez choisir de soumettre une demande publique (visible par la communauté) ou privée (uniquement pour l\'équipe d\'intercesseurs). Vos informations personnelles ne sont jamais partagées.',
      },
    ],
  },
  {
    id: 'dons',
    label: 'Dons & Finances',
    emoji: '💛',
    color: '#22C55E',
    questions: [
      {
        q: 'Comment effectuer un don à la CIER ?',
        a: 'Depuis la page « Soutenir l’œuvre », vous pouvez choisir le type de soutien (offrande, partenariat, don libre, accès au parcours). Les paiements sont traités par notre prestataire de paiement sécurisé. Nous ne stockons aucune donnée bancaire.',
      },
      {
        q: 'Les dons sont-ils déductibles des impôts ?',
        a: 'En France, les dons à une association cultuelle sont déductibles à hauteur de 66% dans la limite de 20% de votre revenu imposable. Un reçu fiscal est automatiquement envoyé par email après chaque don. Pour les autres pays, nous vous invitons à consulter votre législation locale.',
      },
      {
        q: 'Comment les fonds sont-ils utilisés ?',
        a: 'La CIER publie un rapport annuel de transparence financière. Les fonds sont alloués aux opérations d\'église (40%), aux missions (30%), à la formation (20%) et à l\'action sociale (10%). Les comptes sont audités annuellement par un cabinet indépendant.',
      },
    ],
  },
  {
    id: 'technique',
    label: 'Espace Membre & Technique',
    emoji: '💻',
    color: '#0EA5E9',
    questions: [
      {
        q: 'J\'ai oublié mon mot de passe, comment le récupérer ?',
        a: 'Depuis la page de connexion, cliquez sur « Mot de passe oublié » et entrez votre email. Vous recevrez un lien de réinitialisation sous quelques minutes. Vérifiez vos spams si vous ne le recevez pas.',
      },
      {
        q: 'L\'application CIER est-elle disponible sur mobile ?',
        a: 'Notre site est entièrement optimisé pour mobile avec une Progressive Web App (PWA). Sur iOS, ajoutez le site à votre écran d\'accueil depuis Safari pour une expérience native. Une application Android et iOS est prévue pour fin 2026.',
      },
      {
        q: 'Comment signaler un problème technique ?',
        a: 'Contactez notre équipe support via la page Contact en sélectionnant « Support technique », ou écrivez à support@chapelleduroyaume.org. Notre équipe répond sous 24h ouvrées.',
      },
    ],
  },
]

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const toggle = (key: string) => setOpenItem(prev => prev === key ? null : key)

  const filteredCategories = FAQ_CATEGORIES.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q =>
      !searchQuery ||
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat =>
    (activeCategory === 'all' || cat.id === activeCategory) &&
    cat.questions.length > 0
  )

  const totalResults = filteredCategories.reduce((acc, c) => acc + c.questions.length, 0)

  return (
    <div className="min-h-screen bg-abyss">

      {/* Hero */}
      <div className="relative pt-32 pb-16 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="section-label justify-center mb-4">Centre d'aide</div>
            <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
              Questions
              <span className="text-gradient-gold"> Fréquentes</span>
            </h1>
            <p className="font-inter text-pearl/50 max-w-xl mx-auto mb-8">
              Trouvez des réponses aux questions les plus posées sur la CIER, nos services et notre communauté.
            </p>

            {/* Search */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher une question…"
                className="input-royal pl-11 w-full"
              />
              {searchQuery && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-pearl/30 font-inter">
                  {totalResults} résultat{totalResults !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-12">

        {/* Category tabs */}
        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-10 justify-center"
          >
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-gold text-black'
                  : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10'
              }`}
            >
              Toutes les questions
            </button>
            {FAQ_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all"
                style={{
                  background: activeCategory === cat.id ? `${cat.color}18` : 'rgba(255,255,255,0.04)',
                  color: activeCategory === cat.id ? cat.color : 'rgba(255,255,255,0.45)',
                  border: `1px solid ${activeCategory === cat.id ? `${cat.color}30` : 'transparent'}`,
                }}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* FAQ list */}
        <div className="max-w-3xl mx-auto space-y-8">
          {filteredCategories.map((cat, ci) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.05 }}
            >
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ background: `${cat.color}15` }}>
                  {cat.emoji}
                </div>
                <h2 className="font-cinzel text-sm font-bold text-pearl">{cat.label}</h2>
                <div className="flex-1 h-px" style={{ background: `${cat.color}15` }} />
              </div>

              <div className="space-y-2">
                {cat.questions.map((item, qi) => {
                  const key = `${cat.id}-${qi}`
                  const isOpen = openItem === key
                  return (
                    <motion.div
                      key={key}
                      className="rounded-2xl border overflow-hidden transition-all"
                      style={{
                        borderColor: isOpen ? `${cat.color}25` : 'rgba(255,255,255,0.06)',
                        background: isOpen ? `${cat.color}06` : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-start gap-4 px-5 py-4 text-left"
                      >
                        <span className="flex-1 font-inter text-sm font-semibold text-pearl leading-relaxed pr-2">
                          {item.q}
                        </span>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex-shrink-0 mt-0.5"
                          style={{ color: isOpen ? cat.color : 'rgba(255,255,255,0.25)' }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 border-t border-pearl/5">
                              <p className="font-inter text-sm text-pearl/55 leading-relaxed pt-4">
                                {item.a}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-16 card-royal">
              <div className="text-4xl mb-4">🔍</div>
              <p className="font-cinzel text-lg text-pearl/50 mb-2">Aucune question trouvée</p>
              <p className="font-inter text-sm text-pearl/30">Essayez d'autres mots-clés ou contactez-nous directement</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center card-royal max-w-2xl mx-auto"
          style={{ borderColor: 'rgba(212,175,55,0.15)' }}
        >
          <MessageCircle className="w-10 h-10 text-gold mx-auto mb-4" />
          <h2 className="font-cinzel text-xl font-bold text-pearl mb-3">Vous n'avez pas trouvé votre réponse ?</h2>
          <p className="font-inter text-pearl/45 mb-6 max-w-sm mx-auto">
            Notre équipe est disponible pour répondre à toutes vos questions personnellement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="btn-gold px-6 py-3">
              Nous Contacter
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/priere" className="btn-ghost px-6 py-3">
              Demander la Prière
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
