'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'
import toast from 'react-hot-toast'
import { events } from '@/lib/analytics'

/** Client cookie-based (session SSR réelle). */
const authClient = () => getBrowserClient() ?? supabase

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [emailErr, setEmailErr] = useState<string | null>(null)
  const [passwordErr, setPasswordErr] = useState<string | null>(null)

  const validate = (): boolean => {
    let ok = true
    if (!EMAIL_RE.test(email)) {
      setEmailErr('Entrez une adresse email valide.')
      ok = false
    } else {
      setEmailErr(null)
    }
    if (password.length < 6) {
      setPasswordErr('Le mot de passe doit faire au moins 6 caractères.')
      ok = false
    } else {
      setPasswordErr(null)
    }
    return ok
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return
    setLoading(true)
    events.signInStarted('email')

    const { error } = await authClient().auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : error.message
      setFormError(msg)
      toast.error(msg)
    } else {
      toast.success('Bienvenue dans la Chapelle ! ✨')
      router.push('/member/dashboard')
    }
    setLoading(false)
  }

  // Connexion sociale : masquée tant que les providers OAuth ne sont pas activés
  // dans Supabase (évite l'erreur "Unsupported provider"). Passer à true une fois
  // Google/Facebook configurés dans Supabase → Authentication → Providers.
  const SOCIAL_ENABLED = false

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-abyss" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-10 blur-[150px]"
        style={{ background: 'radial-gradient(circle, #4B0082 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-10 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back link */}
        <Link href="/" className="flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-8 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        {/* Card */}
        <div className="rounded-3xl overflow-hidden border border-gold/15 shadow-premium"
          style={{ background: 'linear-gradient(145deg, #0a0018 0%, #050505 100%)' }}
        >
          {/* Gold top bar */}
          <div className="h-1 bg-gradient-gold" />

          <div className="p-8 md:p-10">
            {/* Logo & Title */}
            <div className="text-center mb-10">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full opacity-50 blur-2xl" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
                <Image
                  src="/images/logo-mark.png"
                  alt="CIER — La Chapelle Internationale des Élus du Royaume"
                  width={64}
                  height={64}
                  priority
                  className="relative w-16 h-16 object-contain drop-shadow-[0_4px_18px_rgba(212,175,55,0.5)]"
                />
              </div>
              <h1 className="font-cinzel text-xl font-bold text-pearl mb-2">
                Connexion
              </h1>
              <p className="text-pearl/40 font-inter text-sm">
                Entrez dans votre espace spirituel
              </p>
            </div>

            {/* Connexion sociale masquée tant que Google/Facebook ne sont pas
                activés dans Supabase (évite l'erreur "Unsupported provider"). */}
            {SOCIAL_ENABLED && (
              <div className="space-y-3 mb-8" />
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-inter"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#FCA5A5',
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-pearl/50 font-inter mb-2 tracking-wider uppercase">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (emailErr) setEmailErr(null) }}
                  placeholder="votre@email.com"
                  required
                  autoComplete="email"
                  aria-invalid={!!emailErr}
                  aria-describedby={emailErr ? 'login-email-err' : undefined}
                  className="input-royal"
                  style={emailErr ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                />
                {emailErr && (
                  <p id="login-email-err" className="text-[11px] font-inter mt-1.5" style={{ color: '#FCA5A5' }}>
                    {emailErr}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="login-password" className="text-xs font-semibold text-pearl/50 font-inter tracking-wider uppercase">
                    Mot de passe
                  </label>
                  <Link href="/forgot-password" className="text-xs text-gold/70 hover:text-gold transition-colors font-inter">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (passwordErr) setPasswordErr(null) }}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    aria-invalid={!!passwordErr}
                    aria-describedby={passwordErr ? 'login-password-err' : undefined}
                    className="input-royal pr-12"
                    style={passwordErr ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={showPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-pearl/30 hover:text-pearl/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErr && (
                  <p id="login-password-err" className="text-[11px] font-inter mt-1.5" style={{ color: '#FCA5A5' }}>
                    {passwordErr}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full justify-center py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-abyss/30 border-t-abyss rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm text-pearl/40 font-inter mt-8">
              Pas encore membre ?{' '}
              <Link href="/register" className="text-gold hover:text-gold-light font-semibold transition-colors">
                Rejoindre la Chapelle
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
