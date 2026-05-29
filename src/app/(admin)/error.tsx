'use client'
import { RouteError } from '@/components/ui/RouteError'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      scope="le panneau d'administration"
      homeHref="/admin/dashboard"
      homeLabel="Tableau de bord"
    />
  )
}
