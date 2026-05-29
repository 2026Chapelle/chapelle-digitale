'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, Users, BookOpen, Heart, Play, Calendar,
  Star, Globe, CheckCircle, ChevronRight
} from 'lucide-react'
import type { Plateforme } from '@/types'

const FEATURES_MAP: Record<string, string[]> = {
  cier: ['Cultes en direct chaque dimanche', 'Enseignements bibliques profonds', 'Communauté internationale', 'Lives & replays illimités', 'Prière 24/7', 'Formations certifiantes'],
  jeunesse: ['Worship contemporain & créatif', 'Formations pour jeunes leaders', 'Challenges spirituels', 'Groupes de prière jeunesse', 'Camps & retraites', 'Coaching identité'],
  'chapelle-familiale': ['Séminaires pour couples', 'Éducation des enfants chrétiens', 'Conseil conjugal biblique', 'Lives familles', 'Parcours mariage', 'Soutien aux parents'],
  'femmes-exceptions': ['Leadership au féminin', 'Identité & estime de soi', 'Ministère des femmes', 'Masterclass exclusives', 'Réseau mondial féminin', 'Événements VIP'],
  'cite-refuge': ['Accompagnement pastoral', 'Guérison intérieure', 'Groupe de soutien', 'Sessions individuelles', 'Programme de restauration', 'Ressources thérapeutiques'],
  cfic: ['Cours théologiques certifiants', 'Formation ministérielle', 'Biblique avancé', 'Homilétique & prédication', 'Leadership spirituel', 'Certification reconnue'],
  mahanaim: ['Veillées de prière 24/7', 'Intercession pour les nations', 'École de prière avancée', 'Guerre spirituelle', 'Prophétie & discernement', 'Retraites intercession'],
  'familles-chapelle': ['Cellules de croissance', 'Groupes de vie intimes', 'Évangélisation locale', 'Soutien communautaire', 'Fêtes de familles', 'Leaders de cellule formés'],
}

const STATS_MAP: Record<string, { value: string; label: string }[]> = {
  cier: [{ value: '4 127', label: 'Membres' }, { value: '86', label: 'Pays' }, { value: '52', label: 'Lives/an' }, { value: '98%', label: 'Satisfaction' }],
  jeunesse: [{ value: '892', label: 'Jeunes' }, { value: '34', label: 'Pays' }, { value: '24', label: 'Lives/an' }, { value: '96%', label: 'Satisfaction' }],
  'chapelle-familiale': [{ value: '524', label: 'Familles' }, { value: '28', label: 'Pays' }, { value: '18', label: 'Lives/an' }, { value: '97%', label: 'Satisfaction' }],
  'femmes-exceptions': [{ value: '743', label: 'Femmes' }, { value: '42', label: 'Pays' }, { value: '20', label: 'Lives/an' }, { value: '99%', label: 'Satisfaction' }],
  'cite-refuge': [{ value: '312', label: 'Accompagnés' }, { value: '18', label: 'Pays' }, { value: '12', label: 'Lives/an' }, { value: '94%', label: 'Satisfaction' }],
  cfic: [{ value: '1 240', label: 'Étudiants' }, { value: '56', label: 'Pays' }, { value: '48', label: 'Cours' }, { value: '92%', label: 'Diplômés' }],
  mahanaim: [{ value: '248', label: 'Intercesseurs' }, { value: '32', label: 'Pays' }, { value: '365', label: 'Jours/an' }, { value: '100%', label: 'Dévoués' }],
  'familles-chapelle': [{ value: '567', label: 'Membres cellules' }, { value: '24', label: 'Pays' }, { value: '89', label: 'Cellules' }, { value: '95%', label: 'Satisfaction' }],
}

const TESTIMONIALS_MAP: Record<string, { nom: string; pays: string; drapeau: string; texte: string }[]> = {
  cier: [
    { nom: 'Amina K.', pays: 'Côte d\'Ivoire', drapeau: '🇨🇮', texte: 'CIER a transformé ma vie spirituelle. Je n\'aurais jamais cru trouver une communauté aussi puissante en ligne.' },
    { nom: 'David M.', pays: 'RDC', drapeau: '🇨🇩', texte: 'Chaque culte du dimanche est une rencontre réelle avec Dieu. La présence de l\'Esprit est tangible.' },
  ],
  jeunesse: [
    { nom: 'Ezra P.', pays: 'France', drapeau: '🇫🇷', texte: 'J\'ai trouvé mon identité en Christ grâce au ministère Jeunesse. La communauté est incroyable.' },
    { nom: 'Faith A.', pays: 'Ghana', drapeau: '🇬🇭', texte: 'Les lives Jeunesse sont feu ! Worship + Parole = transformation totale.' },
  ],
  'femmes-exceptions': [
    { nom: 'Sarah D.', pays: 'Belgique', drapeau: '🇧🇪', texte: 'Le ministère Femmes d\'Exceptions m\'a aidée à redécouvrir qui je suis en Dieu. Quelle puissance !' },
    { nom: 'Grace N.', pays: 'Cameroun', drapeau: '🇨🇲', texte: 'Les masterclasses exclusives sont d\'une richesse incroyable. Je recommande à toute femme de foi.' },
  ],
}

