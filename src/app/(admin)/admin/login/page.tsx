'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase-browser'

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

  const [mode, setMode] = useState<Mode>('code')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function switchMode(m: Mode) {
    setMode(m)
    setStatus('idle')
    setMessage('')
  }

  // ── Mode CODE (legacy, inchangé) ──────────────────────────────────────────
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

  // ── Mode COMPTE (nominatif Supabase, additif) ─────────────────────────────
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setStatus('loading')
    setMessage('')
    try {
      const client = getBrowserClient()
      if (!client) {
        setStatus('error')
        setMessage('Connexion nominative indisponible.')
        return
      }
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setStatus('error')
        setMessage('Email ou mot de passe incorrect.')
        return
      }
      // Vérification du rôle admin CÔTÉ SERVEUR + pose du cookie legacy.
      const res = await fetch('/api/admin/auth-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (data.ok) {
        router.replace(redirect)
        router.refresh()
      } else {
        // Refus : révoquer aussi la session côté client (non-admin).
        try { await client.auth.signOut() } catch { /* ignore */ }
        setStatus('error')
        setMessage(data.message || "Ce compte n'a pas accès à l'administration.")
      }
    } catch {
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
            <div className="absolute inset-0 rounded-full opacity-50 blur-xl" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
            <Image src="/images/logo-mark.png" alt="CIER" width={56} height={56} priority className="relative w-14 h-14 object-contain drop-shadow-[0_3px_14px_rgba(212,175,55,0.5)]" />
          </div>
          <div className="section-label-dark justify-center"><ShieldCheck className="w-3 h-3" /> Back-office sécurisé</div>
          <h1 className="font-cinzel font-black text-pearl text-xl">Administration</h1>
          <p className="font-inter text-sm text-pearl/45 mt-1.5">Citadelle du Royaume — accès réservé</p>
        </div>

        {/* Sélecteur de mode de connexion */}
        <div className="flex items-center gap-1 p-1 mb-5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {tab('code', "Code d'accès")}
          {tab('account', 'Compte administrateur')}
        </div>

        {mode === 'code' ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
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
              <div className="flex items-center gap-2 text-sm font-inter text-danger"><AlertCircle className="w-4 h-4" /> {message}</div>
            )}

            <button type="submit" disabled={status === 'loading'} className="btn-gold-cinematic w-full py-3.5 text-sm disabled:opacity-60">
              {status === 'loading' ? (<><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</>) : (<>Entrer dans le back-office <ArrowRight className="w-4 h-4" /></>)}
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
              <div className="flex items-center gap-2 text-sm font-inter text-danger"><AlertCircle className="w-4 h-4" /> {message}</div>
            )}

            <button type="submit" disabled={status === 'loading'} className="btn-gold-cinematic w-full py-3.5 text-sm disabled:opacity-60">
              {status === 'loading' ? (<><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</>) : (<>Se connecter <ArrowRight className="w-4 h-4" /></>)}
            </button>
            <p className="font-inter text-[11px] text-pearl/35 text-center">Réservé aux comptes disposant d&apos;un accès administrateur.</p>
          </form>
        )}

        <p className="font-inter text-[11px] text-pearl/30 text-center mt-6">
          Accès journalisé. Réservé à l&apos;équipe pastorale &amp; technique.
        </p>
      </motion.div>
    </div>
  )
}
