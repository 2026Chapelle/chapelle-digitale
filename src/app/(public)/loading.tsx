import { Skeleton, PageHeaderSkeleton, CardSkeleton } from '@/components/ui/Skeleton'

/**
 * Streaming skeleton for any /public route segment.
 * Renders inside the public Navbar + Footer shell so the chrome stays visible
 * while the next page hydrates — no blank flash between navigations.
 */
export default function PublicLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} className="h-44" />
          ))}
        </div>
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-32 lg:col-span-2" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}
