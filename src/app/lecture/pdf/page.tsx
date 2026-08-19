'use client'
/**
 * CITADELLE PDF-1 — Expérience de lecture DÉDIÉE : /lecture/pdf?src=…&title=…
 *
 * Rend le même lecteur (`PdfReader`) en plein écran, pour un lien partageable /
 * réutilisable hors d'une page métier. Le moteur PDF est chargé paresseusement
 * (dynamic + ssr:false).
 *
 * Garde-fou : `src` doit être une URL http(s) SAME-ORIGIN ou *.supabase.co
 * (les PDF Citadelle vivent dans le Storage Supabase / l'app). On refuse toute
 * autre origine — le lecteur ne sert pas de proxy d'affichage arbitraire.
 * NB : aucun gate d'accès ici (les PDF actuels sont publics) — la protection
 * privée (bucket privé + URL signée) relève d'un lot ultérieur.
 */
import { Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PdfErrorState } from '@/components/pdf/PdfErrorState'
import { PdfLoadingState } from '@/components/pdf/PdfLoadingState'

const PdfReader = dynamic(() => import('@/components/pdf/PdfReader').then((m) => m.PdfReader), {
  ssr: false,
})

function isAllowedSource(raw: string): string | null {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    const u = new URL(raw, origin)
    if (!/^https?:$/.test(u.protocol)) return null
    if (origin && u.origin === origin) return u.toString()
    if (u.hostname.endsWith('.supabase.co')) return u.toString()
    return null
  } catch {
    return null
  }
}

function LectureInner() {
  const router = useRouter()
  const params = useSearchParams()
  const rawSrc = params.get('src') ?? ''
  const title = params.get('title') ?? undefined
  const src = useMemo(() => isAllowedSource(rawSrc), [rawSrc])

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/member/dashboard/ressources')
  }

  if (!src) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: '#050308' }}>
        <PdfErrorState
          detail="Lien de document invalide ou non autorisé."
          onRetry={undefined}
          fallbackUrl={null}
        />
      </div>
    )
  }

  return (
    <PdfReader src={src} title={title} downloadUrl={src} variant="overlay" onClose={goBack} />
  )
}

export default function LecturePdfPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: '#050308' }}>
          <PdfLoadingState />
        </div>
      }
    >
      <LectureInner />
    </Suspense>
  )
}
