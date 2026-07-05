'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

// Demo user shown when Supabase is not configured
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@chapelleduroyaume.org',
  user_metadata: { prenom: 'Jean', nom: 'Démo' },
} as unknown as User

/** Profil léger exposé au contexte (rôle inclus pour le RBAC). */
export interface AuthProfile {
  id: string
  prenom?: string
  nom?: string
  email?: string
  role?: string
  membre_statut?: string
  avatar_url?: string | null
  [k: string]: any
}

// En démo : profil admin pour rendre TOUS les dashboards visibles à la découverte.
const DEMO_PROFILE: AuthProfile = {
  id: 'demo-user-001', prenom: 'Jean', nom: 'Démo', email: 'demo@chapelleduroyaume.org',
  role: 'admin', membre_statut: 'disciple', avatar_url: '',
}

interface AuthContextType {
  user: User | null
  profile: AuthProfile | null
  role: string | null
  loading: boolean
  isDemo: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: false,
  isDemo: false,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(IS_DEMO_MODE ? DEMO_USER : null)
  const [profile, setProfile] = useState<AuthProfile | null>(IS_DEMO_MODE ? DEMO_PROFILE : null)
  const [loading, setLoading] = useState(!IS_DEMO_MODE)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    const client = getBrowserClient()
    if (!client) { setLoading(false); return }

    const loadProfile = async (u: User | null) => {
      if (!u) { setProfile(null); return }
      try {
        const r = await fetch('/api/member/profile', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.ok && j.data) {
          setProfile({ ...j.data })
        } else {
          // Repli : profil minimal depuis les métadonnées d'auth.
          setProfile({ id: u.id, email: u.email, role: (u.user_metadata as any)?.role ?? 'membre' })
        }
      } catch {
        setProfile({ id: u.id, email: u.email, role: (u.user_metadata as any)?.role ?? 'membre' })
      }
    }

    // Hydrate immédiatement depuis la session existante (cookies)
    client.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      loadProfile(u).finally(() => setLoading(false))
    })

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_, session) => {
        const u = session?.user ?? null
        setUser(u)
        loadProfile(u)
        setLoading(false)
      }
    )

    // Re-synchronise le profil au retour sur l'onglet (rôle/statut modifiés par
    // l'admin sans rechargement). Réutilise loadProfile() — additif, non bloquant.
    const resync = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      client.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user ?? null
        setUser(u)
        loadProfile(u)
      }).catch(() => {})
    }
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('focus', resync)
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('focus', resync)
    }
  }, [])

  const signOut = async () => {
    setUser(null); setProfile(null)
    try { if (!IS_DEMO_MODE) await getBrowserClient()?.auth.signOut() } catch { /* ignore */ }
    // Redirection immédiate + rechargement complet (déclenche aussi le middleware).
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  const role = profile?.role ?? (user?.user_metadata as any)?.role ?? null

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, isDemo: IS_DEMO_MODE, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
