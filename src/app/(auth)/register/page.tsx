'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'
import { PAYS_AFRICAINS, PAYS_DIASPORA, PLATEFORMES } from '@/lib/constants'
import { siteUrl } from '@/lib/site-url'
import toast from 'react-hot-toast'
import { events } from '@/lib/analytics'

const PAYS = [...PAYS_AFRICAINS, ...PAYS_DIASPORA].sort()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Step = 1 | 2 | 3
type FieldErrs = Record<string, string | null>

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errs, setErrs] = useState<FieldErrs>({})

  const [form, setForm] = useState({
    // Step 1 — Identity
    prenom: '',
    nom: '',
    email: '',
    password: '',
    // Step 2 — Profile
    pays: '',
    telephone: '',
    plateforme: '',
    // Step 3 — Spiritual
    baptise: false,
    annee_conversion: '',
    comment: '',
    accept_terms: false,
  })

  const update = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errs[field]) setErrs(prev => ({ ...prev, [field]: null }))
  }

  const validateStep1 = (): boolean => {
    const next: FieldErrs = {}
    if (form.prenom.trim().length < 2) next.prenom = 'Prénom requis (2 caractères min).'
    if (form.nom.trim().length < 2) next.nom = 'Nom requis (2 caractères min).'
    if (!EMAIL_RE.test(form.email)) next.email = 'Adresse email invalide.'
    if (form.password.length < 8) next.password = 'Le mot de passe doit faire au moins 8 caractères.'
    setErrs(next)
    return Object.keys(next).length === 0
  }

  const validateStep2 = (): boolean => {
    const next: FieldErrs = {}
    if (!form.pays) next.pays = 'Sélectionnez votre pays.'
    setErrs(next)
    return Object.keys(next).length === 0
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 1) events.signUpStarted()
    events.joinFunnelStep(`step_${step}_completed`)
    if (step < 3) setStep((step + 1) as Step)
  }

  const handleBack = () => {
    setErrs({})
    if (step > 1) setStep((step - 1) as Step)
  }

  const handleSubmit = async () => {
    if (!form.accept_terms) {
      setErrs({ accept_terms: 'Veuillez accepter les conditions.' })
      toast.error('Veuillez accepter les conditions d\'utilisation')
      return
    }
    setErrs({})
    setLoading(true)

    const { data, error } = await (getBrowserClient() ?? supabase).auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // Lien de confirmation toujours sur le domaine canonique (jamais le host n0c).
        emailRedirectTo: siteUrl('/auth/callback?next=/member/dashboard'),
        data: {
          prenom: form.prenom,
          nom: form.nom,
          pays: form.pays,
          telephone: form.telephone,
          plateforme_principale: form.plateforme,
          baptise: form.baptise,
          role: 'visiteur',
          membre_statut: 'visiteur',
        },
      },
    })

    if (error) {
      toast.error(error.message)
    } else {
      events.signUpCompleted()
      toast.success('Bienvenue dans la famille ! 🎉 Vérifiez votre email.')
      router.push('/member/dashboard?welcome=true')
    }
    setLoading(false)
  }

  const steps = [
    { number: 1, label: 'Identité' },
    { number: 2, label: 'Profil' },
    { number: 3, label: 'Spirituel' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-abyss" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10 blur-[150px]"
        style={{ background: 'radial-gradient(circle, #4B0082 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-8 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Back link */}
        <Link href="/" className="flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-8 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="rounded-3xl overflow-hidden border border-gold/15 shadow-premium"
          style={{ background: 'linear-gradient(145deg, #0a0018 0%, #050505 100%)' }}
        >
          <div className="h-1 bg-gradient-gold" />

          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
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
              <h1 className="font-cinzel text-xl font-bold text-pearl mb-1">
                Rejoindre la Chapelle
              </h1>
              <p className="text-pearl/40 text-sm font-inter">
                Étape {step} sur 3 — {steps[step - 1].label}
              </p>
            </div>

            {/* Progress stepper */}
            <div className="flex items-center justify-center gap-2 mb-10">
              {steps.map((s, i) => (
                <div key={s.number} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-cinzel transition-all duration-300 ${
                    step > s.number
                      ? 'bg-gold text-abyss'
                      : step === s.number
                        ? 'bg-royal/50 border-2 border-gold text-gold'
                        : 'bg-pearl/5 border border-pearl/10 text-pearl/30'
                  }`}>
                    {step > s.number ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-12 h-px mx-1 transition-all duration-500 ${
                      step > s.number ? 'bg-gold' : 'bg-pearl/10'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Steps content */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-prenom" className="block text-xs font-semibold text-pearl/50 mb-2 tracking-wider uppercase">Prénom</label>
                      <input
                        id="reg-prenom"
                        className="input-royal"
                        placeholder="Jean"
                        value={form.prenom}
                        onChange={e => update('prenom', e.target.value)}
                        autoComplete="given-name"
                        aria-invalid={!!errs.prenom}
                        aria-describedby={errs.prenom ? 'reg-prenom-err' : undefined}
                        style={errs.prenom ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                      />
                      {errs.prenom && (
                        <p id="reg-prenom-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.prenom}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="reg-nom" className="block text-xs font-semibold text-pearl/50 mb-2 tracking-wider uppercase">Nom</label>
                      <input
                        id="reg-nom"
                        className="input-royal"
                        placeholder="Dupont"
                        value={form.nom}
                        onChange={e => update('nom', e.target.value)}
                        autoComplete="family-name"
                        aria-invalid={!!errs.nom}
                        aria-describedby={errs.nom ? 'reg-nom-err' : undefined}
                        style={errs.nom ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                      />
                      {errs.nom && (
                        <p id="reg-nom-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.nom}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-semibold text-pearl/50 mb-2 tracking-wider uppercase">Email</label>
                    <input
                      id="reg-email"
                      type="email"
                      className="input-royal"
                      placeholder="jean@email.com"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      autoComplete="email"
                      aria-invalid={!!errs.email}
                      aria-describedby={errs.email ? 'reg-email-err' : undefined}
                      style={errs.email ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                    />
                    {errs.email && (
                      <p id="reg-email-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.email}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-semibold text-pearl/50 mb-2 tracking-wider uppercase">Mot de passe</label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        className="input-royal pr-12"
                        placeholder="Minimum 8 caractères"
                        value={form.password}
                        onChange={e => update('password', e.target.value)}
                        autoComplete="new-password"
                        aria-invalid={!!errs.password}
                        aria-describedby={errs.password ? 'reg-password-err' : undefined}
                        style={errs.password ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        aria-pressed={showPassword}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-pearl/30 hover:text-pearl/70"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errs.password && (
                      <p id="reg-password-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.password}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="reg-pays" className="block text-xs font-semibold text-pearl/50 mb-2 tracking-wider uppercase">Pays</label>
                    <select
                      id="reg-pays"
                      className="input-royal"
                      value={form.pays}
                      onChange={e => update('pays', e.target.value)}
                      aria-invalid={!!errs.pays}
                      aria-describedby={errs.pays ? 'reg-pays-err' : undefined}
                      style={errs.pays ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                    >
                      <option value="">Sélectionnez votre pays</option>
                      <optgroup label="Afrique francophone">
                        {PAYS_AFRICAINS.map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                      <optgroup label="Diaspora">
                        {PAYS_DIASPORA.map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    </select>
                    {errs.pays && (
                      <p id="reg-pays-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.pays}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-pearl/50 mb-2 tracking-wider uppercase">Téléphone (optionnel)</label>
                    <input type="tel" className="input-royal" placeholder="+33 6 00 00 00 00" value={form.telephone}
                      onChange={e => update('telephone', e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-pearl/50 mb-3 tracking-wider uppercase">
                      Quelle plateforme vous attire ?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(PLATEFORMES).slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => update('plateforme', p.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs transition-all ${
                            form.plateforme === p.id
                              ? 'border-gold/40 bg-gold/10 text-gold'
                              : 'border-pearl/10 bg-pearl/3 text-pearl/60 hover:border-pearl/20'
                          }`}
                        >
                          <span>{p.icone}</span>
                          <span className="font-inter truncate">{p.nom}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-semibold text-pearl/50 mb-3 tracking-wider uppercase">
                      Êtes-vous baptisé(e) ?
                    </label>
                    <div className="flex gap-3">
                      {[
                        { value: true, label: 'Oui, baptisé(e)' },
                        { value: false, label: 'Pas encore' },
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => update('baptise', opt.value)}
                          className={`flex-1 py-3 rounded-xl border text-sm font-inter transition-all ${
                            form.baptise === opt.value
                              ? 'border-gold/40 bg-gold/10 text-gold'
                              : 'border-pearl/10 text-pearl/50 hover:border-pearl/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-pearl/50 mb-2 tracking-wider uppercase">
                      Comment avez-vous entendu parler de nous ?
                    </label>
                    <select className="input-royal" value={form.comment} onChange={e => update('comment', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      <option value="youtube">YouTube</option>
                      <option value="facebook">Facebook / Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="ami">Recommandé par un ami</option>
                      <option value="tiktok">TikTok</option>
                      <option value="google">Recherche Google</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.accept_terms}
                      onChange={e => update('accept_terms', e.target.checked)}
                      className="mt-1 rounded"
                    />
                    <span className="text-sm text-pearl/50 font-inter leading-relaxed">
                      J'accepte les{' '}
                      <Link href="/conditions" className="text-gold hover:underline">conditions d'utilisation</Link>
                      {' '}et la{' '}
                      <Link href="/confidentialite" className="text-gold hover:underline">politique de confidentialité</Link>
                      {' '}de la CIER.
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button onClick={handleBack} className="btn-ghost flex-1 justify-center">
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
              )}

              {step < 3 ? (
                <button onClick={handleNext} className="btn-gold flex-1 justify-center group">
                  Suivant
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-gold flex-1 justify-center disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-abyss/30 border-t-abyss rounded-full animate-spin" />
                      Création...
                    </span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Rejoindre la Chapelle
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-center text-sm text-pearl/40 font-inter mt-6">
              Déjà membre ?{' '}
              <Link href="/login" className="text-gold hover:text-gold-light font-semibold transition-colors">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
