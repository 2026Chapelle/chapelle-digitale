'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Play, ChevronLeft, ChevronRight, Check, Sparkles, Globe, Heart, Compass,
  Crown, Gift, Users, Target, Flag,
} from 'lucide-react'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'
import { PLATEFORMES } from '@/lib/constants'
import { JourneyPath } from '@/components/conversion/JourneyPath'
import { PARCOURS_INTEGRATION } from '@/lib/parcours/registry'
import { flattenSteps } from '@/lib/parcours/types'
import { useAuth } from '@/components/providers/AuthProvider'
import { events } from '@/lib/analytics'

/* ============================================================
   ONBOARDING — Accueil guidé du nouvel inscrit (7 étapes).
   1 Accueil · 2 Vision · 3 Plateforme · 4 Famille · 5 Première
   mission · 6 Progression · 7 Envoi. Aligné aux 8 plateformes
   réelles. Lance le Parcours d'Intégration. Persistance best-effort.
   ============================================================ */

const PLATFORM_LIST = Object.values(PLATEFORMES)
const STEP_LABELS = ['Accueil', 'Vision', 'Plateforme', 'Famille', 'Mission', 'Parcours', 'Envoi']
const TOTAL = STEP_LABELS.length

// Première mission concrète = mission du Jour 1 du Parcours d'Intégration.
const PREMIERE_MISSION = flattenSteps(PARCOURS_INTEGRATION)[0]?.mission

