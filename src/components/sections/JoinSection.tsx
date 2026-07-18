'use client'
import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { ArrowRight, Sparkles, Mail, CheckCircle } from 'lucide-react'
import { HERO_IMAGES } from '@/lib/images'
import { events } from '@/lib/analytics'

/**
 * CTA final unique — plus de « 4 étapes » redondantes avec le parcours tunnel.
 * Capture email légère via /api/tunnel/lead.
 */

export function JoinSection(_props: { block?: unknown } = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

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
      setPrenom('')
      setEmail('')
      toast.success('Bienvenue ! Restons en lien. 🙏')
    } catch {
      toast.error('Une erreur est survenue. Réessaie dans un instant.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="relative section-cinematic" style={{ paddingBottom: '6rem' }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.22) 0%, rgba(236,232,222,0.10) 42%, transparent 72%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full opacity-30"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.6) 30%, transparent 80%)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.1 }}
          className="relative z-10 max-w-4xl mx-auto text-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -12 }}
            animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative inline-block mb-6"
          >
            <div className="absolute inset-0 rounded-full blur-3xl opacity-60" style={{ background: 'radial-gradient(circle, #D4AF37, transparent 65%)' }} />
            <Image
              src={HERO_IMAGES.crest.src}
              alt={HERO_IMAGES.crest.alt}
              width={120}
              height={120}
              className="relative drop-shadow-[0_8px_24px_rgba(212,175,55,0.4)]"
            />
          </motion.div>

          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold tracking-[0.25em] uppercase font-inter backdrop-blur-md"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#F5E6A7',
              boxShadow: '0 0 30px rgba(212,175,55,0.15)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            Commence maintenant
            <Sparkles className="w-3 h-3" />
          </div>

          <h2
            className="font-cinzel font-black mb-6 text-cinematic-gold drop-shadow-[0_4px_30px_rgba(212,175,55,0.3)]"
            style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.2rem)', lineHeight: 1.05 }}
          >
            Ta place t&apos;attend
          </h2>

          <p
            className="font-cormorant italic mb-10 mx-auto leading-relaxed"
            style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.55rem)', color: 'rgba(245,230,216,0.65)', maxWidth: '720px' }}
          >
            « Car je connais les projets que j&apos;ai formés sur vous, dit l&apos;Éternel, projets de paix
            et non de malheur, afin de vous donner un avenir et de l&apos;espérance. »
            <span className="block mt-3 text-sm not-italic font-inter tracking-[0.3em] uppercase" style={{ color: '#D4AF37' }}>
              — Jérémie 29 : 11
            </span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link
              href="/rejoindre"
              onClick={() => events.ctaClick('rejoindre_finale')}
              className="btn-gold-cinematic group inline-flex"
              style={{ padding: '18px 44px', fontSize: '1rem' }}
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/parcours"
              onClick={() => events.ctaClick('parcours_finale_secondary')}
              className="btn-glass-cinematic inline-flex"
            >
              Voir le parcours
            </Link>
          </div>

          <div className="max-w-xl mx-auto">
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
                  Pas encore prêt ? Laisse ton email, on reste en lien.
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
