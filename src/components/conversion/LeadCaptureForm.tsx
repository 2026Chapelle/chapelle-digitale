'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, User, Phone, Send, CheckCircle, Sparkles } from 'lucide-react'
import type { TunnelStageKey } from '@/lib/tunnel'
import { events } from '@/lib/analytics'

/* ============================================================
   LeadCaptureForm — palier de conversion « premier pas »
   Capture douce → POST /api/tunnel/lead (Supabase + CRM + email
   de bienvenue côté serveur). Réutilisable sur tout le site.
   DA « Charbon & Lumière » : or royal × charbon.
   ============================================================ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface LeadCaptureFormProps {
  /** Étape du tunnel rattachée (par défaut « contact »). */
  stage?: TunnelStageKey
  /** Source analytique / CRM (ex. « rejoindre », « home_finale »). */
  source?: string
  /** Titre du bloc. */
  title?: string
  /** Sous-titre. */
  subtitle?: string
  /** Libellé du bouton. */
  ctaLabel?: string
  /** Demander le téléphone (facultatif). */
  askPhone?: boolean
  /** Champ message libre. */
  askMessage?: boolean
  /** Message de confirmation après succès. */
  successMessage?: string
  /** Variante visuelle. */
  variant?: 'card' | 'bare'
  /** Callback après succès. */
  onSuccess?: () => void
}

export function LeadCaptureForm({
  stage = 'contact',
  source = 'lead_capture',
  title = 'Faites le premier pas',
  subtitle = 'Laissez-nous vos coordonnées : nous vous accueillons personnellement et vous guidons.',
  ctaLabel = 'Je fais le premier pas',
  askPhone = false,
  askMessage = false,
  successMessage = 'Bienvenue ! Nous vous recontactons très vite. 🙏',
  variant = 'card',
  onSuccess,
}: LeadCaptureFormProps) {
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (prenom.trim().length < 2 || !EMAIL_RE.test(email.trim())) {
      toast.error('Indiquez votre prénom et un email valide.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/tunnel/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: prenom.trim(),
          email: email.trim(),
          telephone: telephone.trim() || undefined,
          message: message.trim() || undefined,
          stage,
          source,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) throw new Error(json?.message || 'Échec')
      events.joinFunnelStep(stage, { source })
      setDone(true)
      setPrenom(''); setEmail(''); setTelephone(''); setMessage('')
      toast.success(successMessage)
      onSuccess?.()
    } catch {
      toast.error('Une erreur est survenue. Réessayez dans un instant.')
    } finally {
      setSubmitting(false)
    }
  }

  const wrap = variant === 'card' ? 'card-cinematic p-6 md:p-8' : ''

  if (done) {
    return (
      <div className={wrap}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <CheckCircle className="w-6 h-6" style={{ color: '#86EFAC' }} />
          </div>
          <p className="font-cinzel font-bold text-white text-base mb-1.5">C&apos;est noté !</p>
          <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(245,230,216,0.6)' }}>
            {successMessage}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={wrap}>
      {(title || subtitle) && (
        <div className="mb-5">
          {title && (
            <h4 className="font-cinzel font-bold text-white text-lg mb-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: '#D4AF37' }} />
              {title}
            </h4>
          )}
          {subtitle && (
            <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(245,230,216,0.55)' }}>{subtitle}</p>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.35)' }} />
            <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)}
              placeholder="Votre prénom" aria-label="Votre prénom" maxLength={60} required
              className="input-cinematic pl-10" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.35)' }} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre email" aria-label="Votre email" maxLength={120} required
              className="input-cinematic pl-10" />
          </div>
        </div>

        {askPhone && (
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.35)' }} />
            <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
              placeholder="Votre téléphone (facultatif)" aria-label="Votre téléphone" maxLength={30}
              className="input-cinematic pl-10" />
          </div>
        )}

        {askMessage && (
          <textarea value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Un mot, une attente, un besoin (facultatif)…" aria-label="Votre message" rows={3} maxLength={600}
            className="input-cinematic resize-none" />
        )}

        <button type="submit" disabled={submitting}
          className="btn-gold-cinematic w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />
          {submitting ? 'Envoi…' : ctaLabel}
        </button>

        <p className="font-inter text-[11px] text-center" style={{ color: 'rgba(245,230,216,0.35)' }}>
          Accueil personnalisé · Aucune publicité · Désinscription en un clic
        </p>
      </form>
    </div>
  )
}
