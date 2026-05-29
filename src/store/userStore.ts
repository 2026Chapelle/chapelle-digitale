import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface UserStore {
  profile: User | null
  setProfile: (profile: User | null) => void
  updateScore: (score: number) => void
  clearProfile: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateScore: (score) => set((state) => ({
        profile: state.profile ? { ...state.profile, score_engagement: score } : null,
      })),
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'cier-user-storage',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
