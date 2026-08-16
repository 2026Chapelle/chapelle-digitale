'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { PasskeyLoginButton } from '../parametres/PasskeysManager'

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  )
}

type Mode = 'code' | 'account'

function AdminLoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/admin/dashboard'
  const urlError = params.get('error')

  // Compte administrateur par défaut dès que Supabase est configuré
  const [mode, setMode] = useState<Mode>(IS_DEMO_MODE ? 'code' : 'account')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState(() => {
    if (urlError === 'recovery') {
      return 'Lien de récupération invalide ou expiré. Reconnectez-vous ou demandez un nouveau lien.'
    }
    return ''
  })

  function switchMode(m: Mode) {
    setMode(m)
    setStatus('idle')
    setMessage('')
  }

  // ── Mode CODE (legacy) ────────────────────────────────────────────────────
  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.ok) {
        router.replace(redirect)
        router.refresh()
      } else {
        setStatus('error')
        setMessage(data.message || "Code d'accès incorrect.")
      }
    } catch {
      setStatus('error')
      setMessage('Connexion impossible. Réessayez.')
    }
  }

  // ── Mode COMPTE (nominatif Supabase + cookie legacy) ──────────────────────
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setStatus('loading')
    setMessage('')
    const client = getBrowserClient()
    if (!client) {
      setStatus('error')
      setMessage('Connexion nominative indisponible.')
      return
    }
    try {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        setStatus('error')
        setMessage('Email ou mot de passe incorrect.')
        return
      }
      // Seconde barrière : rôle admin serveur + cookie cier_admin
      const res = await fetch('/api/admin/auth-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (data.ok) {
        router.replace(redirect)
        router.refresh()
        return
      }
      // Échec 2e étape : ne jamais laisser une session partielle
      try {
        await client.auth.signOut()
      } catch {
        /* ignore */
      }
      setStatus('error')
      setMessage(
        data.message ||
          "Ce compte n'a pas accès à l'administration. Session annulée.",
      )
    } catch {
      try {
        await client.auth.signOut()
      } catch {
        /* ignore */
      }
      setStatus('error')
      setMessage('Connexion impossible. Réessayez.')
    }
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => switchMode(m)}
      className={`flex-1 text-xs font-inter font-semibold py-2 rounded-lg transition-colors ${mode === m ? 'bg-gold/15 text-gold' : 'text-pearl/40 hover:text-pearl/70'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-cinematic-deep flex items-center justify-center px-4">
      <div className="halo-gold w-[560px] h-[320px] top-1/4 left-1/2 -translate-x-1/2" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md card-cinematic p-8"
      >
        <div className="text-center mb-6">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div
              className="absolute inset-0 rounded-full opacity-50 blur-xl"
              style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
            />
            <Image
              src="/images/logo-mark.png"
              alt="CIER"
              width={56}
              height={56}
              priority
              className="relative w-14 h-14 object-contain drop-shadow-[0_3px_14px_rgba(212,175,55,0.5)]"
            />
          </div>
          <div className="section-label-dark justify-center">
            <ShieldCheck className="w-3 h-3" /> Back-office sécurisé
          </div>
          <h1 className="font-cinzel font-black text-pearl text-xl">Administration</h1>
          <p className="font-inter text-sm text-pearl/45 mt-1.5">
            Citadelle du Royaume — accès réservé
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 mb-5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {tab('account', 'Compte administrateur')}
          {tab('code', "Code d'accès")}
        </div>

        {mode === 'code' ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div
              className="rounded-lg px-3 py-2.5 text-[11px] font-inter leading-relaxed"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'rgba(253, 230, 138, 0.9)',
              }}
            >
              Le code d&apos;accès seul ne permet pas d&apos;utiliser les fonctions ERP
              sécurisées. Utilisez le compte administrateur pour la hiérarchie, les
              paramètres d&apos;unité et le pastoral.
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="password"
                className="input-royal pl-11"
                placeholder="Code d'accès administrateur"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm font-inter text-danger">
                <AlertCircle className="w-4 h-4" /> {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-gold-cinematic w-full py-3.5 text-sm disabled:opacity-60"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Vérification…
                </>
              ) : (
                <>
                  Entrer dans le back-office <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="email"
                className="input-royal pl-11"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="password"
                className="input-royal pl-11"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm font-inter text-danger">
                <AlertCircle className="w-4 h-4" /> {message}
              </div>
            )}
            {status === 'idle' && message && urlError === 'recovery' && (
              <div className="flex items-center gap-2 text-sm font-inter text-amber-300/90">
                <AlertCircle className="w-4 h-4" /> {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-gold-cinematic w-full py-3.5 text-sm disabled:opacity-60"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Vérification…
                </>
              ) : (
                <>
                  Se connecter <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <div className="flex flex-col items-center gap-1.5">
              <Link
                href="/admin/forgot-password"
                className="text-[11px] font-inter text-gold/70 hover:text-gold transition-colors"
              >
                Mot de passe oublié
              </Link>
              <p className="font-inter text-[11px] text-pearl/35 text-center">
                Réservé aux comptes disposant d&apos;un accès administrateur.
              </p>
            </div>
          </form>
        )}

        <PasskeyLoginButton
          onSuccess={() => {
            router.replace(redirect)
            router.refresh()
          }}
        />

        <p className="font-inter text-[11px] text-pearl/30 text-center mt-6">
          Accès journalisé. Réservé à l&apos;équipe pastorale &amp; technique.
        </p>
      </motion.div>
    </div>
  )
}
