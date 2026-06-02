'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Lock, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  )
}

function AdminLoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/admin/dashboard'

  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="min-h-screen bg-cinematic-deep flex items-center justify-center px-4">
      <div className="halo-gold w-[560px] h-[320px] top-1/4 left-1/2 -translate-x-1/2" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md card-cinematic p-8"
      >
        <div className="text-center mb-7">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full opacity-50 blur-xl" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
            <Image src="/images/logo-mark.png" alt="CIER" width={56} height={56} priority className="relative w-14 h-14 object-contain drop-shadow-[0_3px_14px_rgba(212,175,55,0.5)]" />
          </div>
          <div className="section-label-dark justify-center"><ShieldCheck className="w-3 h-3" /> Back-office sécurisé</div>
          <h1 className="font-cinzel font-black text-pearl text-xl">Administration</h1>
          <p className="font-inter text-sm text-pearl/45 mt-1.5">Citadelle du Royaume — accès réservé</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button type="submit" disabled={status === 'loading'} className="btn-gold-cinematic w-full py-3.5 text-sm disabled:opacity-60">
            {status === 'loading' ? (<><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</>) : (<>Entrer dans le back-office <ArrowRight className="w-4 h-4" /></>)}
          </button>
        </form>

        <p className="font-inter text-[11px] text-pearl/30 text-center mt-6">
          Accès journalisé. Réservé à l&apos;équipe pastorale & technique.
        </p>
      </motion.div>
    </div>
  )
}
