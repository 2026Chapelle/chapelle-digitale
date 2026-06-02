'use client'
import { useState, useEffect } from 'react'

/**
 * Branche un écran admin sur les données LIVE Supabase sans toucher à son UI.
 *
 * - Rend immédiatement le `fallback` (le mock existant) → aucun changement visuel
 *   ni de comportement en mode démo.
 * - Récupère ensuite /api/admin/data/<...> ; si des données réelles arrivent
 *   (Supabase configuré), elles remplacent le mock. Sinon le mock reste.
 *
 * Usage (1 ligne par page) :
 *   const stats = useAdminData(`/api/admin/data/dashboard?range=${range}`, () => getDashboardStats(range))
 */
export function useAdminData<T>(url: string, fallback: T | (() => T)): T {
  const [data, setData] = useState<T>(() =>
    typeof fallback === 'function' ? (fallback as () => T)() : fallback,
  )

  useEffect(() => {
    let active = true
    fetch(url, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json && json.ok && !json.demo && json.data != null) {
          setData(json.data as T)
        }
      })
      .catch(() => { /* garde le fallback */ })
    return () => { active = false }
  }, [url])

  return data
}
