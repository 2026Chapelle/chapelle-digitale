'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Shield, Mail, Lock, Eye, Trash2, ArrowRight } from 'lucide-react'

const SECTIONS = [
  {
    id: 'collecte',
    icon: Eye,
    titre: 'Données Collectées',
    color: '#0EA5E9',
    contenu: [
      'Informations d\'identification : prénom, nom, adresse email, pays de résidence',
      'Données de profil spirituel : plateforme choisie, étape du parcours disciple, formations suivies',
      'Données d\'usage : pages visitées, temps de connexion, contenus consultés',
      'Données de paiement : traitées exclusivement par Stripe — nous ne stockons aucune donnée bancaire',
      'Communications : requêtes de prière, messages au support pastoral, témoignages soumis',
    ],
  },
  {
    id: 'utilisation',
    icon: Shield,
    titre: 'Utilisation des Données',
    color: '#D4AF37',
    contenu: [
      'Fourniture et amélioration des services CIER (espace membre, formations, lives)',
      'Personnalisation de votre parcours spirituel et recommandations de formations',
      'Communication sur les événements, cultes et ressources disponibles',
      'Envoi de la newsletter hebdomadaire (désinscription possible à tout moment)',
      'Émission de reçus fiscaux pour les dons effectués',
      'Amélioration de nos services via des analyses anonymisées',
    ],
  },
  {
    id: 'partage',
    icon: Lock,
    titre: 'Partage et Conservation',
    color: '#8B5CF6',
    contenu: [
      'Vos données personnelles ne sont jamais vendues à des tiers',
      'Partenaires techniques uniquement : Stripe (paiements), Supabase (hébergement), Vercel (infrastructure)',
      'Les requêtes de prière confidentielles ne sont accessibles qu\'à l\'équipe d\'intercesseurs',
      'Vos données sont conservées pendant la durée de votre compte + 3 ans après désactivation',
      'Les données de paiement sont conservées 10 ans conformément aux obligations légales françaises',
    ],
  },
  {
    id: 'droits',
    icon: Mail,
    titre: 'Vos Droits (RGPD)',
    color: '#22C55E',
    contenu: [
      'Droit d\'accès : obtenez une copie complète de vos données personnelles',
      'Droit de rectification : corrigez toute information inexacte',
      'Droit à l\'effacement : demandez la suppression de votre compte et données',
      'Droit à la portabilité : exportez vos données dans un format structuré',
      'Droit d\'opposition : refusez certains traitements (marketing, profilage)',
      'Pour exercer vos droits : privacy@cier-chapelle.org — réponse sous 30 jours',
    ],
  },
  {
    id: 'cookies',
    icon: Trash2,
    titre: 'Cookies',
    color: '#F97316',
    contenu: [
      'Cookies essentiels : nécessaires au fonctionnement de la plateforme (session, authentification)',
      'Cookies analytiques : Google Analytics anonymisé pour comprendre l\'usage de la plateforme',
      'Aucun cookie publicitaire ou de tracking tiers n\'est utilisé',
      'Vous pouvez configurer votre navigateur pour refuser les cookies non essentiels',
    ],
  },
]

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-abyss">
      {/* Hero */}
      <div className="relative pt-32 pb-12 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-label mb-4">Documents Légaux</div>
            <h1 className="font-cinzel text-3xl md:text-4xl font-black text-pearl mb-3">
              Politique de <span className="text-gradient-gold">Confidentialité</span>
            </h1>
            <p className="font-inter text-pearl/45 max-w-xl">
              La CIER s'engage à protéger vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
            <p className="text-xs text-pearl/25 font-inter mt-3">Dernière mise à jour : 1er janvier 2026</p>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-12 max-w-3xl">

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card-royal mb-8"
          style={{ borderColor: 'rgba(212,175,55,0.2)' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="font-cinzel text-sm font-bold text-pearl mb-2">Responsable du Traitement</h2>
              <p className="font-inter text-xs text-pearl/50 leading-relaxed">
                La Chapelle Internationale des Élus du Royaume (CIER), association loi 1901, dont le siège est situé au 14 Rue du Faubourg Saint-Antoine, 75011 Paris, France. SIRET : 123 456 789 00012. Contact DPO : privacy@cier-chapelle.org
              </p>
            </div>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-5">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="card-royal scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${section.color}15` }}>
                  <section.icon className="w-4 h-4" style={{ color: section.color }} />
                </div>
                <h2 className="font-cinzel text-sm font-bold text-pearl">{section.titre}</h2>
              </div>
              <ul className="space-y-2">
                {section.contenu.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: section.color }} />
                    <span className="font-inter text-xs text-pearl/50 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="mt-8 card-royal text-center"
        >
          <p className="font-inter text-sm text-pearl/50 mb-4">
            Pour toute question relative à vos données personnelles ou pour exercer vos droits, contactez notre Délégué à la Protection des Données.
          </p>
          <a href="mailto:privacy@cier-chapelle.org"
            className="btn-ghost text-sm inline-flex">
            privacy@cier-chapelle.org
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs font-inter">
          <Link href="/conditions" className="text-pearl/30 hover:text-gold transition-colors">Conditions d'utilisation</Link>
          <span className="text-pearl/15">·</span>
          <Link href="/contact" className="text-pearl/30 hover:text-gold transition-colors">Nous contacter</Link>
        </div>
      </div>
    </div>
  )
}
