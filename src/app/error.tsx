'use client'
import { RouteError } from '@/components/ui/RouteError'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-abyss flex items-center justify-center">
      <RouteError error={error} reset={reset} scope="cette page" />
    </div>
  )
}
