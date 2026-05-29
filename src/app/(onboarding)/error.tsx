'use client'
import { RouteError } from '@/components/ui/RouteError'

export default function OnboardingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      scope="votre parcours d'arrivée"
      homeHref="/"
      homeLabel="Accueil"
    />
  )
}
