'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase-browser'
import toast from 'react-hot-toast'

export function useSignIn() {
  const router = useRouter()

  return useCallback(async (email: string, password: string) => {
    const client = getBrowserClient()
    if (!client) return false
    const { error } = await client.auth.signInWithPassword({ email, password })
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
    await getBrowserClient()?.auth.signOut()
    router.push('/')
    router.refresh()
    toast.success('À bientôt !')
  }, [router])
}
