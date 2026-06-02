'use client'
/**
 * Garde client de l'espace membre : si aucune session active (et hors mode démo),
 * redirige immédiatement vers /login. Complète le middleware serveur — utile
 * notamment après une déconnexion côté client.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

export function MemberGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isDemo) return
    if (!loading && !user) {
      router.replace('/login')
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
  }, [loading, user, isDemo, router])

  if (!isDemo && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-abyss">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    )
  }
  if (!isDemo && !user) return null // évite le flash de contenu avant redirection

  return <>{children}</>
}
