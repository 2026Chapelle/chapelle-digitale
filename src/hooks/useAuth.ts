'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'
import toast from 'react-hot-toast'

/** Client d'auth : cookie-based en réel, fallback démo sinon. */
function authClient() {
  return getBrowserClient() ?? supabase
}

export function useSignIn() {
  const router = useRouter()

  return useCallback(async (email: string, password: string) => {
    const { error } = await authClient().auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); return false }
    toast.success('Bienvenue ✨')
    router.push('/member/dashboard')
    router.refresh()
    return true
  }, [router])
}

export function useSignOut() {
  const router = useRouter()

  return useCallback(async () => {
    await authClient().auth.signOut()
    router.push('/')
    router.refresh()
    toast.success('À bientôt !')
  }, [router])
}
