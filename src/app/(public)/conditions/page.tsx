'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { FileText, ArrowRight } from 'lucide-react'

const SECTIONS = [
  {
    titre: '1. Acceptation des Conditions',
    contenu: `En créant un compte sur la plateforme CIER ou en utilisant nos services, vous acceptez sans réserve les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services. La CIER se réserve le droit de modifier ces conditions à tout moment avec notification préalable par email.`,
  },
  {
    titre: '2. Description des Services',
    contenu: `La plateforme CIER propose : l'accès aux cultes en direct et en replay, des formations théologiques et bibliques, un espace membre personnalisé, un mur de prière communautaire, des ressources spirituelles téléchargeables, et des outils de suivi du parcours spirituel. Ces services sont fournis selon les niveaux d'accès (Visiteur gratuit, Disciple Premium, Partenaire) décrits sur la page "Rejoindre".`,
  },
  {
    titre: '3. Création de Compte',
    contenu: `Vous devez fournir des informations exactes lors de la création de votre compte. Vous êtes responsable de la confidentialité de vos identifiants. Tout accès à votre compte est de votre responsabilité. La CIER se réserve le droit de suspendre ou supprimer tout compte dont les informations sont inexactes ou qui viole ces conditions.`,
  },
  {
    titre: '4. Utilisation Acceptable',
    contenu: `Vous vous engagez à utiliser la plateforme CIER dans le respect de la foi chrétienne, de la dignité humaine et des lois en vigueur. Il est interdit de partager du contenu offensant, blasphématoire, discriminatoire ou contraire à la doctrine de l'Église. Toute tentative d'accès non autorisé, de piratage ou de perturbation des services est prohibée et peut faire l'objet de poursuites.`,
  },
  {
    titre: '5. Propriété Intellectuelle',
    contenu: `Tous les contenus diffusés sur la plateforme CIER (prédications, enseignements, ressources, logos, designs) sont la propriété exclusive de la Chapelle Internationale des Élus du Royaume ou de leurs auteurs respectifs. Tout usage commercial non autorisé est interdit. Le partage à des fins personnelles et non commerciales est autorisé avec mention de la source.`,
  },
  {
    titre: '6. Abonnements et Paiements',
    contenu: `Les abonnements Premium et Partenaire sont facturés mensuellement via Stripe. Vous pouvez annuler à tout moment depuis votre espace membre. Aucun remboursement partiel n'est effectué pour les mois en cours. Les dons sont volontaires et non remboursables sauf erreur de traitement. Les reçus fiscaux sont émis conformément à la législation française.`,
  },
  {
    titre: '7. Limitation de Responsabilité',
    contenu: `La CIER fournit ses services "en l'état" sans garantie de disponibilité continue. Nous ne sommes pas responsables des interruptions techniques, pertes de données ou préjudices indirects découlant de l'utilisation de nos services. La responsabilité totale de la CIER est limitée au montant payé par l'utilisateur au cours des 3 derniers mois.`,
  },
  {
    titre: '8. Droit Applicable',
    contenu: `Ces conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris. Avant tout recours judiciaire, les parties s'engagent à tenter une résolution amiable via contact@cier-chapelle.org. La CIER est soumise au droit des associations cultuelles françaises (loi 1905).`,
  },
]

export default function ConditionsPage() {
  return (
    <div className="min-h-screen bg-abyss">
      {/* Hero */}
      <div className="relative pt-32 pb-12 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-label mb-4">Documents Légaux</div>
            <h1 className="font-cinzel text-3xl md:text-4xl font-black text-pearl mb-3">
              Conditions <span className="text-gradient-gold">d'Utilisation</span>
            </h1>
            <p className="font-inter text-pearl/45 max-w-xl">
              Ces conditions régissent votre utilisation des services numériques de la Chapelle Internationale des Élus du Royaume.
            </p>
            <p className="text-xs text-pearl/25 font-inter mt-3">Dernière mise à jour : 1er janvier 2026 · Applicable depuis le 1er janvier 2026</p>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-12 max-w-3xl">

        {/* Intro card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card-royal mb-8 flex items-start gap-4"
          style={{ borderColor: 'rgba(212,175,55,0.2)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-2">Résumé Simple</h2>
            <p className="font-inter text-xs text-pearl/50 leading-relaxed">
              En utilisant la plateforme CIER, vous vous engagez à respecter la communauté, la Parole de Dieu et les lois en vigueur. Nous protégeons vos données, vous pouvez annuler votre abonnement à tout moment, et nos contenus sont protégés par le droit d'auteur.
            </p>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.titre}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="card-royal"
            >
              <h2 className="font-cinzel text-xs font-bold text-gold mb-3">{section.titre}</h2>
              <p className="font-inter text-xs text-pearl/50 leading-relaxed">{section.contenu}</p>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="font-inter text-xs text-pearl/30 mb-4">Pour toute question concernant ces conditions d'utilisation :</p>
          <a href="mailto:legal@cier-chapelle.org" className="btn-ghost text-sm inline-flex">
            legal@cier-chapelle.org
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs font-inter">
          <Link href="/confidentialite" className="text-pearl/30 hover:text-gold transition-colors">Politique de confidentialité</Link>
          <span className="text-pearl/15">·</span>
          <Link href="/contact" className="text-pearl/30 hover:text-gold transition-colors">Nous contacter</Link>
        </div>
      </div>
    </div>
  )
}
