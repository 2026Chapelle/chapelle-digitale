'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronRight, Clock, Users, BookOpen, Award, Lock, Check } from 'lucide-react'
import { FORMATIONS, MODULES_ECOLE_PRIERE } from '@/lib/mock/formations'

const NIVEAU_COLORS: Record<string, string> = {
  'Débutant': '#22C55E',
  'Intermédiaire': '#F59E0B',
  'Avancé': '#EF4444',
}

export default function FormationPublicDetailPage({ params }: { params: { slug: string } }) {
  const formation = FORMATIONS.find((f) => f.slug === params.slug) ?? FORMATIONS[0]
  const modules = formation.slug === 'ecole-de-priere' ? MODULES_ECOLE_PRIERE : MODULES_ECOLE_PRIERE

  const LEARNING_POINTS = [
    `Maîtriser les fondements de ${formation.categorie.toLowerCase()} selon la Bible`,
    'Développer une pratique quotidienne structurée et efficace',
    'Comprendre les principes clés enseignés dans ce parcours',
    'Appliquer les enseignements dans votre vie personnelle et ministérielle',
  ]

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">

        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-sm text-gray-400 font-inter mb-8"
        >
          <Link href="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/formations" className="hover:text-gray-600 transition-colors">Formations</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-600 truncate">{formation.titre}</span>
        </motion.nav>

        {/* Hero — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-16">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="text-[11px] font-poppins font-semibold px-3 py-1 rounded-full"
                style={{ background: `${NIVEAU_COLORS[formation.niveau]}15`, color: NIVEAU_COLORS[formation.niveau] }}
              >
                {formation.niveau}
              </span>
              <span className="text-[11px] font-poppins px-3 py-1 rounded-full bg-gray-100 text-gray-500">
                {formation.categorie}
              </span>
              {formation.certifie && (
                <span className="text-[11px] font-poppins px-3 py-1 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                  <Award className="w-3 h-3" /> Certifiant
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${formation.couleur}15` }}>
                {formation.emoji}
              </div>
              <h1 className="font-cinzel text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {formation.titre}
              </h1>
            </div>

            <p className="text-gray-500 font-inter leading-relaxed mb-6 max-w-2xl">
              {formation.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-inter mb-6">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-gray-400" />
                par <strong className="text-gray-700">{formation.instructeur}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />{formation.duree}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" />{formation.nb_membres} membres inscrits
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {formation.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-inter">
                  #{tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — Enroll card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="bg-white rounded-2xl p-6 shadow-md border border-black/[0.06] sticky top-28">
              <div className="text-5xl text-center mb-4">{formation.emoji}</div>

              <div className="text-center mb-5">
                <p className="font-cinzel text-2xl font-bold text-gray-900 mb-1">
                  {formation.certifie ? 'Premium' : 'Gratuit'}
                </p>
                {formation.certifie && (
                  <p className="text-sm text-gray-400 font-inter">Accès inclus avec Disciple Premium</p>
                )}
              </div>

              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-900 text-white font-inter font-semibold rounded-full text-sm hover:bg-gray-800 transition-all mb-4"
              >
                Commencer cette formation
              </Link>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-inter flex items-center gap-2">
                    <Users className="w-4 h-4" /> Inscrits
                  </span>
                  <span className="font-semibold text-gray-800">{formation.nb_membres}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-inter flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Durée
                  </span>
                  <span className="font-semibold text-gray-800">{formation.duree}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500 font-inter flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Modules
                  </span>
                  <span className="font-semibold text-gray-800">{formation.nb_modules}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* What you'll learn */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-50 rounded-2xl p-8 mb-10"
        >
          <h2 className="font-cinzel text-xl font-bold text-gray-900 mb-5">Ce que vous apprendrez</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LEARNING_POINTS.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: '#92721A' }}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-gray-700 font-inter">{point}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Modules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-10"
        >
          <h2 className="font-cinzel text-xl font-bold text-gray-900 mb-5">Programme ({modules.length} modules)</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {modules.map((module, i) => {
              const isLocked = i > 1
              return (
                <div
                  key={module.id}
                  className={`flex items-center gap-4 p-4 border-b last:border-b-0 border-gray-100 transition-colors ${
                    isLocked ? 'opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isLocked ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold font-inter ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
                      {module.titre}
                    </p>
                    <p className="text-xs text-gray-400 font-inter flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />{module.duree}
                    </p>
                  </div>
                  {!isLocked && (
                    <Link href="/register"
                      className="text-xs font-inter font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                      style={{ color: '#92721A', borderColor: '#92721A33' }}>
                      Accéder
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Instructor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-black/[0.06]"
        >
          <h2 className="font-cinzel text-xl font-bold text-gray-900 mb-5">Votre instructeur</h2>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl flex-shrink-0">
              👤
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-gray-900 text-lg mb-1">{formation.instructeur}</h3>
              <p className="text-sm text-gray-400 font-inter mb-3" style={{ color: '#92721A' }}>
                Instructeur certifié — {formation.categorie}
              </p>
              <p className="text-sm text-gray-500 font-inter leading-relaxed max-w-2xl">
                Passionné par la formation spirituelle et la croissance des croyants,{' '}
                {formation.instructeur} enseigne avec profondeur et pratique. Ses enseignements
                combinent rigueur biblique et application concrète pour transformer vos habitudes spirituelles.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
