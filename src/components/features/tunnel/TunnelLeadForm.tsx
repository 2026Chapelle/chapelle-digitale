'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { submitTunnelLead, EMAIL_REGEX } from '@/lib/fluent'
import type { TunnelStageKey } from '@/lib/tunnel'
import { cn } from '@/lib/utils'

interface TunnelLeadFormProps {
  /** Étape du tunnel (détermine le tag FluentCRM). */
  stage: TunnelStageKey
  /** Identifiant du formulaire source (analytics + tag). */
  source: string
  /** Texte du bouton. */
  cta?: string
  /** Cases d'intérêt / équipes (facultatif). */
  interets?: string[]
  /** Afficher le champ téléphone (WhatsApp). */
  withPhone?: boolean
  /** Afficher le champ message libre. */
  withMessage?: boolean
  /** Message de succès personnalisé. */
  successText?: string
  className?: string
}

/**
 * Formulaire de capture de lead du Tunnel Royal.
 *
 * Compatible Fluent Forms : poste vers /api/tunnel/lead qui relaie dans
 * FluentCRM (tag de l'étape). Si l'équipe préfère un Fluent Form natif
 * hébergé sur WordPress, remplacer le <form> par le composant <FluentEmbed/>.
 */
export function TunnelLeadForm({
  stage,
  source,
  cta = 'Envoyer',
  interets,
  withPhone = false,
  withMessage = false,
  successText = 'Merci ! Vous recevez un email de bienvenue dans quelques instants.',
  className,
}: TunnelLeadFormProps) {
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [message, setMessage] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [feedback, setFeedback] = useState('')

  const toggle = (item: string) =>
    setChecked((c) => (c.includes(item) ? c.filter((x) => x !== item) : [...c, item]))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prenom.trim() || !EMAIL_REGEX.test(email)) {
      setStatus('error')
      setFeedback('Renseignez votre prénom et un email valide.')
      return
    }
    setStatus('loading')
    const res = await submitTunnelLead({
      prenom: prenom.trim(),
      email: email.trim(),
      telephone: telephone.trim() || undefined,
      message: message.trim() || undefined,
      interets: checked.length ? checked : undefined,
      stage,
      source,
    })
    if (res.ok) {
      setStatus('success')
      setFeedback(res.message)
    } else {
      setStatus('error')
      setFeedback(res.message)
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('rounded-2xl p-8 text-center', className)}
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}
      >
        <div className="w-14 h-14 rounded-full bg-divine/15 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-divine" />
        </div>
        <h3 className="font-cinzel font-bold text-pearl text-lg mb-2">Bienvenue dans la famille</h3>
        <p className="font-inter text-sm text-pearl/55 max-w-sm mx-auto leading-relaxed">{feedback || successText}</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          className="input-royal"
          placeholder="Votre prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          autoComplete="given-name"
        />
        <input
          className="input-royal"
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      {withPhone && (
        <input
          className="input-royal"
          type="tel"
          placeholder="WhatsApp (facultatif)"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          autoComplete="tel"
        />
      )}

      {interets && interets.length > 0 && (
        <div>
          <p className="font-inter text-xs text-pearl/40 mb-2">Ce qui vous attire (plusieurs choix) :</p>
          <div className="flex flex-wrap gap-2">
            {interets.map((item) => {
              const on = checked.includes(item)
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggle(item)}
                  className="px-3 py-1.5 rounded-full font-inter text-xs font-medium transition-all"
                  style={{
                    background: on ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.1)'}`,
                    color: on ? '#F5E6A7' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {withMessage && (
        <textarea
          className="input-royal min-h-[96px] resize-none"
          placeholder="Un mot pour nous (facultatif)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      )}

      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm font-inter text-danger"
          >
            <AlertCircle className="w-4 h-4" />
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

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
          <>
            {cta} <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="font-inter text-[11px] text-pearl/30 text-center">
        Vos données restent confidentielles. Désinscription en un clic.
      </p>
    </form>
  )
}
