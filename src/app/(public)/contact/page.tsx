'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Phone, MapPin, Send, MessageCircle, Clock, Globe, CheckCircle, ArrowRight,
  Info, Heart, HandHeart, Newspaper, Wrench, Cross, AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import { track } from '@/lib/analytics'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Siège officiel (information vérifiée). Aucun bureau fictif.
const OFFICES = [
  {
    ville: 'Abidjan — Siège Afrique',
    pays: '🇨🇮 Côte d\'Ivoire',
    adresse: 'Rue M123, Commune de Cocody, Angré',
    email: 'info@chapelleduroyaume.org',
    tel: '+225 07 48 84 24 15',
    horaires: 'Lun–Sam 8h–17h WAT',
    couleur: '#D4AF37',
  },
]

type Subject = { id: string; label: string; icon: LucideIcon }
const SUBJECTS: Subject[] = [
  { id: 'info',         label: 'Informations générales',  icon: Info },
  { id: 'adhesion',     label: "Demande d'adhésion",       icon: Cross },
  { id: 'priere',       label: 'Requête de prière',       icon: Heart },
  { id: 'partenariat',  label: 'Partenariat ministériel', icon: HandHeart },
  { id: 'presse',       label: 'Presse & Médias',          icon: Newspaper },
  { id: 'technique',    label: 'Support technique',        icon: Wrench },
]

type FieldErrs = Record<string, string | null>

