'use client'
/**
 * Formulaire public « nouveau venu » — Lot V2.1B (UI uniquement).
 *
 * ⚠️ VISUEL SEULEMENT : validation côté client puis écran de succès.
 * AUCUN `fetch`, AUCUNE connexion Supabase, AUCUNE persistance. La soumission
 * réelle (relais serveur sécurisé + consentement stocké) est réservée à V2.1D.
 */
import { useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { SOURCES } from '@/lib/mock/nouveaux-venus'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NouveauVenuForm() {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault() // aucune requête réseau
    setError(null)
    if (prenom.trim().length < 2) { setError('Merci d’indiquer votre prénom.'); return }
    if (!telephone.trim()) { setError('Merci d’indiquer votre numéro de téléphone.'); return }
    if (email.trim() && !EMAIL_RE.test(email.trim())) { setError('L’adresse email semble invalide.'); return }
    if (!consent) { setError('Merci d’accepter d’être recontacté pour valider votre inscription.'); return }
    // Simulation visuelle uniquement (V2.1B) — aucune donnée envoyée.
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setDone(true) }, 500)
  }

  if (done) {
    return (
      <div className="card-cinematic-gold p-8 text-center">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#22C55E' }} />
        <h2 className="font-cinzel text-xl font-black text-white mb-2">Merci !</h2>
        <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.7)' }}>
          Merci, votre inscription a bien été reçue. Notre équipe vous contactera.
        </p>
        <p className="font-inter text-[11px] mt-4" style={{ color: 'rgba(245,230,216,0.35)' }}>
          Mode démo (V2.1B) — aucune donnée n’a été enregistrée.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="card-cinematic p-6 md:p-8 space-y-4">
      {error && <div className="p-3 rounded-xl text-sm font-inter" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)' }}>{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Prénom *</label>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Votre prénom" className="input-cinematic" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Nom</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom (optionnel)" className="input-cinematic" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Téléphone *</label>
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+225 …" inputMode="tel" className="input-cinematic" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com (optionnel)" inputMode="email" className="input-cinematic" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Comment nous avez-vous connus ?</label>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="input-cinematic">
          <option value="">— Choisir —</option>
          {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Votre message / besoin</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Un mot, une demande de prière, un besoin… (optionnel)" className="input-cinematic resize-none" />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 flex-shrink-0" />
        <span className="text-xs font-inter leading-relaxed" style={{ color: 'rgba(245,230,216,0.6)' }}>
          J&apos;accepte d&apos;être recontacté par l&apos;équipe d&apos;accueil de La Citadelle et je consens au traitement de mes données à cette fin. *
        </span>
      </label>

      <button type="submit" disabled={submitting} className="btn-gold-cinematic w-full justify-center disabled:opacity-60">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : <><Send className="w-4 h-4" /> Envoyer</>}
      </button>
    </form>
  )
}
