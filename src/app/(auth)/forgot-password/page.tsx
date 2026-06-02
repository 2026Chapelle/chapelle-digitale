'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'

const authClient = () => getBrowserClient() ?? supabase
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) { setStatus('error'); setMessage('Entrez une adresse email valide.'); return }
    setStatus('loading'); setMessage('')
    try {
      const { error } = await authClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/member/dashboard/parametres`,
      })
      if (error) { setStatus('error'); setMessage(error.message) }
      else setStatus('sent')
    } catch {
      setStatus('error'); setMessage('Envoi impossible. Réessayez.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-abyss" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-10 blur-[150px]" style={{ background: 'radial-gradient(circle, #4B0082 0%, transparent 70%)' }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-md">
        <Link href="/login" className="flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-8 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Retour à la connexion
        </Link>

        <div className="rounded-3xl overflow-hidden border border-gold/15 shadow-premium" style={{ background: 'linear-gradient(145deg, #0a0018 0%, #050505 100%)' }}>
          <div className="h-1 bg-gradient-gold" />
          <div className="p-8 md:p-10">
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <Image src="/images/logo-mark.png" alt="CIER" width={64} height={64} priority className="relative w-16 h-16 object-contain drop-shadow-[0_4px_18px_rgba(212,175,55,0.5)]" />
              </div>
              <h1 className="font-cinzel text-xl font-bold text-pearl mb-2">Mot de passe oublié</h1>
              <p className="text-pearl/40 font-inter text-sm">Recevez un lien de réinitialisation par email.</p>
            </div>

            {status === 'sent' ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
                <p className="font-inter text-sm text-pearl/70">
                  Si un compte existe pour <span className="text-pearl font-semibold">{email}</span>, un lien de réinitialisation vient d’être envoyé.
                </p>
                <Link href="/login" className="btn-gold w-full justify-center py-3 mt-2">Retour à la connexion</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {status === 'error' && (
                  <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-inter" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{message}</span>
                  </div>
                )}
                <div>
                  <label htmlFor="fp-email" className="block text-xs font-semibold text-pearl/50 font-inter mb-2 tracking-wider uppercase">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
                    <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required autoComplete="email" className="input-royal pl-11" />
                  </div>
                </div>
                <button type="submit" disabled={status === 'loading'} className="btn-gold w-full justify-center py-3.5 disabled:opacity-50">
                  {status === 'loading' ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</span> : 'Envoyer le lien'}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-pearl/40 font-inter mt-8">
              Pas encore membre ? <Link href="/register" className="text-gold hover:text-gold-light font-semibold">Rejoindre la Chapelle</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