export default function ContactPage() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [sujet, setSujet] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errs, setErrs] = useState<FieldErrs>({})

  const validate = (): boolean => {
    const next: FieldErrs = {}
    if (nom.trim().length < 2) next.nom = 'Indiquez votre nom (2 caractères min).'
    if (!EMAIL_RE.test(email)) next.email = 'Adresse email invalide.'
    if (!sujet) next.sujet = 'Sélectionnez l\'objet de votre message.'
    if (message.trim().length < 10) next.message = 'Votre message doit faire au moins 10 caractères.'
    setErrs(next)
    return Object.keys(next).length === 0
  }

  const clearErr = (field: string) => {
    if (errs[field]) setErrs(prev => ({ ...prev, [field]: null }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    track('contact_submit', { sujet })
    try {
      if (!IS_DEMO_MODE) {
        // Enregistrement réel du message (clé anon + RLS insert public).
        const { error } = await supabase.from('contact_messages').insert({
          nom: nom.trim(), email: email.trim(), sujet, message: message.trim(),
        })
        if (error) {
          setErrs({ message: "L'envoi a échoué. Réessayez dans un instant." })
          setLoading(false)
          return
        }
        // Notification email à l'admin (best-effort, ne bloque pas l'utilisateur).
        fetch('/api/notify/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom: nom.trim(), email: email.trim(), sujet, message: message.trim() }),
        }).catch(() => {})
      } else {
        await new Promise(r => setTimeout(r, 800))
      }
      setSuccess(true)
    } catch {
      setErrs({ message: 'Erreur réseau. Réessayez.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-abyss">

      {/* Hero */}
      <div className="relative pt-32 pb-20 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[100px] opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }} />
        <div className="relative container-royal text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="section-label justify-center mb-4">Nous Rejoindre</div>
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl font-black text-pearl mb-5">
              Parlons
              <span className="text-gradient-gold block">Ensemble</span>
            </h1>
            <p className="font-inter text-pearl/50 text-lg max-w-2xl mx-auto">
              Notre équipe pastorale et administrative est à votre écoute.
              Que vous ayez une question, une requête de prière ou souhaitiez nous rejoindre — nous sommes là.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Form — left */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-3"
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card-royal flex flex-col items-center text-center py-16"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '2px solid rgba(212,175,55,0.25)' }}
                  >
                    <CheckCircle className="w-9 h-9 text-gold" />
                  </motion.div>
                  <h2 className="font-cinzel text-2xl font-bold text-pearl mb-3">Message envoyé !</h2>
                  <p className="font-inter text-pearl/50 mb-6 max-w-sm">
                    Nous avons bien reçu votre message et nous vous répondrons sous 24h ouvrées.
                  </p>
                  <button
                    onClick={() => { setSuccess(false); setNom(''); setEmail(''); setSujet(''); setMessage('') }}
                    className="btn-ghost text-sm"
                  >
                    Envoyer un autre message
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="card-royal space-y-6"
                >
                  <h2 className="font-cinzel text-xl font-bold text-pearl">Envoyer un Message</h2>

                  {/* Sujet */}
                  <div>
                    <label className="text-xs font-semibold text-pearl/40 font-inter uppercase tracking-wider mb-3 block">Objet de votre message</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2" role="radiogroup" aria-label="Objet du message" aria-invalid={!!errs.sujet}>
                      {SUBJECTS.map(s => {
                        const active = sujet === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => { setSujet(s.id); clearErr('sujet') }}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-inter font-medium transition-all text-left"
                            style={{
                              borderColor: active ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.07)',
                              background: active ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                              color: active ? '#D4AF37' : 'rgba(255,255,255,0.55)',
                            }}
                          >
                            <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{s.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {errs.sujet && (
                      <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: '#FCA5A5' }}>
                        <AlertCircle className="w-3 h-3" /> {errs.sujet}
                      </p>
                    )}
                  </div>

                  {/* Name + email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-nom" className="text-xs font-semibold text-pearl/40 font-inter uppercase tracking-wider mb-1.5 block">Votre nom *</label>
                      <input
                        id="contact-nom"
                        type="text"
                        value={nom}
                        onChange={e => { setNom(e.target.value); clearErr('nom') }}
                        required
                        autoComplete="name"
                        placeholder="Prénom & Nom"
                        aria-invalid={!!errs.nom}
                        aria-describedby={errs.nom ? 'contact-nom-err' : undefined}
                        className="input-royal"
                        style={errs.nom ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                      />
                      {errs.nom && (
                        <p id="contact-nom-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.nom}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="text-xs font-semibold text-pearl/40 font-inter uppercase tracking-wider mb-1.5 block">Adresse email *</label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); clearErr('email') }}
                        required
                        autoComplete="email"
                        placeholder="votre@email.com"
                        aria-invalid={!!errs.email}
                        aria-describedby={errs.email ? 'contact-email-err' : undefined}
                        className="input-royal"
                        style={errs.email ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                      />
                      {errs.email && (
                        <p id="contact-email-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="contact-message" className="text-xs font-semibold text-pearl/40 font-inter uppercase tracking-wider mb-1.5 block">Votre message *</label>
                    <textarea
                      id="contact-message"
                      value={message}
                      onChange={e => { setMessage(e.target.value); clearErr('message') }}
                      required
                      rows={6}
                      placeholder="Décrivez votre demande, votre requête de prière, ou votre question…"
                      aria-invalid={!!errs.message}
                      aria-describedby={errs.message ? 'contact-message-err' : undefined}
                      className="input-royal resize-none"
                      style={errs.message ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                    />
                    {errs.message && (
                      <p id="contact-message-err" className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{errs.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold w-full justify-center py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Envoi en cours…
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer le Message
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-pearl/25 font-inter text-center">
                    Nous répondons sous 24h ouvrées. Vos données sont traitées selon notre politique de confidentialité.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="lg:col-span-2 space-y-5"
          >
            {/* Quick contact */}
            <div className="card-royal space-y-4">
              <h3 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gold" />
                Contact Direct
              </h3>
              <a href="mailto:info@chapelleduroyaume.org"
                className="flex items-center gap-3 p-3 rounded-xl border border-pearl/5 hover:border-gold/20 hover:bg-gold/5 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-pearl font-inter">Email général</div>
                  <div className="text-[11px] text-pearl/40 font-inter">info@chapelleduroyaume.org</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-pearl/20 group-hover:text-gold ml-auto transition-colors" />
              </a>
              <a href="https://wa.me/2250748842415"
                className="flex items-center gap-3 p-3 rounded-xl border border-pearl/5 hover:border-green-400/20 hover:bg-green-400/5 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-green-400/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-pearl font-inter">WhatsApp</div>
                  <div className="text-[11px] text-pearl/40 font-inter">+225 07 48 84 24 15</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-pearl/20 group-hover:text-green-400 ml-auto transition-colors" />
              </a>
            </div>

            {/* Response time */}
            <div className="card-royal">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Délais de Réponse</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Email général', delai: '24h ouvrées', color: '#D4AF37' },
                  { label: 'WhatsApp', delai: '2h en semaine', color: '#22C55E' },
                  { label: 'Requête de prière', delai: 'Immédiate', color: '#EC4899' },
                  { label: 'Demande pastorale', delai: '48-72h', color: '#8B5CF6' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-pearl/50 font-inter">{item.label}</span>
                    <span className="text-xs font-semibold font-inter" style={{ color: item.color }}>{item.delai}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Presence mondiale */}
            <div className="card-royal">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Présence Mondiale</h3>
              </div>
              <p className="text-xs text-pearl/40 font-inter mb-4">
                La CIER est présente dans plus de 45 pays. Trouvez le bureau le plus proche de vous.
              </p>
              <div className="flex flex-wrap gap-2">
                {['🇫🇷', '🇧🇪', '🇨🇭', '🇨🇦', '🇺🇸', '🇨🇩', '🇨🇮', '🇨🇲', '🇬🇦', '🇬🇧', '🇩🇪', '🇮🇹'].map(flag => (
                  <span key={flag} className="text-xl" title="Bureau régional">{flag}</span>
                ))}
                <span className="text-xs text-pearl/30 font-inter self-center">+33 pays</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Offices */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="font-cinzel text-xl font-bold text-pearl mb-6">Nos Bureaux Régionaux</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {OFFICES.map((office) => (
              <div key={office.ville} className="card-royal group hover:border-opacity-30 transition-all"
                style={{ borderColor: `${office.couleur}15` }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-cinzel text-sm font-bold text-pearl">{office.ville}</div>
                    <div className="text-xs text-pearl/40 font-inter">{office.pays}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ background: office.couleur }} />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2 text-xs text-pearl/50 font-inter">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: office.couleur }} />
                    {office.adresse}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-pearl/50 font-inter">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: office.couleur }} />
                    <a href={`mailto:${office.email}`} className="hover:text-pearl transition-colors">{office.email}</a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-pearl/50 font-inter">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: office.couleur }} />
                    {office.tel}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-pearl/50 font-inter">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: office.couleur }} />
                    {office.horaires}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
