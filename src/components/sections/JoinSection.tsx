'use client'
import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import {
  ArrowRight, Sparkles, UserPlus, UserCircle2, Compass, Rocket, Mail, CheckCircle,
  type LucideIcon,
} from 'lucide-react'
import { HERO_IMAGES } from '@/lib/images'
import { events } from '@/lib/analytics'

/* ============================================================
   BLOC 7 — FINALE SPIRITUELLE
   Parcours en 4 étapes + finale (crest + Jérémie 29:11).
   Le pricing a été retiré de l'accueil (→ /partenariat).
   Capture email légère (palier de conversion) via /api/tunnel/lead.
   ============================================================ */

type Step = { numero: string; titre: string; description: string; icon: LucideIcon }
const STEPS: Step[] = [
  { numero: '01', titre: 'Crée ton compte',           description: 'Inscription gratuite en quelques instants. Ton parcours commence ici.', icon: UserPlus },
  { numero: '02', titre: 'Profil spirituel',          description: 'Renseigne ton profil pour personnaliser ton expérience.',               icon: UserCircle2 },
  { numero: '03', titre: 'Choisis ta plateforme',     description: 'Rejoins la communauté qui correspond à ton appel et ta saison.',        icon: Compass },
  { numero: '04', titre: 'Commence à grandir',        description: 'Formations, live, prière, communauté — tout t’attend.',                 icon: Rocket },
]

export function JoinSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // Capture email (newsletter / contact léger)
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (prenom.trim().length < 2 || !EMAIL_RE.test(email.trim())) {
      toast.error('Indique ton prénom et un email valide.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/tunnel/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom: prenom.trim(), email: email.trim(), stage: 'contact', source: 'home_newsletter' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) throw new Error(json?.message || 'Échec')
      events.newsletterSubscribe('home_finale')
      setSubscribed(true)
      setPrenom(''); setEmail('')
      toast.success('Bienvenue ! Restons en lien. 🙏')
    } catch {
      toast.error('Une erreur est survenue. Réessayez dans un instant.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* HOW IT WORKS */}
      <div className="section-cinematic">
        <div className="halo-gold w-[600px] h-[400px] -top-20 -right-40" />

        <div className="container-cinematic">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="section-label-dark justify-center">Comment démarrer</div>
            <h2 className="heading-cinematic-lg">
              Rejoins Citadelle
              <span className="block text-cinematic-gold">en 4 étapes</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative">
            <div className="hidden lg:block absolute top-9 left-[12%] right-[12%] h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), rgba(212,175,55,0.6), rgba(212,175,55,0.4), transparent)' }} />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.numero}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                className="text-center card-cinematic p-6 relative group"
              >
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-500 group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.06))',
                      border: '1px solid rgba(212,175,55,0.32)',
                      boxShadow: '0 0 24px rgba(212,175,55,0.16)',
                    }}>
                    <step.icon className="w-7 h-7" style={{ color: '#D4AF37' }} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black font-cinzel"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #92721A)', color: '#1A0F00', boxShadow: '0 4px 12px rgba(212,175,55,0.4)' }}>
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-cinzel font-bold text-sm text-white mb-2 tracking-wide">{step.titre}</h3>
                <p className="text-xs font-inter leading-relaxed" style={{ color: 'rgba(245,230,216,0.55)' }}>{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* FINALE — cinematic finale */}
      <div className="relative section-cinematic" style={{ paddingBottom: '8rem' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.22) 0%, rgba(236,232,222,0.10) 42%, transparent 72%)', filter: 'blur(40px)' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full opacity-30"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.6) 30%, transparent 80%)' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -12 }}
            animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative inline-block mb-6"
          >
            <div className="absolute inset-0 rounded-full blur-3xl opacity-60" style={{ background: 'radial-gradient(circle, #D4AF37, transparent 65%)' }} />
            <Image src={HERO_IMAGES.crest.src} alt={HERO_IMAGES.crest.alt} width={140} height={140}
              className="relative drop-shadow-[0_8px_24px_rgba(212,175,55,0.4)]" />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold tracking-[0.25em] uppercase font-inter backdrop-blur-md"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#F5E6A7', boxShadow: '0 0 30px rgba(212,175,55,0.15)' }}>
            <Sparkles className="w-3 h-3" />
            Ta destinée t&apos;attend
            <Sparkles className="w-3 h-3" />
          </div>

          <h2 className="font-cinzel font-black mb-6 text-cinematic-gold drop-shadow-[0_4px_30px_rgba(212,175,55,0.3)]"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.0 }}>
            Rejoins Citadelle
          </h2>

          <p className="font-cormorant italic mb-10 mx-auto leading-relaxed"
            style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)', color: 'rgba(245,230,216,0.65)', maxWidth: '720px' }}>
            « Car je connais les projets que j&apos;ai formés sur vous, dit l&apos;Éternel, projets de paix
            et non de malheur, afin de vous donner un avenir et de l&apos;espérance. »
            <span className="block mt-3 text-sm not-italic font-inter tracking-[0.3em] uppercase" style={{ color: '#D4AF37' }}>
              — Jérémie 29 : 11
            </span>
          </p>

          <Link
            href="/parcours"
            onClick={() => events.ctaClick('parcours_finale')}
            className="btn-gold-cinematic group inline-flex"
            style={{ padding: '18px 44px', fontSize: '1rem' }}
          >
            Commencer mon parcours
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Capture email — palier de conversion léger */}
          <div className="mt-12 max-w-xl mx-auto">
            {subscribed ? (
              <div className="card-cinematic p-6 flex items-center justify-center gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#86EFAC' }} />
                <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.75)' }}>
                  Merci ! Tu recevras bientôt de nos nouvelles.
                </p>
              </div>
            ) : (
              <div className="card-cinematic p-6">
                <p className="font-inter text-sm mb-4 flex items-center justify-center gap-2" style={{ color: 'rgba(245,230,216,0.6)' }}>
                  <Mail className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  Pas encore prêt à t&apos;inscrire ? Restons en lien.
                </p>
                <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Ton prénom"
                    className="input-cinematic sm:max-w-[180px]"
                    maxLength={60}
                    aria-label="Ton prénom"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ton email"
                    className="input-cinematic flex-1"
                    maxLength={120}
                    aria-label="Ton email"
                  />
                  <button type="submit" disabled={submitting} className="btn-gold-cinematic disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
                    {submitting ? 'Envoi…' : 'Rester informé'}
                  </button>
                </form>
                <p className="font-inter text-[11px] mt-3" style={{ color: 'rgba(245,230,216,0.35)' }}>
                  Aucune publicité. Désinscription en un clic.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
