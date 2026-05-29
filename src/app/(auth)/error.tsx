'use client'
import { RouteError } from '@/components/ui/RouteError'

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      scope="le formulaire de connexion"
      homeHref="/"
      homeLabel="Accueil"
    />
  )
}
