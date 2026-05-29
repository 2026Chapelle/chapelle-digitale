'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Youtube, Facebook, Instagram, Twitter, Send, Check, Loader2 } from 'lucide-react'
import { SOCIAL_LINKS } from '@/lib/constants'
import { events } from '@/lib/analytics'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FOOTER_LINKS = {
  'Plateformes': [
    { label: 'CIER', href: '/plateformes/cier' },
    { label: 'Chapelle Familiale', href: '/plateformes/chapelle-familiale' },
    { label: 'Jeunesse', href: '/plateformes/jeunesse' },
    { label: "Femmes d'Exceptions", href: '/plateformes/femmes-exceptions' },
    { label: 'Cité du Refuge', href: '/plateformes/cite-refuge' },
    { label: 'CFIC', href: '/plateformes/cfic' },
  ],
  'Ressources': [
    { label: 'Formations', href: '/formations' },
    { label: 'Live & Replays', href: '/live' },
    { label: 'Podcast', href: '/podcast' },
    { label: 'Mur de Prière', href: '/priere' },
    { label: 'Événements', href: '/evenements' },
    { label: 'Dons & Partenariat', href: '/dons' },
  ],
  'Communauté': [
    { label: 'Groupes', href: '/groupes' },
    { label: 'Témoignages', href: '/temoignages' },
    { label: 'Agenda', href: '/evenements' },
    { label: 'Bénévolat', href: '/benevolat' },
  ],
  'Informations': [
    { label: 'Notre Histoire', href: '/notre-histoire' },
    { label: 'Leadership', href: '/notre-histoire#leadership' },
    { label: 'Contact', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Confidentialité', href: '/confidentialite' },
  ],
}

const SOCIAL_ITEMS = [
  { icon: Youtube, href: SOCIAL_LINKS.youtube, label: 'YouTube', hoverColor: '#EF4444' },
  { icon: Facebook, href: SOCIAL_LINKS.facebook, label: 'Facebook', hoverColor: '#3B82F6' },
  { icon: Instagram, href: SOCIAL_LINKS.instagram, label: 'Instagram', hoverColor: '#EC4899' },
  { icon: Twitter, href: SOCIAL_LINKS.twitter, label: 'X / Twitter', hoverColor: '#FFFFFF' },
  { icon: Send, href: SOCIAL_LINKS.telegram, label: 'Telegram', hoverColor: '#60A5FA' },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setStatus('error')
      setErrorMsg('Email invalide')
      return
    }
    setStatus('submitting')
    setErrorMsg(null)
    try {
      events.newsletterSubscribe('footer')
      // Simulated success — wire to a real endpoint when available.
      await new Promise((r) => setTimeout(r, 600))
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
      setErrorMsg("Échec de l'abonnement. Réessayez.")
    }
  }

  return (
    <footer
      className="relative"
      aria-label="Pied de page"
      style={{ background: 'linear-gradient(180deg, #0D0D1A 0%, #080010 100%)' }}
    >
      {/* Top border with gold gradient */}
      <div
        className="h-px w-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.35), rgba(212,175,55,0.15), transparent)' }}
      />

      {/* Newsletter Banner */}
      <div
        className="border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <h3
                className="font-cinzel font-bold text-lg mb-1.5"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Restez connecté au Royaume
              </h3>
              <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '360px' }}>
                Recevez les actualités, prochains événements et nouvelles formations.
              </p>
            </div>
            <form
              className="flex flex-col gap-2 w-full md:w-auto"
              onSubmit={handleNewsletterSubmit}
              noValidate
            >
              <div className="flex gap-2">
                <label htmlFor="footer-newsletter" className="sr-only">
                  Adresse email pour la newsletter
                </label>
                <input
                  id="footer-newsletter"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                  placeholder="Votre adresse email..."
                  autoComplete="email"
                  required
                  aria-invalid={status === 'error'}
                  aria-describedby={status === 'error' ? 'newsletter-error' : status === 'success' ? 'newsletter-success' : undefined}
                  disabled={status === 'submitting' || status === 'success'}
                  className="flex-1 md:w-64 px-4 py-2.5 rounded-xl text-sm font-inter outline-none focus:ring-1 transition-all duration-200 disabled:opacity-60"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: status === 'error' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.8)',
                    caretColor: '#D4AF37',
                  }}
                />
                <button
                  type="submit"
                  disabled={status === 'submitting' || status === 'success'}
                  className="px-5 py-2.5 rounded-xl font-inter font-semibold text-sm flex-shrink-0 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-1.5 min-w-[110px]"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}
                >
                  {status === 'submitting' && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                  {status === 'success' && <Check className="w-3.5 h-3.5" aria-hidden />}
                  {status === 'success' ? 'Abonné' : status === 'submitting' ? '…' : "S'abonner"}
                </button>
              </div>
              {status === 'error' && (
                <p id="newsletter-error" role="alert" className="text-[11px] font-inter text-red-400/90">
                  {errorMsg}
                </p>
              )}
              {status === 'success' && (
                <p id="newsletter-success" role="status" aria-live="polite" className="text-[11px] font-inter text-emerald-400/80">
                  Merci ! Vous recevrez nos prochaines actualités.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative w-10 h-10">
                <div
                  className="absolute inset-0 rounded-full opacity-40 group-hover:opacity-70 blur-xl transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
                />
                <Image
                  src="/images/logo-mark.png"
                  alt="CIER — La Chapelle Internationale des Élus du Royaume"
                  width={40}
                  height={40}
                  className="relative w-10 h-10 object-contain drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)]"
                />
              </div>
              <div>
                <div
                  className="font-cinzel font-bold text-sm tracking-wider"
                  style={{ color: '#D4AF37' }}
                >
                  CIER
                </div>
                <div className="font-inter text-[9px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Une Église Ouverte au Monde
                </div>
              </div>
            </Link>

            <p className="font-inter text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '260px' }}>
              La Chapelle Internationale des Élus du Royaume — une communauté chrétienne francophone mondiale dédiée à la transformation spirituelle.
            </p>

            {/* Social */}
            <div className="flex items-center gap-2">
              {SOCIAL_ITEMS.map(({ icon: Icon, href, label, hoverColor }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = `${hoverColor}40` }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4
                className="font-cinzel font-semibold text-xs tracking-wider uppercase mb-4"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {title}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs font-inter transition-colors duration-200"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            © {new Date().getFullYear()} La Chapelle Internationale des Élus du Royaume. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            {[
              { label: 'Confidentialité', href: '/confidentialite' },
              { label: 'Conditions', href: '/conditions' },
              { label: 'Cookies', href: '/confidentialite#cookies' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-inter text-[11px] transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