export default function BienvenuePage() {
  const { profile } = useAuth()
  const [step, setStep] = useState(1)
  const [prenom, setPrenom] = useState('')
  const [plateforme, setPlateforme] = useState('')
  const [familleOk, setFamilleOk] = useState(false)
  const [missionOk, setMissionOk] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Prénom & plateforme : query (depuis /register) → profil → vide.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const qp = sp.get('prenom'); const qpl = sp.get('plateforme')
      if (qp) setPrenom(qp)
      if (qpl && PLATEFORMES[qpl as keyof typeof PLATEFORMES]) setPlateforme(qpl)
    } catch { /* noop */ }
  }, [])
  useEffect(() => {
    if (!prenom && profile?.prenom) setPrenom(profile.prenom)
    if (!plateforme && (profile as any)?.plateforme_principale) setPlateforme((profile as any).plateforme_principale)
  }, [profile, prenom, plateforme])

  const next = () => { if (step < TOTAL) { events.joinFunnelStep(`onboarding_step_${step}`); setStep((s) => s + 1) } }
  const prev = () => { if (step > 1) setStep((s) => s - 1) }

  const canNext =
    step === 3 ? plateforme !== '' :
    step === 4 ? familleOk :
    step === 5 ? missionOk :
    true

  const selected = PLATFORM_LIST.find((p) => p.id === plateforme)

  useEffect(() => {
    if (step === TOTAL) {
      setShowConfetti(true)
      // Persistance best-effort (n'interrompt jamais l'expérience).
      try { localStorage.setItem('cier_onboarding', JSON.stringify({ prenom, plateforme, ts: Date.now() })) } catch { /* */ }
      if (plateforme) {
        fetch('/api/member/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plateforme_principale: plateforme }),
        }).catch(() => { /* non connecté / confirmation email en attente : best-effort */ })
      }
      events.joinFunnelStep('onboarding_completed', { plateforme })
      const t = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(t)
    }
  }, [step, prenom, plateforme])

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* Stepper */}
        <div className="flex items-center justify-between gap-1.5 mb-3">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1
            const completed = num < step
            const current = num === step
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-cinzel font-bold text-[11px] transition-all duration-500"
                  style={{
                    background: completed ? 'linear-gradient(135deg, #F5E6A7, #D4AF37)' : current ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)',
                    color: completed ? '#1A0F00' : current ? '#F5E6A7' : 'rgba(245,230,216,0.3)',
                    border: current ? '2px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: completed ? '0 4px 12px rgba(212,175,55,0.4)' : current ? '0 0 16px rgba(212,175,55,0.4)' : 'none',
                  }}>
                  {completed ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : num}
                </div>
                <span className="font-inter text-[9px] uppercase tracking-widest hidden sm:block"
                  style={{ color: current ? '#D4AF37' : completed ? 'rgba(245,230,216,0.6)' : 'rgba(245,230,216,0.25)' }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full overflow-hidden mb-8 mt-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${((step - 1) / (TOTAL - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #D4AF37, #F5E6A7)', boxShadow: '0 0 12px rgba(212,175,55,0.5)' }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 24, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl p-7 md:p-9 relative overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 100% 0%, rgba(212,175,55,0.10) 0%, transparent 60%), linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              border: '1px solid rgba(212,175,55,0.18)', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(212,175,55,0.06)', backdropFilter: 'blur(24px)',
            }}>

            {/* STEP 1 — Accueil */}
            {step === 1 && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 backdrop-blur-md"
                  style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Sparkles className="w-3 h-3" style={{ color: '#F5E6A7' }} />
                  <span className="font-inter text-xs font-bold tracking-widest uppercase" style={{ color: '#F5E6A7' }}>Mot de bienvenue</span>
                </div>
                <h1 className="font-cinzel font-black mb-3 text-cinematic-gold drop-shadow-[0_4px_24px_rgba(212,175,55,0.3)]"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1.1 }}>
                  {prenom ? `Bienvenue, ${prenom} !` : 'Bienvenue dans la Chapelle !'}
                </h1>
                <p className="font-inter text-sm md:text-base mb-8 leading-relaxed max-w-md mx-auto" style={{ color: 'rgba(245,230,216,0.65)' }}>
                  Tu n&apos;es pas un numéro : tu es attendu. Prenons 2 minutes ensemble pour t&apos;accueillir
                  et te montrer où commencer.
                </p>
                <div className="relative rounded-2xl overflow-hidden h-52 md:h-60 mb-8 flex items-center justify-center group"
                  style={{ border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <PremiumImage image={HERO_IMAGES.welcome} fill overlay="cinematic" sizes="(max-width: 768px) 100vw, 600px" />
                  </div>
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(212,175,55,0.18)', border: '2px solid rgba(212,175,55,0.5)', backdropFilter: 'blur(16px)', boxShadow: '0 0 40px rgba(212,175,55,0.4)' }}>
                    <Play className="w-7 h-7 ml-1" style={{ color: '#FFFFFF' }} fill="#FFFFFF" />
                  </motion.div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <p className="font-inter text-xs font-semibold" style={{ color: 'rgba(245,230,216,0.7)' }}>Message de bienvenue · 3 min</p>
                    <span className="chip-gold backdrop-blur-md">HD</span>
                  </div>
                </div>
                <p className="font-cormorant italic text-base md:text-lg leading-relaxed" style={{ color: 'rgba(245,230,216,0.75)' }}>
                  « Où que tu sois sur la terre, tu as une maison dans le Royaume. »
                </p>
              </div>
            )}

            {/* STEP 2 — Vision */}
            {step === 2 && (
              <div>
                <StepBadge icon={Globe} label="Étape 2 · La vision" />
                <h1 className="font-cinzel font-black mb-2 text-white" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Une Église ouverte au monde
                </h1>
                <p className="font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.55)' }}>
                  Comprends qui nous sommes avant de trouver ta place.
                </p>
                <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <p className="font-cinzel text-sm font-bold mb-1" style={{ color: '#F5E6A7' }}>Nos Ministères — 8 Plateformes, Une Seule Vision</p>
                  <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(245,230,216,0.6)' }}>
                    Huit plateformes ministérielles autonomes et complémentaires — aucune supérieure à l&apos;autre.
                    Ensemble, un seul corps, un seul appel : faire des disciples, pour toutes les nations.
                  </p>
                </div>
                <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="font-cormorant italic text-lg leading-relaxed mb-1" style={{ color: 'rgba(245,230,216,0.85)' }}>
                    « Allez, faites de toutes les nations des disciples. »
                  </p>
                  <p className="font-inter text-[11px] tracking-[0.3em] uppercase" style={{ color: '#D4AF37' }}>— Matthieu 28 : 19</p>
                </div>
              </div>
            )}

            {/* STEP 3 — Plateforme (8 réelles) */}
            {step === 3 && (
              <div>
                <StepBadge icon={Compass} label="Étape 3 · Ta plateforme" />
                <h1 className="font-cinzel font-black mb-2 text-white" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Quelle plateforme t&apos;attire ?
                </h1>
                <p className="font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.55)' }}>
                  Choisis ta plateforme principale d&apos;intérêt — tu pourras explorer les autres librement.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLATFORM_LIST.map((p) => {
                    const sel = plateforme === p.id
                    return (
                      <button key={p.id} onClick={() => setPlateforme(p.id)}
                        className="p-4 rounded-xl text-left transition-all duration-300 group"
                        style={{ background: sel ? `${p.couleur_primaire}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${sel ? `${p.couleur_primaire}55` : 'rgba(255,255,255,0.08)'}`, boxShadow: sel ? `0 8px 24px ${p.couleur_primaire}25` : 'none' }}>
                        <div className="text-2xl mb-2 transition-transform group-hover:scale-110">{p.icone}</div>
                        <p className="font-inter text-sm font-bold mb-0.5" style={{ color: sel ? p.couleur_primaire : '#FFFFFF' }}>{p.nom}</p>
                        <p className="font-inter text-[10px] leading-tight line-clamp-2" style={{ color: 'rgba(245,230,216,0.4)' }}>{p.slogan}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 4 — Famille de la Chapelle */}
            {step === 4 && (
              <div>
                <StepBadge icon={Heart} label="Étape 4 · Ta famille" />
                <h1 className="font-cinzel font-black mb-2 text-white" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Rejoins une Famille de la Chapelle
                </h1>
                <p className="font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.55)' }}>
                  On ne grandit pas seul. Les Familles de la Chapelle sont de petits groupes où l&apos;on prie,
                  partage et avance ensemble. C&apos;est là que la foi devient concrète.
                </p>
                <button onClick={() => setFamilleOk(true)}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-300 mb-3"
                  style={{ background: familleOk ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${familleOk ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: familleOk ? 'rgba(34,197,94,0.18)' : 'rgba(212,175,55,0.12)', border: `1px solid ${familleOk ? 'rgba(34,197,94,0.4)' : 'rgba(212,175,55,0.3)'}` }}>
                    {familleOk ? <Check className="w-6 h-6" style={{ color: '#86EFAC' }} /> : <Users className="w-6 h-6" style={{ color: '#D4AF37' }} />}
                  </div>
                  <div>
                    <p className="font-inter text-sm font-bold text-white">{familleOk ? 'Parfait — on te met en lien' : 'Oui, je veux rejoindre une Famille'}</p>
                    <p className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.5)' }}>
                      {familleOk ? 'Un responsable te contactera pour t’accueillir.' : 'Être connu, soutenu, accompagné.'}
                    </p>
                  </div>
                </button>
                <p className="font-inter text-[11px] text-center" style={{ color: 'rgba(245,230,216,0.35)' }}>
                  Tu choisiras ta famille précise depuis ton espace membre.
                </p>
              </div>
            )}

            {/* STEP 5 — Première mission */}
            {step === 5 && (
              <div>
                <StepBadge icon={Flag} label="Étape 5 · Ta première mission" />
                <h1 className="font-cinzel font-black mb-2 text-white" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Ta première mission
                </h1>
                <p className="font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.55)' }}>
                  Un disciple n&apos;est pas un spectateur. Voici un premier pas simple et concret.
                </p>
                <div className="rounded-2xl p-6 mb-4" style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    <span className="font-cinzel text-xs font-bold tracking-widest uppercase" style={{ color: '#F5E6A7' }}>Mission · Jour 1</span>
                  </div>
                  <p className="font-cinzel text-lg font-bold text-white mb-1.5">{PREMIERE_MISSION?.titre ?? 'Présente-toi'}</p>
                  <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(245,230,216,0.65)' }}>
                    {PREMIERE_MISSION?.description ?? 'Complète ton profil pour que la famille puisse t’accueillir personnellement.'}
                  </p>
                </div>
                <button onClick={() => setMissionOk(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-inter text-sm font-semibold transition-all"
                  style={missionOk
                    ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', color: '#86EFAC' }
                    : { background: 'linear-gradient(135deg, #F5E6A7, #D4AF37)', color: '#1A0F00' }}>
                  {missionOk ? <><Check className="w-4 h-4" /> Mission acceptée</> : <>J&apos;accepte ma première mission</>}
                </button>
              </div>
            )}

            {/* STEP 6 — Progression / parcours */}
            {step === 6 && (
              <div>
                <StepBadge icon={Compass} label="Étape 6 · Ton parcours" />
                <h1 className="font-cinzel font-black mb-2 text-white" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Voici ton chemin
                </h1>
                <p className="font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.55)' }}>
                  À Citadelle, on ne consomme pas des vidéos : on est transformé, étape après étape.
                  Tu démarres comme <span className="text-gold font-semibold">Visiteur</span> — voici la suite.
                </p>
                <JourneyPath currentKey="visiteur" showCtas={false} compact />
                <div className="mt-5 rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <span className="text-2xl">🕊️</span>
                  <div>
                    <p className="font-inter text-sm font-bold text-white">Ton premier parcours : l&apos;Intégration (7 jours)</p>
                    <p className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.5)' }}>Un pas par jour pour t&apos;enraciner dans la famille.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7 — Envoi */}
            {step === 7 && (
              <div className="text-center">
                {showConfetti && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(24)].map((_, i) => (
                      <motion.span key={i} className="absolute text-2xl"
                        initial={{ opacity: 0, y: 0, x: '50%', scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.8], x: `${50 + (i * 13 % 80 - 40)}%`, y: `${100 + (i * 17 % 100)}%`, rotate: (i * 47) % 360 }}
                        transition={{ duration: 2 + (i % 4) * 0.4, delay: (i % 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}>
                        {['✨', '⭐', '🌟', '💫', '🙏'][i % 5]}
                      </motion.span>
                    ))}
                  </div>
                )}
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative inline-flex items-center justify-center mb-5">
                  <motion.div className="absolute inset-0 rounded-full blur-2xl" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ background: 'radial-gradient(circle, #D4AF37, transparent 65%)' }} />
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(75,0,130,0.2))', border: '2px solid rgba(212,175,55,0.5)', boxShadow: '0 0 40px rgba(212,175,55,0.5), inset 0 0 20px rgba(212,175,55,0.2)' }}>
                    <Crown className="w-12 h-12" style={{ color: '#F5E6A7' }} />
                  </div>
                </motion.div>
                <h1 className="font-cinzel font-black mb-3 text-cinematic-gold drop-shadow-[0_4px_24px_rgba(212,175,55,0.4)]"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1.1 }}>
                  {prenom ? `Tu fais partie de la famille, ${prenom} !` : 'Tu fais partie de la famille !'}
                </h1>
                <p className="font-inter text-sm md:text-base mb-8 leading-relaxed max-w-md mx-auto" style={{ color: 'rgba(245,230,216,0.7)' }}>
                  Ton accueil est terminé. {selected ? <>Ta plateforme : <span style={{ color: selected.couleur_primaire }} className="font-semibold">{selected.icone} {selected.nom}</span>. </> : null}
                  Ton Parcours d&apos;Intégration t&apos;attend dans ton espace.
                </p>

                <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    <span className="font-cinzel text-xs font-bold tracking-widest uppercase" style={{ color: '#F5E6A7' }}>Ce qui t&apos;attend</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: '🕊️', label: 'Parcours d’Intégration — Jour 1 débloqué' },
                      { icon: '🤝', label: 'Une Famille de la Chapelle prête à t’accueillir' },
                      { icon: '📖', label: 'Accès aux formations et au mur de prière' },
                    ].map((g) => (
                      <div key={g.label} className="flex items-center gap-2.5">
                        <span className="text-base">{g.icon}</span>
                        <span className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.85)' }}>{g.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/member/dashboard" onClick={() => events.ctaClick('onboarding_to_dashboard')}
                  className="btn-gold-cinematic w-full justify-center" style={{ padding: '18px 40px' }}>
                  Accéder à mon espace membre
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < TOTAL && (
          <div className="flex items-center justify-between mt-6 gap-3">
            <button onClick={prev}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-inter font-medium text-sm transition-all duration-300"
              style={{ visibility: step === 1 ? 'hidden' : 'visible', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,230,216,0.65)' }}>
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <button onClick={next} disabled={!canNext}
              className="btn-gold-cinematic disabled:opacity-40 disabled:cursor-not-allowed"
              style={!canNext ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(245,230,216,0.3)', boxShadow: 'none' } : undefined}>
              {step === TOTAL - 1 ? 'Terminer' : 'Continuer'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepBadge({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 backdrop-blur-md"
      style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
      <Icon className="w-3 h-3" style={{ color: '#F5E6A7' }} />
      <span className="font-inter text-[10px] font-bold tracking-widest uppercase" style={{ color: '#F5E6A7' }}>{label}</span>
    </div>
  )
}
