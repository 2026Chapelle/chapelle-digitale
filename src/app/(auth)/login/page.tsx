'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'
import toast from 'react-hot-toast'
import { events } from '@/lib/analytics'

/** Client cookie-based en réel (session SSR), fallback démo sinon. */
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
    if (IS_DEMO_MODE) {
      toast.success('Mode démo — connexion simulée ✨')
      router.push('/member/dashboard')
      setLoading(false)
      return
    }

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

  const handleGoogleLogin = async () => {
    events.signInStarted('google')
    if (IS_DEMO_MODE) { toast.success('Mode démo — connexion simulée ✨'); router.push('/member/dashboard'); return }
    await authClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    } as Parameters<typeof supabase.auth.signInWithOAuth>[0])
  }

  const handleFacebookLogin = async () => {
    events.signInStarted('facebook')
    if (IS_DEMO_MODE) { toast.success('Mode démo — connexion simulée ✨'); router.push('/member/dashboard'); return }
    await authClient().auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    } as Parameters<typeof supabase.auth.signInWithOAuth>[0])
  }

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

            {/* Social logins */}
            <div className="space-y-3 mb-8">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-pearl/5 border border-pearl/10 text-pearl/70 hover:bg-pearl/10 hover:border-pearl/20 transition-all font-inter text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuer avec Google
              </button>

              <button
                onClick={handleFacebookLogin}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/20 transition-all font-inter text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continuer avec Facebook
              </button>
            </div>

            {/* Divider */}
            <div className="divider-gold mb-8">
              <span>ou</span>
            </div>

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
