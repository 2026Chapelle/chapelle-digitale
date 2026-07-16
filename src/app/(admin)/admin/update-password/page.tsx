'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { IS_DEMO_MODE } from '@/lib/supabase'

const MIN_LEN = 8

export default function AdminUpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (IS_DEMO_MODE) {
        if (!cancelled) {
          setHasSession(false)
          setReady(true)
        }
        return
      }
      const client = getBrowserClient()
      if (!client) {
        if (!cancelled) {
          setHasSession(false)
          setReady(true)
        }
        return
      }
      const { data } = await client.auth.getUser()
      if (!cancelled) {
        setHasSession(!!data.user)
        setReady(true)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    if (!hasSession) {
      setStatus('error')
      setMessage('Session de récupération absente ou expirée. Relancez la demande.')
      return
    }
    if (password.length < MIN_LEN) {
      setStatus('error')
      setMessage(`Le mot de passe doit contenir au moins ${MIN_LEN} caractères.`)
      return
    }
    if (password !== confirm) {
      setStatus('error')
      setMessage('Les deux mots de passe ne correspondent pas.')
      return
    }
    const client = getBrowserClient()
    if (!client) {
      setStatus('error')
      setMessage('Client indisponible.')
      return
    }
    setStatus('loading')
    try {
      const { error } = await client.auth.updateUser({ password })
      if (error) {
        setStatus('error')
        setMessage(error.message || 'Mise à jour impossible.')
        return
      }
      setStatus('success')
      setMessage('Mot de passe mis à jour. Connectez-vous avec votre compte administrateur.')
      try {
        await client.auth.signOut()
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        router.replace('/admin/login')
        router.refresh()
      }, 1800)
    } catch {
      setStatus('error')
      setMessage('Mise à jour impossible. Réessayez.')
    }
  }

  return (
    <div className="min-h-screen bg-cinematic-deep flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md card-cinematic p-8"
      >
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
            <ShieldCheck className="w-3 h-3" /> Récupération
          </div>
          <h1 className="font-cinzel font-black text-pearl text-xl">Nouveau mot de passe</h1>
          <p className="font-inter text-sm text-pearl/45 mt-1.5">
            Définissez un mot de passe pour le compte administrateur.
          </p>
        </div>

        {!ready ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : !hasSession ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center gap-2 text-sm font-inter text-danger justify-center">
              <AlertCircle className="w-4 h-4" />
              Session de récupération absente ou expirée.
            </div>
            <Link href="/admin/forgot-password" className="btn-gold-cinematic w-full py-3 text-sm inline-flex justify-center">
              Demander un nouveau lien
            </Link>
            <Link href="/admin/login" className="block text-xs text-pearl/40 hover:text-gold font-inter">
              Retour à la connexion
            </Link>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
            <p className="font-inter text-sm text-pearl/70">{message}</p>
            <p className="font-inter text-xs text-pearl/40">Redirection vers la connexion…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="password"
                className="input-royal pl-11"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_LEN}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="password"
                className="input-royal pl-11"
                placeholder="Confirmer le mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_LEN}
                required
              />
            </div>
            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm font-inter text-danger">
                <AlertCircle className="w-4 h-4 shrink-0" /> {message}
              </div>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-gold-cinematic w-full py-3.5 text-sm disabled:opacity-60"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Mise à jour…
                </>
              ) : (
                'Enregistrer le mot de passe'
              )}
            </button>
            <p className="font-inter text-[11px] text-pearl/35 text-center">
              Minimum {MIN_LEN} caractères. Vous devrez ensuite vous reconnecter.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  )
}
