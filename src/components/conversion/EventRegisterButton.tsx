'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRight, CheckCircle, Loader2, CalendarCheck } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { events as track } from '@/lib/analytics'

/* ============================================================
   EventRegisterButton — inscription RÉELLE à un événement.
   Membre connecté : inscription directe. Visiteur : capture
   (prénom + email) → lead + email de confirmation.
   Thème clair (la page Agenda est sur fond blanc).
   ============================================================ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EventRegisterButton({
  eventId, eventTitre, eventDate, label = "S'inscrire",
}: { eventId: string; eventTitre: string; eventDate?: string; label?: string }) {
  const { user, profile } = useAuth()
  const isMember = !!user
  const [open, setOpen] = useState(false)
  const [prenom, setPrenom] = useState((profile?.prenom as string) || '')
  const [email, setEmail] = useState((profile?.email as string) || '')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (submitting) return
    if (!isMember && (prenom.trim().length < 2 || !EMAIL_RE.test(email.trim()))) {
      toast.error('Indiquez votre prénom et un email valide.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/evenements/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, event_titre: eventTitre, event_date: eventDate, prenom: prenom.trim(), email: email.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) throw new Error(json?.message || 'Échec')
      track.joinFunnelStep('event_inscription', { event: eventTitre })
      setDone(true)
      toast.success('Inscription confirmée ! 🎉')
    } catch {
      toast.error('Une erreur est survenue. Réessayez dans un instant.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 font-inter font-semibold rounded-full px-6 py-3"
        style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.3)' }}>
        <CheckCircle className="w-4 h-4" /> Inscription confirmée
      </div>
    )
  }

  // Membre connecté : inscription en un clic.
  if (isMember && !open) {
    return (
      <button onClick={submit} disabled={submitting}
        className="inline-flex items-center gap-2 font-inter font-semibold rounded-full px-6 py-3 transition-all hover:gap-3 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
        {label}
      </button>
    )
  }

  // Visiteur : bouton → formulaire de capture inline.
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 font-inter font-semibold rounded-full px-6 py-3 transition-all hover:gap-3"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
        {label} <ArrowRight className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="w-full rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.2)' }}>
      <p className="font-inter text-sm font-semibold mb-3" style={{ color: 'rgba(245,230,216,0.85)' }}>Réservez votre place — c&apos;est gratuit</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Votre prénom" maxLength={60} className="input-cinematic flex-1" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre email" maxLength={120} className="input-cinematic flex-1" />
        <button onClick={submit} disabled={submitting}
          className="btn-gold-cinematic whitespace-nowrap disabled:opacity-60">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Je m&apos;inscris</>}
        </button>
      </div>
      <p className="font-inter text-[11px] mt-2" style={{ color: 'rgba(245,230,216,0.4)' }}>Vous recevrez une confirmation et un rappel par email.</p>
    </div>
  )
}