const DEFAULT_TESTIMONIALS = [
  { nom: 'Marie C.', pays: 'France', drapeau: '🇫🇷', texte: 'Ce ministère a complètement changé ma perspective spirituelle. Je recommande à tous.' },
  { nom: 'Samuel K.', pays: 'Sénégal', drapeau: '🇸🇳', texte: 'Une communauté authentique, des enseignements profonds, un accompagnement bienveillant.' },
]

export default function PlateformePage({ plateforme }: { plateforme: Plateforme }) {
  const features = FEATURES_MAP[plateforme.id] || FEATURES_MAP.cier
  const stats = STATS_MAP[plateforme.id] || STATS_MAP.cier
  const testimonials = TESTIMONIALS_MAP[plateforme.id] || DEFAULT_TESTIMONIALS
  const color = plateforme.couleur_primaire

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F3' }}>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 px-4"
        style={{ background: `linear-gradient(135deg, ${color}08 0%, #F5F5F3 40%, white 100%)` }}>
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-10 blur-[80px]"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />

        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm font-inter text-gray-400 mb-8">
              <Link href="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span style={{ color }}>Plateformes</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-600">{plateforme.nom}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-8 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)`, border: `2px solid ${color}30` }}
                >
                  {plateforme.icone}
                </motion.div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                  <span className="text-xs font-bold font-inter uppercase tracking-wider" style={{ color }}>Plateforme Active</span>
                </div>

                <h1 className="font-cinzel text-4xl md:text-5xl font-black mb-4 leading-tight"
                  style={{ color: '#111827' }}>
                  {plateforme.nom}
                </h1>
                <p className="text-lg font-cormorant italic mb-6"
                  style={{ color }}>
                  "{plateforme.slogan}"
                </p>
                <p className="text-gray-600 font-inter leading-relaxed text-base mb-8 max-w-lg">
                  {plateforme.description}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-inter font-semibold text-sm transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                      color: 'white',
                      boxShadow: `0 4px 20px ${color}40`,
                    }}>
                    Rejoindre ce ministère
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/live"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-inter font-medium text-sm transition-all duration-300 bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md">
                    <Play className="w-4 h-4" />
                    Voir un live
                  </Link>
                </div>
              </div>

              {/* Stats grid */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="grid grid-cols-2 gap-4"
              >
                {stats.map((s, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="card-elevated p-6 text-center"
                  >
                    <div className="font-cinzel text-3xl md:text-4xl font-black mb-1"
                      style={{ color }}>
                      {s.value}
                    </div>
                    <div className="text-sm text-gray-500 font-inter">{s.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="section-label-light justify-center mb-4">Ce que nous offrons</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Tout pour votre croissance spirituelle
            </h2>
            <p className="text-gray-500 font-inter max-w-2xl mx-auto">
              Le ministère {plateforme.nom} vous accompagne avec des ressources, des formations et une communauté dédiée.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-3 p-5 card-light"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}15` }}>
                  <CheckCircle className="w-4 h-4" style={{ color }} />
                </div>
                <p className="font-inter text-sm font-medium text-gray-700 leading-relaxed">{feat}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4" style={{ background: '#F5F5F3' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="section-label-light justify-center mb-4">Témoignages</div>
            <h2 className="font-cinzel text-3xl font-black text-gray-900">Ils ont rejoint {plateforme.nom}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="card-elevated p-8 relative"
              >
                <div className="absolute top-6 right-6 text-5xl opacity-10">"</div>
                <div className="flex mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4" style={{ color }} fill={color} />
                  ))}
                </div>
                <p className="font-cormorant italic text-lg text-gray-700 leading-relaxed mb-5">
                  "{t.texte}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white font-cinzel"
                    style={{ background: color }}>
                    {t.nom[0]}
                  </div>
                  <div>
                    <p className="font-inter text-sm font-semibold text-gray-800">{t.nom}</p>
                    <p className="font-inter text-xs text-gray-500">{t.drapeau} {t.pays}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
              border: `1px solid ${color}25`,
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] blur-[60px] opacity-20"
              style={{ background: `radial-gradient(ellipse, ${color}, transparent 70%)` }} />
            <div className="relative z-10">
              <div className="text-5xl mb-6">{plateforme.icone}</div>
              <h2 className="font-cinzel text-3xl md:text-4xl font-black text-gray-900 mb-4">
                Rejoignez {plateforme.nom} dès aujourd'hui
              </h2>
              <p className="text-gray-500 font-inter max-w-lg mx-auto mb-8">
                Faites partie d'une communauté mondiale de croyants qui grandissent ensemble dans la foi.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-inter font-semibold text-base transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                    color: 'white',
                    boxShadow: `0 4px 24px ${color}40`,
                  }}>
                  Créer mon compte gratuit
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/live"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-inter font-medium text-sm bg-white border border-gray-200 text-gray-700 hover:shadow-md transition-all">
                  <Globe className="w-4 h-4" />
                  Explorer d'abord
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
