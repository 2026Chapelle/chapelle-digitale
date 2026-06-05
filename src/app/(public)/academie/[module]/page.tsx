'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Download, Play, Lock, Check, ArrowRight, FileText, Target,
  Sparkles, ListChecks, RotateCcw,
} from 'lucide-react'
import { getModuleBySlug, getLevelModules, getNextModule } from '@/lib/academie/student'
import { useAcademyProgress } from '@/components/academie/useAcademyProgress'
import { KingdomBadge } from '@/components/academie/KingdomBadge'
import { useAuth } from '@/components/providers/AuthProvider'

const N1 = 'acad-fondements'

/** Extrait l'ID d'une URL YouTube (watch, youtu.be, embed). */
function ytId(url?: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function AcademieModulePage({ params }: { params: { module: string } }) {
  const mod = useMemo(() => getModuleBySlug(params.module), [params.module])
  const { loading: authLoading } = useAuth()
  const [integrationComplete, setIntegrationComplete] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/member/integration-progression', { credentials: 'same-origin' })
        const j = await r.json()
        if (!cancelled) setIntegrationComplete(j.ok ? !!j.data.integration_complete : false)
      } catch { if (!cancelled) setIntegrationComplete(false) }
    })()
    return () => { cancelled = true }
  }, [])
  const integrationDone = integrationComplete === true
  const prog = useAcademyProgress()
  const [confirmRead, setConfirmRead] = useState(false)
  const [justDone, setJustDone] = useState(false)
  const startedAt = useRef<number>(Date.now())

  // Trace l'ouverture + mesure le temps d'étude (réel).
  useEffect(() => {
    if (!mod || !prog.ready) return
    prog.logEvent(mod.stepId, 'opened')
    startedAt.current = Date.now()
    return () => { prog.addStudyTime(Date.now() - startedAt.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod?.stepId, prog.ready])

  if (!mod) {
    return (
      <div className="min-h-screen bg-charbon flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-cinzel text-2xl font-bold text-white mb-2">Module introuvable</h1>
          <Link href="/member/dashboard/formations" className="btn-gold-cinematic inline-flex mt-2">Retour à l&apos;Académie</Link>
        </div>
      </div>
    )
  }

  if (authLoading || integrationComplete === null) {
    return <div className="min-h-screen bg-charbon flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-gold/30 border-t-gold animate-spin" /></div>
  }
  if (!integrationDone) {
    return (
      <div className="min-h-screen bg-charbon flex items-center justify-center px-4">
        <div className="card-cinematic p-8 text-center max-w-md">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Lock className="w-6 h-6" style={{ color: 'rgba(245,230,216,0.5)' }} />
          </div>
          <h1 className="font-cinzel text-xl font-bold text-white mb-2">Académie verrouillée</h1>
          <p className="font-inter text-sm mb-5" style={{ color: 'rgba(245,230,216,0.6)' }}>
            Terminez l&apos;ensemble du Programme d&apos;Intégration (les 4 parcours) pour accéder à l&apos;Académie des Élus.
          </p>
          <Link href="/member/dashboard/parcours" className="btn-gold-cinematic inline-flex">Voir Mon Parcours <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    )
  }

  const status = prog.statusOf(mod.stepId)
  const completed = prog.isCompleted(mod.stepId)
  const locked = status === 'locked'
  const niveau1Done = getLevelModules(N1).filter((m) => prog.isCompleted(m.stepId)).length
  const next = getNextModule(mod.stepId)
  const vid = ytId(mod.videoUrl)
  // Contenu réellement disponible = au moins un manuel PDF ou une vidéo.
  // Sinon (ex. Module 2 dont seules les couvertures existent) → « à venir »,
  // sans proposer de validation factice (aucun contenu inventé).
  const contentReady = !!(mod.pdf || vid)
  const showCompletion = completed || justDone

  function validate() {
    if (!confirmRead) return
    prog.completeModule(mod!.stepId, mod!.badgeLabel)
    setJustDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Module verrouillé ──
  if (locked) {
    return (
      <div className="min-h-screen bg-charbon pt-28 pb-20">
        <div className="container-cinematic max-w-3xl text-center">
          {mod.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mod.cover} alt={mod.titre} className="w-full max-w-md mx-auto rounded-2xl mb-6 opacity-50" style={{ filter: 'grayscale(0.3)' }} />
          )}
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Lock className="w-6 h-6" style={{ color: 'rgba(245,230,216,0.5)' }} />
          </div>
          <h1 className="font-cinzel text-2xl font-bold text-white mb-2">{mod.titre}</h1>
          {mod.sousTitre && <p className="font-cormorant italic text-lg mb-4" style={{ color: 'rgba(245,230,216,0.55)' }}>{mod.sousTitre}</p>}
          <p className="font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.6)' }}>
            {mod.ordre === 2 ? 'Débloquez ce module après validation du Module 1.' : 'Ce module se débloque après validation du module précédent.'}
          </p>
          <Link href="/member/dashboard/formations" className="btn-glass-cinematic inline-flex">Retour au parcours <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-charbon pt-28 pb-20">
      <div className="container-cinematic max-w-4xl">
        {/* Fil d'Ariane */}
        <nav className="flex items-center gap-2 text-sm font-inter mb-6" style={{ color: 'rgba(245,230,216,0.4)' }}>
          <Link href="/member/dashboard/formations" className="hover:text-gold transition-colors">Mes Formations</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span style={{ color: '#D4AF37' }}>{mod.niveauLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span style={{ color: 'rgba(245,230,216,0.7)' }} className="truncate">Module {mod.ordre}</span>
        </nav>

        <AnimatePresence mode="wait">
          {showCompletion ? (
            /* ── ÉCRAN DE FÉLICITATIONS ── */
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="card-cinematic-gold p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.25), transparent 70%)' }} />
              <div className="relative">
                <div className="section-label-dark justify-center"><Sparkles className="w-3 h-3" /> Félicitations !</div>
                <h1 className="font-cinzel font-black text-2xl md:text-3xl text-white mb-2">
                  Vous avez terminé le Module {mod.ordre}
                </h1>
                <p className="font-cormorant italic text-lg mb-8" style={{ color: 'rgba(245,230,216,0.7)' }}>{mod.titre}</p>

                {mod.badgeLabel && (
                  <div className="flex justify-center mb-8">
                    <KingdomBadge label={mod.badgeLabel} obtained size={110} />
                  </div>
                )}

                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <Target className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  <span className="font-inter text-sm text-white">Progression Niveau 1 : <span className="font-bold text-cinematic-gold">{niveau1Done} / 20 modules</span></span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {next ? (
                    next.hasRealContent ? (
                      <Link href={`/academie/${next.slug}`} className="btn-gold-cinematic" onClick={() => setJustDone(false)}>
                        Continuer vers le Module {next.ordre}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="btn-glass-cinematic opacity-80 cursor-default">
                        Module {next.ordre} : contenu bientôt disponible
                      </span>
                    )
                  ) : null}
                  <Link href="/member/dashboard/formations" className="btn-glass-cinematic">Voir mon parcours</Link>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── LECTEUR DU MODULE ── */
            <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-2 font-inter text-xs font-bold tracking-widest uppercase" style={{ color: '#D4AF37' }}>Module {mod.ordre} · {mod.niveauLabel}</div>
              <h1 className="font-cinzel font-black text-3xl md:text-4xl text-white leading-tight mb-2">{mod.titre}</h1>
              {mod.sousTitre && <p className="font-cormorant italic text-xl mb-6" style={{ color: 'rgba(245,230,216,0.6)' }}>{mod.sousTitre}</p>}

              {/* Lecteur vidéo (YouTube si URL renseignée, sinon miniature officielle) */}
              <div className="relative rounded-3xl overflow-hidden mb-6" style={{ aspectRatio: '16/9', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
                {vid ? (
                  <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`}
                    title={mod.titre} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <>
                    {mod.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mod.thumbnail} alt={mod.titre} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(0deg, rgba(5,3,8,0.85), rgba(5,3,8,0.35))' }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(212,175,55,0.18)', border: '2px solid rgba(212,175,55,0.5)' }}>
                        <Play className="w-7 h-7 ml-1 text-white" fill="#fff" />
                      </div>
                      <p className="font-inter text-sm font-semibold text-white">Vidéo de l&apos;enseignement</p>
                      <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(245,230,216,0.5)' }}>Bientôt disponible (YouTube)</p>
                    </div>
                  </>
                )}
              </div>

              {/* Actions : PDF + à propos */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 card-cinematic p-5">
                  <h3 className="font-cinzel font-bold text-white flex items-center gap-2 mb-2"><Target className="w-4 h-4" style={{ color: '#D4AF37' }} /> À propos de ce module</h3>
                  <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(245,230,216,0.6)' }}>{mod.apropos || mod.sousTitre}</p>
                </div>
                <div className="card-cinematic p-5 flex flex-col items-center justify-center text-center gap-3">
                  {mod.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mod.cover} alt="Couverture du manuel" className="w-20 rounded-lg shadow-lg" />
                  )}
                  {mod.pdf ? (
                    <a href={mod.pdf} target="_blank" rel="noreferrer" onClick={() => prog.logEvent(mod.stepId, 'pdf')} className="btn-gold-cinematic w-full justify-center text-sm">
                      <Download className="w-4 h-4" /> Télécharger le manuel PDF
                    </a>
                  ) : (
                    <span className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.4)' }}>Manuel bientôt disponible</span>
                  )}
                </div>
              </div>

              {/* Validation du module — seulement si le contenu réel est disponible */}
              {contentReady ? (
                <div className="card-cinematic p-6">
                  <h3 className="font-cinzel font-bold text-white flex items-center gap-2 mb-1"><ListChecks className="w-4 h-4" style={{ color: '#D4AF37' }} /> Validation du module</h3>
                  <p className="font-inter text-xs mb-4" style={{ color: 'rgba(245,230,216,0.45)' }}>
                    Le quiz officiel sera intégré ici (validation automatique). En attendant ses questions, confirmez votre étude pour valider le module.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer select-none mb-4">
                    <input type="checkbox" checked={confirmRead} onChange={(e) => setConfirmRead(e.target.checked)} className="mt-1 w-4 h-4 accent-amber-500" />
                    <span className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.7)' }}>
                      J&apos;ai étudié l&apos;enseignement et lu le manuel de ce module.
                    </span>
                  </label>
                  <button onClick={validate} disabled={!confirmRead}
                    className="btn-gold-cinematic justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                    <Check className="w-4 h-4" /> Valider le module
                  </button>
                </div>
              ) : (
                <div className="card-cinematic p-6 text-center">
                  <ListChecks className="w-7 h-7 mx-auto mb-2" style={{ color: 'rgba(212,175,55,0.5)' }} />
                  <p className="font-cinzel font-bold text-white mb-1">Contenu de ce module bientôt disponible</p>
                  <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>
                    La couverture est prête. L&apos;enseignement, le manuel et le quiz officiels seront ajoutés ici très prochainement.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Revalider / revoir si déjà complété (hors écran de félicitations fraîche) */}
        {completed && !justDone && (
          <div className="text-center mt-4">
            <button onClick={() => { setJustDone(false) }} className="font-inter text-xs inline-flex items-center gap-1.5" style={{ color: 'rgba(245,230,216,0.4)' }}>
              <RotateCcw className="w-3 h-3" /> Module déjà validé
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
