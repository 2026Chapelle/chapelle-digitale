'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Clock, Users, Award, Play, CheckCircle, Lock, ChevronRight, BookOpen, GraduationCap } from 'lucide-react'
import { FORMATIONS, MODULES_ECOLE_PRIERE } from '@/lib/mock/formations'

export default function FormationDetailPage({ params }: { params: { slug: string } }) {
  const formation = FORMATIONS.find((f) => f.slug === params.slug) ?? FORMATIONS[0]
  const modules = formation.slug === 'ecole-de-priere' ? MODULES_ECOLE_PRIERE : MODULES_ECOLE_PRIERE
  const done = modules.filter((m) => m.termine).length
  const progress = formation.progression ?? Math.round((done / modules.length) * 100)

  const currentModule = modules.find((m) => (m as { actuel?: boolean }).actuel)
  const hasStarted = (formation.statut === 'en_cours' || formation.statut === 'terminé')

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Link href="/member/dashboard/formations"
            className="inline-flex items-center gap-2 text-pearl/50 hover:text-pearl text-sm font-inter transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour aux formations
          </Link>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-8 mb-8"
          style={{ background: 'linear-gradient(135deg, #0a0018 0%, #1a0033 50%, #0a000f 100%)' }}
        >
          <div className="absolute top-0 right-0 w-[400px] h-[300px] opacity-20 blur-[80px]"
            style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
          <div className="absolute inset-0 border border-gold/15 rounded-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: `${formation.couleur}20` }}>
              {formation.emoji}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge-gold">{formation.categorie}</span>
                <span className="badge-royal">{formation.niveau}</span>
                {formation.certifie && <span className="badge-gold">Certifiant</span>}
              </div>
              <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-pearl mb-2">{formation.titre}</h1>
              <p className="text-pearl/60 font-inter text-sm leading-relaxed mb-4 max-w-2xl">{formation.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-pearl/50 font-inter">
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />par {formation.instructeur}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formation.duree}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{formation.nb_membres} membres</span>
              </div>
            </div>

            {/* Progress circle + CTA */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke={formation.couleur} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-cinzel font-black text-gold text-xl leading-none">{progress}%</span>
                  <span className="text-pearl/30 text-[10px]">complété</span>
                </div>
              </div>
              <button className="btn-gold flex items-center gap-2 whitespace-nowrap">
                <Play className="w-4 h-4" />
                {hasStarted ? 'Reprendre' : 'Commencer'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — modules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5">Modules du programme</h2>
              <div className="space-y-3">
                {modules.map((module, i) => {
                  const mod = module as typeof module & { actuel?: boolean }
                  return (
                    <div key={module.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                        mod.actuel
                          ? 'border-gold/30 bg-gold/5'
                          : module.termine
                          ? 'border-pearl/5 bg-pearl/[0.02]'
                          : 'border-pearl/5 bg-transparent opacity-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        module.termine ? 'bg-green-500/20 text-green-400'
                        : mod.actuel ? 'bg-gold/20 text-gold'
                        : 'bg-pearl/5 text-pearl/30'
                      }`}>
                        {module.termine ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold font-inter ${
                            module.termine ? 'text-pearl/60' : mod.actuel ? 'text-pearl' : 'text-pearl/30'
                          }`}>{module.titre}</p>
                          {mod.actuel && <span className="badge-gold text-[9px]">En cours</span>}
                        </div>
                        <p className="text-xs text-pearl/30 font-inter mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{module.duree}
                        </p>
                      </div>
                      {mod.actuel ? (
                        <button className="btn-gold text-xs px-3 py-1.5 flex items-center gap-1">
                          <Play className="w-3 h-3" /> Continuer
                        </button>
                      ) : module.termine ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-pearl/20 flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Right — sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-5"
          >
            {/* Stats */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-4">Statistiques</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-pearl/50 font-inter">Modules complétés</span>
                  <span className="font-cinzel font-bold text-gold">{done}/{modules.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-pearl/50 font-inter">Durée totale</span>
                  <span className="font-cinzel font-bold text-pearl">{formation.duree}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-pearl/50 font-inter">Niveau</span>
                  <span className="badge-royal">{formation.niveau}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-pearl/50 font-inter">Inscrits</span>
                  <span className="font-cinzel font-bold text-pearl">{formation.nb_membres}</span>
                </div>
              </div>
            </div>

            {/* Instructor */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-4">Instructeur</h3>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-cinzel font-black text-sm tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, #4B0082, #D4AF37)',
                    color: '#FFFFFF',
                    boxShadow: '0 6px 16px rgba(75,0,130,0.3), 0 0 0 1px rgba(212,175,55,0.25) inset',
                  }}
                  aria-hidden
                >
                  {formation.instructeur.split(' ').map(p => p[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <p className="font-semibold text-pearl text-sm">{formation.instructeur}</p>
                  <p className="text-xs text-pearl/40 font-inter">Instructeur certifié</p>
                </div>
              </div>
              <p className="text-xs text-pearl/40 font-inter leading-relaxed">
                Expert en {formation.categorie.toLowerCase()}, passionné par la transmission du savoir spirituel.
              </p>
            </div>

            {/* Certificate */}
            {progress === 100 && (
              <div className="card-royal border-gold/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent" />
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                    style={{
                      background: 'rgba(212,175,55,0.18)',
                      border: '1px solid rgba(212,175,55,0.4)',
                      boxShadow: '0 8px 24px rgba(212,175,55,0.18)',
                    }}
                  >
                    <GraduationCap className="w-6 h-6" style={{ color: '#D4AF37' }} />
                  </div>
                  <h3 className="font-cinzel text-base font-bold text-gold mb-2">Certificat disponible</h3>
                  <p className="text-xs text-pearl/50 font-inter mb-4 leading-relaxed">
                    Félicitations ! Vous avez complété cette formation avec succès.
                  </p>
                  <button className="btn-gold text-xs w-full flex items-center justify-center gap-2">
                    <Award className="w-3.5 h-3.5" />
                    Télécharger le certificat
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
