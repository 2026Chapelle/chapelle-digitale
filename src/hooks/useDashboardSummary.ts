'use client'
/**
 * Hook client du tableau de bord membre.
 *
 * Récupère la synthèse via GET /api/dashboard/summary (react-query).
 * Le repli démo / les vraies données sont gérés CÔTÉ SERVEUR par la route :
 * le composant qui consomme ce hook n'a donc rien à changer le jour où
 * Supabase est activé — il bascule automatiquement sur les vraies données.
 *
 * Usage (à brancher plus tard dans member/dashboard) :
 *   const { summary, isLoading, isDemo } = useDashboardSummary()
 */
import { useQuery } from '@tanstack/react-query'
import type { DashboardSummary } from '@/types/dashboard'

interface SummaryResponse {
  ok: boolean
  demo: boolean
  data: DashboardSummary
  error?: string
}

async function fetchSummary(): Promise<SummaryResponse> {
  const res = await fetch('/api/dashboard/summary', { cache: 'no-store' })
  if (!res.ok) throw new Error('Erreur de chargement de la synthèse du dashboard')
  return res.json()
}

export function useDashboardSummary() {
  const query = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchSummary,
    staleTime: 30_000,
  })

  return {
    /** Données de synthèse (null tant que le chargement n'est pas terminé). */
    summary: query.data?.data ?? null,
    /** true si la route tourne encore en mode démo (Supabase non configuré). */
    isDemo: query.data?.demo ?? true,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
