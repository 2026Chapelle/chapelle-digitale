'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

// Demo user shown when Supabase is not configured
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@cier.org',
  user_metadata: { prenom: 'Jean', nom: 'Démo' },
} as unknown as User

interface AuthContextType {
  user: User | null
  loading: boolean
  isDemo: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  isDemo: false,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(IS_DEMO_MODE ? DEMO_USER : null)
  const [loading, setLoading] = useState(!IS_DEMO_MODE)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    const client = getBrowserClient()
    if (!client) { setLoading(false); return }

    // Hydrate immédiatement depuis la session existante (cookies)
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (IS_DEMO_MODE) { setUser(null); return }
    await getBrowserClient()?.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, isDemo: IS_DEMO_MODE, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
