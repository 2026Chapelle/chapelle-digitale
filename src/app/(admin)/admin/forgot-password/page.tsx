'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { IS_DEMO_MODE } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NEUTRAL_MSG =
  'Si ce compte existe, un lien de réinitialisation a été envoyé.'

/** redirectTo always same-origin + fixed next path (no free client URL). */
function buildRecoveryRedirectTo(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/auth/callback?next=${encodeURIComponent('/admin/update-password')}`
}

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setStatus('error')
      setMessage('Entrez une adresse email valide.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      if (IS_DEMO_MODE) {
        // Message neutre même en démo (anti-énumération / pas d’info infra)
        setStatus('sent')
        return
      }
      const client = getBrowserClient()
      if (!client) {
        setStatus('error')
        setMessage('Service indisponible. Réessayez plus tard.')
        return
      }
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildRecoveryRedirectTo(),
      })
      // Toujours message neutre (anti-énumération), même si erreur réseau
      if (error) {
        setStatus('sent')
        return
      }
      setStatus('sent')
    } catch {
      setStatus('sent')
    }
  }

  return (
    <div className="min-h-screen bg-cinematic-deep flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md card-cinematic p-8"
      >
        <Link
          href="/admin/login"
          className="flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-6 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la connexion
        </Link>

        <div className="text-center mb-6">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <Image
              src="/images/logo-mark.png"
              alt="CIER"
              width={56}
              height={56}
              priority
              className="relative w-14 h-14 object-contain"
            />
          </div>
          <div className="section-label-dark justify-center">
            <ShieldCheck className="w-3 h-3" /> Administration
          </div>
          <h1 className="font-cinzel font-black text-pearl text-xl">Mot de passe oublié</h1>
          <p className="font-inter text-sm text-pearl/45 mt-1.5">
            Réinitialisation du compte administrateur.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
            <p className="font-inter text-sm text-pearl/70">{NEUTRAL_MSG}</p>
            <Link href="/admin/login" className="btn-gold-cinematic w-full py-3 text-sm mt-2 justify-center inline-flex">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm font-inter text-danger">
                <AlertCircle className="w-4 h-4" /> {message}
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="email"
                className="input-royal pl-11"
                placeholder="Adresse email administrateur"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-gold-cinematic w-full py-3.5 text-sm disabled:opacity-60"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Envoi…
                </>
              ) : (
                'Envoyer le lien'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
