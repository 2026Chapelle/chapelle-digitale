'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowRight, Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { events as track } from '@/lib/analytics'

/* ============================================================
   FormationEnrollButton — entrée RÉELLE dans une formation.
   Connecté    → POST /api/member/formations/enroll + redirection.
   Non connecté→ /register?next=… (création de compte d'abord).
   Thème sombre (page formation cinématique).
   ============================================================ */

export function FormationEnrollButton({
  formationId, slug, label = 'Commencer cette formation',
}: { formationId: string; slug: string; label?: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onClick() {
    track.ctaClick('formation_enroll', { slug })
    if (!user) {
      router.push(`/register?next=${encodeURIComponent(`/formations/${slug}`)}`)
      return
    }
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/member/formations/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation_id: formationId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) throw new Error(json?.message || 'Échec')
      track.formationStarted(slug)
      toast.success('Vous êtes inscrit ! Bonne formation. 📖')
      router.push('/member/dashboard/formations')
    } catch {
      toast.error('Une erreur est survenue. Réessayez dans un instant.')
      setLoading(false)
    }
  }

  return (
    <button onClick={onClick} disabled={loading} className="btn-gold-cinematic w-full justify-center mb-4 disabled:opacity-60">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : user ? null : <Lock className="w-3.5 h-3.5" />}
      {label}
      {!loading && <ArrowRight className="w-4 h-4" />}
    </button>
  )
}
