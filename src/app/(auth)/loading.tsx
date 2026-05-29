import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Streaming skeleton for /login and /register.
 * Matches the centered card layout of auth screens so there's no jump on hydrate.
 */
export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-2/3 mx-auto" rounded="rounded-lg" />
        <Skeleton className="h-4 w-3/4 mx-auto" rounded="rounded" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-12 w-full" rounded="rounded-xl" />
          <Skeleton className="h-12 w-full" rounded="rounded-xl" />
          <Skeleton className="h-12 w-full" rounded="rounded-xl" />
          <Skeleton className="h-12 w-full mt-4" rounded="rounded-xl" />
        </div>
      </div>
    </div>
  )
}
